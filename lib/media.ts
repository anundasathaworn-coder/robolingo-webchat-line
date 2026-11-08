// ฟังก์ชันเกี่ยวกับรูป/สติกเกอร์ที่ใช้ได้ทั้งฝั่ง server และ client (ห้าม import "crypto"/fetch LINE ที่นี่)

/** ชนิดไฟล์รูปที่ LINE Push API รับ (originalContentUrl) */
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"] as const;

/** LINE กำหนด previewImageUrl ≤ 1MB และเราใช้ URL เดียวกันทั้ง original/preview */
export const MAX_IMAGE_BYTES = 1024 * 1024;

/** รูปสติกเกอร์จาก CDN ของ LINE (ไม่ใช่ API ทางการ ใช้ได้กับสติกเกอร์ทั่วไป) */
export function stickerImageUrl(stickerId: string | undefined): string | null {
  if (!stickerId || !/^\d{1,20}$/.test(stickerId)) return null;
  return `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/android/sticker.png`;
}

/**
 * อนุญาตให้ /api/send ส่งรูปเฉพาะ URL ที่อัปโหลดผ่านระบบเราเอง (Vercel Blob)
 * กันไม่ให้ใครใช้ endpoint นี้สั่ง LINE ให้ดึงรูปจาก URL ใดก็ได้
 */
export function isAllowedImageUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}
