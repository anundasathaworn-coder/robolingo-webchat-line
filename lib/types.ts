export interface Conversation {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  lastMessage: string;
  lastTimestamp: number;
  unread: number;
}

export type MessageKind = "text" | "image" | "sticker";

export interface ChatMessage {
  id: string;
  userId: string;
  direction: "in" | "out";
  /** ข้อความ หรือป้ายกำกับ ("[รูปภาพ]" / "[สติกเกอร์]") ใช้แสดงในรายชื่อและเป็น fallback */
  text: string;
  timestamp: number;
  /** ไม่มี = ข้อความ text (ข้อมูลเก่าที่บันทึกไว้ก่อนมีฟีเจอร์รูป) */
  kind?: MessageKind;
  stickerId?: string;
  /** รูปภาพ: "/api/media/<id>" (รูปจากลูกค้า), URL ของ Blob (รูปที่เราส่ง) หรือ URL ภายนอก */
  imageUrl?: string;
}
