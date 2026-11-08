"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_IMAGE_BYTES, stickerImageUrl } from "@/lib/media";
import type { ChatMessage, Conversation } from "@/lib/types";

const POLL_MS = 2500;

const fmt = (t: number) =>
  new Date(t).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

function Avatar({ c }: { c: Conversation }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (c.pictureUrl) return <img className="avatar" src={c.pictureUrl} alt="" />;
  return <div className="avatar">{c.displayName.charAt(0).toUpperCase()}</div>;
}

/** ย่อรูปใหญ่ให้ ≤ 1MB (LINE จำกัด preview) ด้วย canvas ก่อนอัปโหลด; รูปเล็กอยู่แล้วส่งตามเดิม */
async function prepareImage(file: File): Promise<File> {
  if (file.size <= MAX_IMAGE_BYTES * 0.9) return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.8));
  if (!blob || blob.size > MAX_IMAGE_BYTES) throw new Error("รูปใหญ่เกินไป ลองใช้รูปที่เล็กลง");
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}

/** เนื้อหาของ bubble: ข้อความ / รูป / สติกเกอร์ (ถ้ารูปโหลดไม่ได้ เช่น หมดอายุที่ LINE จะแสดงป้ายกำกับแทน) */
function Content({ m }: { m: ChatMessage }) {
  const [failed, setFailed] = useState(false);
  const src = m.kind === "sticker" ? stickerImageUrl(m.stickerId) : m.kind === "image" ? m.imageUrl : null;
  if (!src || failed) return <>{m.text}</>;
  if (m.kind === "sticker") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="sticker" src={src} alt="สติกเกอร์" onError={() => setFailed(true)} />;
  }
  return (
    <a href={src} target="_blank" rel="noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="photo" src={src} alt="รูปภาพ" onError={() => setFailed(true)} />
    </a>
  );
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

  const fileInput = useRef<HTMLInputElement>(null);

  const sendImage = async (file: File) => {
    if (!selected) return;
    setSending(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", await prepareImage(file));
      const up = await fetch("/api/upload", { method: "POST", body });
      const upData = await up.json();
      if (!up.ok) throw new Error(upData.error ?? "อัปโหลดไม่สำเร็จ");
      const r = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selected, imageUrl: upData.url }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "ส่งไม่สำเร็จ");
      loadMsgs(selected);
      loadConvs();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
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
                <div key={m.id} className={`bubble ${m.direction}${m.kind === "sticker" ? " bare" : ""}`}>
                  <Content m={m} />
                  <time>{fmt(m.timestamp)}</time>
                </div>
              ))}
              <div ref={bottom} />
            </div>
            {error && <div className="err">{error}</div>}
            <form className="composer" onSubmit={send}>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png"
                hidden
                data-testid="image-input"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) sendImage(f);
                }}
              />
              <button
                type="button"
                className="attach"
                aria-label="แนบรูปภาพ"
                disabled={sending}
                onClick={() => fileInput.current?.click()}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
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
