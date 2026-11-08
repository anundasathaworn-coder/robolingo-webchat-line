"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, Conversation } from "@/lib/types";

const POLL_MS = 2500;

const fmt = (t: number) =>
  new Date(t).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

function Avatar({ c }: { c: Conversation }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (c.pictureUrl) return <img className="avatar" src={c.pictureUrl} alt="" />;
  return <div className="avatar">{c.displayName.charAt(0).toUpperCase()}</div>;
}

export default function Home() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  const loadConvs = useCallback(async () => {
    const r = await fetch("/api/conversations", { cache: "no-store" });
    const d = await r.json();
    setConvs(d.conversations);
    setMode(d.storeMode);
  }, []);

  const loadMsgs = useCallback(async (id: string) => {
    const r = await fetch(`/api/messages?userId=${encodeURIComponent(id)}`, { cache: "no-store" });
    const d = await r.json();
    setMessages(d.messages);
  }, []);

  useEffect(() => {
    loadConvs();
    const t = setInterval(() => {
      loadConvs();
      if (selected) loadMsgs(selected);
    }, POLL_MS);
    return () => clearInterval(t);
  }, [selected, loadConvs, loadMsgs]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const select = (id: string) => {
    setSelected(id);
    setMessages([]);
    setError("");
    loadMsgs(id);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !text.trim()) return;
    setSending(true);
    setError("");
    const r = await fetch("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selected, text }),
    });
    setSending(false);
    if (!r.ok) {
      setError((await r.json()).error ?? "ส่งไม่สำเร็จ");
      return;
    }
    setText("");
    loadMsgs(selected);
    loadConvs();
  };

  const current = convs.find((c) => c.userId === selected);

  return (
    <div className="app">
      <aside className={`sidebar ${selected ? "hide" : ""}`}>
        <h1>Robolingo Webchat · LINE OA</h1>
        {mode === "memory" && (
          <div className="warn">ยังไม่ได้ตั้งค่า Redis — ข้อมูลเก็บในหน่วยความจำชั่วคราว</div>
        )}
        <div className="list">
          {convs.length === 0 && (
            <div className="empty">ยังไม่มีผู้ใช้ส่งข้อความเข้ามา<br />ลองส่งข้อความไปที่ LINE OA</div>
          )}
          {convs.map((c) => (
            <div
              key={c.userId}
              className={`conv ${c.userId === selected ? "active" : ""}`}
              onClick={() => select(c.userId)}
            >
              <Avatar c={c} />
              <div className="meta">
                <div className="name">{c.displayName}</div>
                <div className="last">{c.lastMessage}</div>
              </div>
              {c.unread > 0 && c.userId !== selected && <span className="badge">{c.unread}</span>}
            </div>
          ))}
        </div>
      </aside>

      <main className={`chat ${selected ? "" : "hide"}`}>
        {!current ? (
          <div className="empty">เลือกผู้ใช้จากรายการด้านซ้ายเพื่อเริ่มตอบกลับ</div>
        ) : (
          <>
            <div className="chat-head">
              <button
                onClick={() => setSelected(null)}
                style={{ border: 0, background: "none", cursor: "pointer", fontSize: 16 }}
                aria-label="กลับ"
              >
                ←
              </button>
              <Avatar c={current} />
              {current.displayName}
            </div>
            <div className="messages">
              {messages.map((m) => (
                <div key={m.id} className={`bubble ${m.direction}`}>
                  {m.text}
                  <time>{fmt(m.timestamp)}</time>
                </div>
              ))}
              <div ref={bottom} />
            </div>
            {error && <div className="err">{error}</div>}
            <form className="composer" onSubmit={send}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`ตอบกลับ ${current.displayName}...`}
              />
              <button disabled={sending || !text.trim()}>ส่ง</button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
