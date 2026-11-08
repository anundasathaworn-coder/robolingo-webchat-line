import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Robolingo Webchat",
  description: "Webchat สำหรับสนทนากับ LINE Official Account",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
