import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { ask, MAX_QUESTION_LENGTH, Source } from "./api";

type Message =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "assistant"; text: string; sources: Source[] }
  | { id: number; role: "error"; text: string; question: string };

const SUGGESTIONS = [
  "What is your return policy?",
  "How long does shipping take?",
  "How do I track my order?",
];

let nextId = 0;

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(raw: string, appendUser = true) {
    const question = raw.trim();
    if (!question || loading) return;

    if (appendUser) {
      setMessages((m) => [...m, { id: nextId++, role: "user", text: question }]);
    }
    setInput("");
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await ask(question, controller.signal);
      setMessages((m) => [
        ...m,
        { id: nextId++, role: "assistant", text: res.answer, sources: res.sources },
      ]);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setMessages((m) => [
        ...m,
        { id: nextId++, role: "error", text: (err as Error).message, question },
      ]);
    } finally {
      setLoading(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }

  function retry(msg: Extract<Message, { role: "error" }>) {
    setMessages((m) => m.filter((x) => x.id !== msg.id));
    void send(msg.question, false);
  }

  function newChat() {
    abortRef.current?.abort();
    setMessages([]);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  const tooLong = input.length > MAX_QUESTION_LENGTH;

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="logo" aria-hidden>
            C
          </span>
          <div>
            <h1>Clause Support</h1>
            <p>Answers grounded in Clause Shop help documents</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button className="ghost" onClick={newChat}>
            New chat
          </button>
        )}
      </header>

      <main className="chat" aria-live="polite">
        {messages.length === 0 && (
          <div className="empty">
            <h2>How can we help?</h2>
            <p>Ask anything about orders, shipping, returns or your account.</p>
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => void send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`row ${m.role}`}>
            <div className="bubble">
              <p className="text">{m.text}</p>
              {m.role === "assistant" && m.sources.length > 0 && <Sources sources={m.sources} />}
              {m.role === "error" && (
                <button className="link" onClick={() => retry(m)} disabled={loading}>
                  Try again
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="row assistant">
            <div className="bubble typing" aria-label="Assistant is thinking">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </main>

      <form className="composer" onSubmit={onSubmit}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask a question…"
          rows={1}
          autoFocus
          aria-label="Your question"
        />
        <button type="submit" disabled={loading || !input.trim() || tooLong}>
          Send
        </button>
        {input.length > MAX_QUESTION_LENGTH * 0.9 && (
          <span className={`counter ${tooLong ? "over" : ""}`}>
            {input.length}/{MAX_QUESTION_LENGTH}
          </span>
        )}
      </form>
    </div>
  );
}

function Sources({ sources: raw }: { sources: Source[] }) {
  // The API can return the same file/page more than once; keep the best score.
  const byKey = new Map<string, Source>();
  for (const s of raw) {
    const key = `${s.source}#${s.page ?? ""}`;
    const prev = byKey.get(key);
    if (!prev || (s.score ?? 0) > (prev.score ?? 0)) byKey.set(key, s);
  }
  const sources = [...byKey.values()];

  return (
    <details className="sources">
      <summary>
        {sources.length} source{sources.length === 1 ? "" : "s"}
      </summary>
      <ul>
        {sources.map((s, i) => (
          <li key={i}>
            <span className="file">{basename(s.source)}</span>
            {s.page != null && <span className="meta">p. {s.page}</span>}
            {s.score != null && <span className="meta">score {s.score.toFixed(2)}</span>}
          </li>
        ))}
      </ul>
    </details>
  );
}

function basename(path: string) {
  return path.split(/[\\/]/).pop() || path;
}
