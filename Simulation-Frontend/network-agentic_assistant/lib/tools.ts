import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { createClient } from "@clickhouse/client";

// --- 1. Clients (keys come from .env.local) ---
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ch = createClient({
  url: process.env.CLICKHOUSE_URL,
  username: process.env.CLICKHOUSE_USER ?? "default",
  password: process.env.CLICKHOUSE_PASSWORD,
});

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pinecone.index({
  name: process.env.PINECONE_INDEX ?? "quickstart",
  namespace: process.env.PINECONE_NAMESPACE ?? "compliance-namespace",
});

// --- 2. Tools ---
async function queryNetworkLogs({ sql_query }: { sql_query: string }): Promise<string> {
  try {
    const q = sql_query.trim().replace(/;+\s*$/, "");
    const upper = q.toUpperCase();
    if (!upper.startsWith("SELECT")) return "Error: Only SELECT queries are permitted.";
    if (upper.includes("FORMAT"))
      return "Error: Do not include clauses like 'FORMAT JSON' in your SQL query. The result format is handled automatically.";
    if (q.includes(";")) return "Error: Only a single statement is allowed.";

    const rs = await ch.query({
      query: q,
      format: "JSONCompact",
      // readonly=2 blocks writes but still lets us apply the limits below
      clickhouse_settings: { readonly: "2", max_result_rows: "200", result_overflow_mode: "break", max_execution_time: 30 },
    });
    const { meta, data } = (await rs.json()) as { meta: { name: string }[]; data: unknown[][] };

    if (!data.length)
      return "Query executed successfully, but returned 0 rows. Use ILIKE for flexible string matching (e.g., event_type ILIKE '%security%').";

    return JSON.stringify({ columns: meta.map((m) => m.name), rows: data }).slice(0, 12000);
  } catch (e: any) {
    return `ClickHouse Execution Error: ${e.message}. Please check your table name, column names, or SQL syntax and try a corrected SELECT query.`;
  }
}

async function searchRegulatoryDocuments({ query }: { query: string }): Promise<string> {
  try {
    // Integrated embedding: Pinecone embeds the query text itself.
    const res = await index.documents.search({
      scoreBy: [{ type: "embed", field: "chunk_text", query }],
      topK: 10,
      includeFields: ["chunk_text", "source_document"],
    });

    const chunks = (res.matches as any[]).flatMap((m) => {
      const f = m.fields ?? m;
      if (!f.chunk_text) return [];
      const source = f.source_document || "Nigeria_Data_Protection_Act_2023.pdf";
      return [`[Document Excerpt Source: ${source}]\n${f.chunk_text}`];
    });

    return chunks.length ? chunks.join("\n\n---\n\n") : "No relevant regulatory sections found for this query.";
  } catch (e: any) {
    return `Pinecone Document Search Error: ${e.message}`;
  }
}

const available: Record<string, (args: any) => Promise<string>> = {
  query_network_logs: queryNetworkLogs,
  search_regulatory_documents: searchRegulatoryDocuments,
};

export async function runTool(name: string, args: any): Promise<string> {
  const fn = available[name];
  return fn ? fn(args) : `Error: Tool ${name} not found.`;
}

// --- 3. Tool schemas for the LLM ---
export const toolDefs: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "query_network_logs",
      description:
        "Query network operational logs and metrics from ClickHouse. You MUST query the table named `network_logs_dataset`. " +
        "Available columns include: site_id, event_type, perceived_severity, timestamp, alarm_id, source, probable_cause and additional_text.",
      parameters: {
        type: "object",
        properties: {
          sql_query: { type: "string", description: "The SQL SELECT query to execute against the `network_logs_dataset` table." },
        },
        required: ["sql_query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_regulatory_documents",
      description:
        "Search the regulatory compliance vector database containing the Nigeria Data Protection Act 2023 (NDPA) and NCC telecommunications regulations. " +
        "Use this tool to verify statutory breach reporting timelines, data controller duties, and penalty clauses. " +
        "Write specific queries including terms like 'breach notification', '72 hours', or 'Section 40'.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Search query describing the legal mandate or violation type." } },
        required: ["query"],
      },
    },
  },
];

export const SYSTEM_PROMPT = `You are an expert Network Operations and Compliance AI Assistant.
You have access to two tools: \`query_network_logs\` and \`search_regulatory_documents\`.

DATABASE SCHEMA for ClickHouse (\`network_logs_dataset\` table):
- alarm_id (String)
- timestamp (DateTime)
- site_id (String)
- source (String)
- event_type (String)
- probable_cause (String)
- perceived_severity (String)
- additional_text (String)
- metric_value (Float64)
- duration_seconds (Int32)

RULES FOR EXECUTION:
1. When investigating an incident, always query ClickHouse first using valid SQL.
2. If a SQL query fails with an error, DO NOT quit. Read the error, fix your SQL syntax or column names, and try again (up to 2 retries).
3. Once you successfully retrieve log data, immediately call \`search_regulatory_documents\` to find the relevant compliance rules (Nigeria Data Protection Act 2023).
4. Finally, synthesize both the technical log results and the legal regulations into a clear, professional incident report.
5. If the question is only about regulations, skip the log query and search the regulatory documents directly.`;