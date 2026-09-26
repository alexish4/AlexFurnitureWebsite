"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import "./customer-chat.css";

type Message = { role: "user" | "assistant"; content: string };

export default function CustomerChat({ hidden = false }: { hidden?: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const pending = useRef(false);

  useEffect(() => { if (open && !hidden) input.current?.focus(); }, [open, hidden]);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [messages, busy, error, open]);

  function close() { setOpen(false); toggle.current?.focus(); }
  async function send(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || pending.current) return;
    pending.current = true;
    const next: Message[] = [...messages, { role: "user" as const, content }].slice(-9);
    setBusy(true); setError(""); setMessages(next); setDraft("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }), signal: AbortSignal.timeout(35000),
      });
      const data = await response.json();
      if (!response.ok || typeof data.reply !== "string") throw new Error(data.error || "Chat is unavailable. Please call a store.");
      setMessages([...next, { role: "assistant", content: data.reply }].slice(-10) as Message[]);
    } catch (caught) {
      setMessages(messages); setDraft(content);
      setError(caught instanceof Error && caught.name !== "TimeoutError" ? caught.message : "Chat timed out. Please try again or call us.");
    } finally { pending.current = false; setBusy(false); }
  }

  return <div className="afChat" hidden={hidden} onKeyDown={(event) => { if (event.key === "Escape") close(); }}>
    {open && <section className="afChatPanel" aria-label="Alex Furniture AI assistant">
      <header><div><strong>Ask Alex Furniture</strong><small>AI shopping assistant · not a live employee</small></div><button type="button" onClick={close} aria-label="Close chat">×</button></header>
      <p className="afChatNotice">Messages are sent to OpenAI to answer your questions. Do not share payment details or personal information. AI can make mistakes; confirm details with our team.</p>
      <div className="afChatLog" role="log" aria-live="polite" aria-relevant="additions text" ref={log}>
        <p className="afChatBubble">Hi! Ask about furniture in our catalog, local delivery, or our two store locations.</p>
        {messages.map((message, index) => <p key={index} className={`afChatBubble ${message.role === "user" ? "afChatUser" : ""}`}><span className="afChatSpeaker">{message.role === "user" ? "You" : "AI assistant"}</span>{message.content}</p>)}
        {busy && <p>Checking your question…</p>}
      </div>
      {error && <p className="afChatError" role="alert">{error}</p>}
      <form onSubmit={send}>
        <label htmlFor="af-chat-question">Your question</label>
        <div><input ref={input} id="af-chat-question" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1500} placeholder="Do you have recliners?" disabled={busy} autoComplete="off" /><button type="submit" disabled={busy || !draft.trim()}>{busy ? "Wait…" : "Send"}</button></div>
      </form>
      <footer><a href="tel:9093984068">Call Montclair</a><a href="tel:9512013378">Call Riverside</a><button type="button" disabled={busy} onClick={() => { setMessages([]); setError(""); setDraft(""); input.current?.focus(); }}>Clear chat</button></footer>
    </section>}
    <button className="afChatToggle" ref={toggle} type="button" aria-expanded={open} onClick={() => open ? close() : setOpen(true)}>{open ? "Close chat" : "Questions? Ask our AI"}</button>
  </div>;
}
