import { NextRequest, NextResponse } from "next/server";
import type OpenAI from "openai";
import { openai, toolDefs, runTool, SYSTEM_PROMPT } from "@/lib/tools";

// export const runtime = "nodejs";
export const maxDuration = 60;

type Step = { tool: string; input: string; ok: boolean };

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const convo: OpenAI.Chat.ChatCompletionMessageParam[] = [{ role: "system", content: SYSTEM_PROMPT }, ...messages];
    const steps: Step[] = [];

    // Up to 7 reasoning/tool turns, same as the Python agent
    for (let turn = 0; turn < 7; turn++) {
      const res = await openai.chat.completions.create({ model: "gpt-4o", messages: convo, tools: toolDefs, tool_choice: "auto" });
      const msg = res.choices[0].message;
      convo.push(msg);

      if (!msg.tool_calls?.length) return NextResponse.json({ reply: msg.content, steps });

      for (const call of msg.tool_calls) {
        if (call.type !== "function") continue;
        const args = JSON.parse(call.function.arguments || "{}");
        const out = await runTool(call.function.name, args);
        steps.push({
          tool: call.function.name,
          input: args.sql_query ?? args.query ?? "",
          ok: !/^(Error|ClickHouse Execution Error|Pinecone Document Search Error)/.test(out),
        });
        convo.push({ role: "tool", tool_call_id: call.id, content: out });
      }
    }
    return NextResponse.json({ reply: "Agent reached maximum step limit without concluding.", steps });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}