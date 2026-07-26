/**
 * Rich Menu — เมนูรูปภาพที่ปักอยู่ด้านล่างหน้าจอแชท
 *
 * ต้องครบ 3 ขั้น เมนูถึงจะโผล่:
 *   1. POST /v2/bot/richmenu                → สร้าง "โครง" (ขนาด + พื้นที่กด + action)
 *   2. POST /v2/bot/richmenu/{id}/content   → อัปโหลด "รูป" (ขนาดต้องตรงกับที่ประกาศไว้)
 *   3. POST /v2/bot/user/all/richmenu/{id}  → ตั้งเป็นเมนูเริ่มต้นของผู้ใช้ทุกคน
 *      (หรือผูกรายคนด้วย POST /v2/bot/user/{userId}/richmenu/{id})
 *
 * โครงเมนูและรูปอยู่ที่ src/lib/richmenu.tsx
 */
import { NextResponse } from "next/server";
import { describeLineError, lineBlobClient, lineClient } from "@/lib/line";
import { renderRichMenuImage, richMenuRequest } from "@/lib/richmenu";

export const runtime = "nodejs";

/** GET — ดูรายการ rich menu ทั้งหมดของ channel นี้ */
export async function GET() {
  try {
    const { richmenus } = await lineClient().getRichMenuList();
    return NextResponse.json({ ok: true, count: richmenus.length, richmenus });
  } catch (error) {
    return NextResponse.json({ ok: false, error: describeLineError(error) }, { status: 500 });
  }
}

/** POST — สร้าง + อัปโหลดรูป + ตั้งเป็น default ในครั้งเดียว */
export async function POST() {
  try {
    const client = lineClient();

    // ขั้นที่ 1
    const { richMenuId } = await client.createRichMenu(richMenuRequest);

    // ขั้นที่ 2 — ต้องใช้ blob client เพราะยิงไปคนละโดเมน (api-data.line.me)
    await lineBlobClient().setRichMenuImage(richMenuId, await renderRichMenuImage());

    // ขั้นที่ 3
    await client.setDefaultRichMenu(richMenuId);

    return NextResponse.json({
      ok: true,
      richMenuId,
      note: "สร้างสำเร็จ — ปิดแล้วเปิดห้องแชทใหม่ในแอป LINE เมนูจะโผล่ด้านล่าง",
      request: richMenuRequest,
    });
  } catch (error) {
    console.error("[richmenu]", error);
    return NextResponse.json({ ok: false, error: describeLineError(error) }, { status: 500 });
  }
}

/** DELETE — ยกเลิก default แล้วลบ rich menu ทุกตัวทิ้ง */
export async function DELETE() {
  try {
    const client = lineClient();

    // ต้องยกเลิก default ก่อน ไม่งั้นลบตัวที่กำลังถูกใช้อยู่ไม่ได้
    try {
      await client.cancelDefaultRichMenu();
    } catch {
      // ไม่มี default อยู่แล้ว — ข้ามได้
    }

    const { richmenus } = await client.getRichMenuList();
    await Promise.all(richmenus.map((menu) => client.deleteRichMenu(menu.richMenuId)));

    return NextResponse.json({ ok: true, deleted: richmenus.length });
  } catch (error) {
    return NextResponse.json({ ok: false, error: describeLineError(error) }, { status: 500 });
  }
}
