"use client";
import { useEffect, useRef, useState } from "react";

type Step = { tool: string; input: string; ok: boolean };
type Msg = { role: "user" | "assistant"; content: string; steps?: Step[] };

const SOURCE: Record<string, string> = { query_network_logs: "Network logs", search_regulatory_documents: "Regulations" };
const SUGGESTIONS = [
  "We had an alarm at SITE-PHC-0054. What happened, and is there a mandatory reporting timeline?",
  "Summarize the most severe alarms from the last 24 hours",
  "What does the NDPA say about breach notification deadlines?",
];

export default function Home() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMsgs([...next, { role: "assistant", content: d.reply, steps: d.steps }]);
    } catch (e: any) {
      setMsgs([...next, { role: "assistant", content: `Request failed: ${e.message}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app">
      <header>
        <h1>Network & Compliance Assistant</h1>
        <p>Ask about your network logs and check them against your regulatory documents.</p>
      </header>

      <div className="feed">
        {msgs.length === 0 && (
          <div className="chips">
            <p>Try asking</p>
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.content
             .replace(/\*\*/g, "")
            .replace(/^\s*#+\s*/gm, "")
            .replace(/###\s*$/gm, "")}
            {!!m.steps?.length && (
              <details>
                <summary>Checked {[...new Set(m.steps.map((s) => SOURCE[s.tool]))].join(" and ")}</summary>
                {m.steps.map((s, j) => (
                  <code key={j}>{SOURCE[s.tool]}{s.ok ? "" : " (failed)"}: {s.input}</code>
                ))}
              </details>
            )}
          </div>
        ))}
        {busy && <div className="typing">Analyzing logs and documents…</div>}
        <div ref={end} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question" aria-label="Message" />
        <button className="send" disabled={busy || !input.trim()}>Send</button>
      </form>
    </main>
  );
}