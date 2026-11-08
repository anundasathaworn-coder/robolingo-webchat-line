# Robolingo Webchat ↔ LINE OA

เว็บแชทที่ส่ง/รับข้อความกับ LINE Official Account ด้วย Next.js (App Router) + TypeScript

## ฟีเจอร์
- รับข้อความจาก LINE OA ผ่าน Webhook (`/api/line/webhook`, ตรวจ `x-line-signature`)
- ส่งข้อความจากเว็บไป LINE OA ผ่าน Push API (`/api/send`)
- แสดงรายชื่อผู้ใช้ (ชื่อ + รูปโปรไฟล์จาก LINE) เลือกผู้ใช้เพื่อตอบกลับได้
- อัปเดตแบบ polling ทุก 2.5 วินาที

## ตั้งค่า
1. LINE Developers Console → Messaging API: คัดลอก **Channel secret** และ **Channel access token (long-lived)**
2. คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่า
3. เพิ่ม Upstash Redis (Vercel → Storage / Marketplace) เพื่อเก็บข้อความถาวร (ไม่ใส่ก็รันได้ แต่เก็บใน memory)
4. ตั้ง Webhook URL ใน LINE: `https://<โดเมน-vercel>/api/line/webhook` แล้วเปิด *Use webhook*
   และปิด Auto-reply / Greeting messages ใน LINE Official Account Manager

## รัน local
```bash
npm install
npm run dev
```
(ทดสอบ webhook local ใช้ ngrok/cloudflared)

## Deploy บน Vercel
Import GitHub repo → ใส่ Environment Variables ตาม `.env.example` → Deploy

## รูปภาพและสติกเกอร์
- **รับจากลูกค้า:** แสดงรูปและสติกเกอร์ในแชท รูปดึงผ่าน `/api/media/<id>` (proxy ไป LINE Content API ด้วย access token ฝั่ง server) — LINE เก็บไฟล์ไว้ชั่วคราว รูปที่หมดอายุจะแสดงเป็นป้าย `[รูปภาพ]` แทน
- **ส่งจากเว็บ:** ปุ่มแนบรูป (JPEG/PNG ≤ 1MB, รูปใหญ่ย่อให้อัตโนมัติ) อัปโหลดไป **Vercel Blob** ผ่าน `/api/upload` แล้ว push เป็น image message ต้องตั้ง `BLOB_READ_WRITE_TOKEN` (Vercel → Storage → Create → Blob แบบ public) ถ้าไม่ตั้ง ปุ่มแนบรูปจะแจ้งว่าส่งรูปไม่ได้ ส่วนการรับรูป/สติกเกอร์ไม่ต้องใช้
- `/api/send` ยอมรับ `imageUrl` เฉพาะ URL ของ Blob ที่อัปโหลดผ่านระบบ (กันสั่งให้ LINE ดึงรูปจากที่อื่น)
