export interface Conversation {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  lastMessage: string;
  lastTimestamp: number;
  unread: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  direction: "in" | "out";
  text: string;
  timestamp: number;
}
