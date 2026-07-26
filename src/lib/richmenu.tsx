/**
 * นิยามของ Rich Menu + ตัวสร้างรูปภาพ
 *
 * แยกออกมาเป็นไฟล์ .tsx เพราะต้องใช้ JSX ในการวาดรูป
 * (route handler เป็น .ts ธรรมดา)
 */
import { ImageResponse } from "next/og";
import type { messagingApi } from "@line/bot-sdk";

/**
 * ขนาดรูปที่ LINE ยอมรับ (px) — ต้องตรงเป๊ะ ไม่งั้นอัปโหลดไม่ผ่าน:
 *   เต็ม:    2500x1686, 1200x810, 800x540
 *   ครึ่ง:   2500x843,  1200x405, 800x270
 * ไฟล์ JPEG/PNG ขนาดไม่เกิน 1 MB
 */
export const MENU_WIDTH = 2500;
export const MENU_HEIGHT = 843;
const COLS = 3;
const CELL_WIDTH = Math.floor(MENU_WIDTH / COLS);

/** 3 ช่อง — ตั้งใจให้ action คนละชนิดกัน จะได้เห็นความต่าง */
const CELLS = [
  {
    title: "HELP",
    subtitle: "show all commands",
    color: "#06C755",
    // message action = กดแล้ว "ส่งข้อความแทนผู้ใช้" บอทจะได้ message event ตามปกติ
    action: { type: "message" as const, label: "help", text: "help" },
  },
  {
    title: "FLEX",
    subtitle: "sample flex message",
    color: "#00964B",
    action: { type: "message" as const, label: "flex", text: "flex" },
  },
  {
    title: "DOCS",
    subtitle: "open LINE developers",
    color: "#232629",
    // uri action = เปิดลิงก์ (ถ้าใส่ LIFF URL จะเปิดเว็บของเราในแอป LINE)
    action: { type: "uri" as const, label: "docs", uri: "https://developers.line.biz/en/docs/" },
  },
];

/**
 * โครงของ rich menu ที่จะส่งไป POST /v2/bot/richmenu
 * areas = สี่เหลี่ยมที่กดได้ พิกัดอ้างอิงกับ size ด้านบน (ไม่ใช่ px จริงบนจอ)
 */
export const richMenuRequest: messagingApi.RichMenuRequest = {
  size: { width: MENU_WIDTH, height: MENU_HEIGHT },
  selected: true, // เปิดเมนูค้างไว้ตอนผู้ใช้เข้าห้องแชทครั้งแรก
  name: "Learning Rich Menu", // ชื่อภายใน ผู้ใช้มองไม่เห็น
  chatBarText: "เปิดเมนู", // ข้อความบนแถบล่าง สูงสุด 14 ตัวอักษร
  areas: CELLS.map((cell, i) => ({
    bounds: { x: i * CELL_WIDTH, y: 0, width: CELL_WIDTH, height: MENU_HEIGHT },
    action: cell.action,
  })),
};

/**
 * วาดรูป rich menu เป็น PNG
 *
 * ใช้ ImageResponse ที่ Next.js มีมาให้ (Satori อยู่เบื้องหลัง) — รับ JSX คืน PNG
 * ⚠️ ฟอนต์ default ไม่รองรับภาษาไทย จึงใช้ตัวอักษรอังกฤษบนรูป
 *    ถ้าอยากได้ไทย ต้องโหลดไฟล์ .ttf ไทยแล้วส่งเข้า option `fonts`
 */
export async function renderRichMenuImage(): Promise<Blob> {
  const image = new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        {CELLS.map((cell) => (
          <div
            key={cell.title}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: `${100 / COLS}%`,
              height: "100%",
              background: cell.color,
              color: "#ffffff",
              borderRight: "4px solid rgba(255,255,255,0.25)",
            }}
          >
            <div style={{ fontSize: 120, fontWeight: 700, letterSpacing: 4 }}>{cell.title}</div>
            <div style={{ fontSize: 44, opacity: 0.85, marginTop: 24 }}>{cell.subtitle}</div>
          </div>
        ))}
      </div>
    ),
    { width: MENU_WIDTH, height: MENU_HEIGHT },
  );

  const bytes = await image.arrayBuffer();
  return new Blob([bytes], { type: "image/png" });
}
