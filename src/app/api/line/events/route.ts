/** อ่าน/ล้าง log ของ webhook event ที่เก็บไว้ใน memory (ใช้โดยหน้า /webhook) */
import { NextResponse } from "next/server";
import { clearEvents, readEvents } from "@/lib/event-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ events: readEvents() });
}

export async function DELETE() {
  clearEvents();
  return NextResponse.json({ ok: true });
}
