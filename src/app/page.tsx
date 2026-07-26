import Link from "next/link";
import { Card, Note } from "@/components/ui";

/**
 * หน้าแรก — ตอบคำถาม "LINE API ทำอะไรได้บ้าง"
 * เป็น server component ธรรมดา ไม่ได้เรียก LINE API
 */

const FAMILIES = [
  {
    name: "Messaging API",
    tagline: "บอทในแชท — รับข้อความ ตอบข้อความ",
    color: "#06C755",
    href: "/messaging",
    can: [
      "รับ webhook เมื่อผู้ใช้ทัก / กดปุ่ม / เพิ่มเพื่อน / ส่งรูป",
      "ตอบกลับ (reply) ฟรีไม่จำกัด ภายใน ~1 นาทีหลังผู้ใช้ทัก",
      "ส่งเอง (push / multicast / broadcast) — นับโควตา",
      "ข้อความหลายชนิด: text, sticker, image, video, location, template, flex ฯลฯ",
      "Rich Menu — เมนูรูปภาพติดล่างจอแชท",
      "ดึงโปรไฟล์ผู้ใช้, ดาวน์โหลดไฟล์ที่ผู้ใช้ส่งมา, ดูสถิติ (Insight API)",
      "Audience / Narrowcast — ส่งเจาะกลุ่มตามเพศ อายุ พื้นที่",
    ],
  },
  {
    name: "LINE Login",
    tagline: "ปุ่ม “เข้าสู่ระบบด้วย LINE” บนเว็บ/แอปของเรา",
    color: "#4B8BF5",
    href: "/login",
    can: [
      "ยืนยันตัวตนด้วยบัญชี LINE ผ่าน OAuth 2.0 / OpenID Connect",
      "ได้ userId, ชื่อ, รูปโปรไฟล์ (และอีเมล ถ้าขออนุมัติสิทธิ์แล้ว)",
      "ชวนผู้ใช้เพิ่มเพื่อนบอทไปพร้อมกับการล็อกอิน (bot_prompt)",
      "ใช้ต่อยอดเป็นระบบสมาชิกโดยไม่ต้องให้ผู้ใช้ตั้งรหัสผ่าน",
    ],
  },
  {
    name: "LIFF",
    tagline: "เว็บแอปที่เปิดอยู่ “ข้างใน” แอป LINE",
    color: "#8A63D2",
    href: "/liff",
    can: [
      "เปิดหน้าเว็บของเราในแอป LINE โดยรู้ทันทีว่าผู้ใช้คือใคร (ไม่ต้องกดล็อกอินซ้ำ)",
      "ส่งข้อความเข้าห้องแชทที่กำลังเปิดอยู่ (liff.sendMessages)",
      "เปิด Share Target Picker ให้ผู้ใช้เลือกส่งต่อให้เพื่อน",
      "สแกน QR code, เปิดลิงก์ภายนอก, ปิดหน้าต่างเอง",
      "เหมาะกับฟอร์ม / ตะกร้าสินค้า / หน้าจ่ายเงิน ที่ทำในกล่องแชทไม่ไหว",
    ],
  },
  {
    name: "อื่น ๆ ที่ควรรู้",
    tagline: "ตระกูลที่เหลือของ LINE Platform",
    color: "#6B7280",
    href: "/setup",
    can: [
      "LINE Notify — ปิดให้บริการแล้ว (31 มี.ค. 2025) ให้ใช้ Messaging API แทน",
      "LINE Pay — รับชำระเงิน (สมัครแยก ไม่ได้อยู่ใน LINE Developers)",
      "LINE MINI App — LIFF รูปแบบพิเศษที่ผ่านการรีวิว มีหน้าร้านใน LINE",
      "Social Plugins / Share — ปุ่มแชร์ไป LINE จากเว็บทั่วไป",
    ],
  },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold">LINE API ทำอะไรได้บ้าง</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          &ldquo;LINE API&rdquo; ไม่ใช่ API ตัวเดียว แต่เป็นกลุ่มของ API หลายตระกูลที่ทำหน้าที่ต่างกัน
          และตั้งค่าคนละที่ในคอนโซล ตัวที่ใช้บ่อยที่สุด 3 ตัวคือ Messaging API, LINE Login และ LIFF —
          โปรเจกต์นี้มีตัวอย่างที่รันได้จริงครบทั้งสามตัว
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {FAMILIES.map((family) => (
          <Card key={family.name}>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: family.color }} />
              <h2 className="font-semibold">{family.name}</h2>
            </div>
            <p className="mb-3 text-sm text-muted">{family.tagline}</p>
            <ul className="space-y-1.5 text-sm">
              {family.can.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-line">▸</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href={family.href}
              className="mt-4 inline-block text-sm font-medium text-line hover:underline"
            >
              ลองเล่นหน้านี้ →
            </Link>
          </Card>
        ))}
      </div>

      <Card title="สามตัวนี้ต่างกันยังไง">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-edge text-left text-muted">
                <th className="py-2 pr-4 font-medium"></th>
                <th className="py-2 pr-4 font-medium">Messaging API</th>
                <th className="py-2 pr-4 font-medium">LINE Login</th>
                <th className="py-2 font-medium">LIFF</th>
              </tr>
            </thead>
            <tbody className="[&_td]:border-b [&_td]:border-edge [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top">
              <tr>
                <td className="text-muted">ผู้ใช้เห็นอะไร</td>
                <td>ห้องแชทกับบอท</td>
                <td>ปุ่มล็อกอินบนเว็บเรา</td>
                <td>หน้าเว็บในแอป LINE</td>
              </tr>
              <tr>
                <td className="text-muted">ใครเริ่มก่อน</td>
                <td>LINE เรียกมาหาเรา (webhook)</td>
                <td>ผู้ใช้กดปุ่มบนเว็บเรา</td>
                <td>ผู้ใช้เปิด LIFF URL</td>
              </tr>
              <tr>
                <td className="text-muted">channel ที่ต้องสร้าง</td>
                <td>Messaging API</td>
                <td>LINE Login</td>
                <td>LINE Login (แล้วเพิ่ม LIFF app)</td>
              </tr>
              <tr>
                <td className="text-muted">กุญแจที่ใช้</td>
                <td>Channel access token + secret</td>
                <td>Channel ID + secret</td>
                <td>LIFF ID (เปิดเผยได้)</td>
              </tr>
              <tr>
                <td className="text-muted">ต้องมี HTTPS ไหม</td>
                <td>ต้อง (webhook)</td>
                <td>localhost ได้ตอน dev</td>
                <td>ต้อง (LINE เปิดผ่าน https)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Note>
        <strong>เริ่มยังไงดี:</strong> ไปที่หน้า{" "}
        <Link href="/setup" className="underline">
          ตั้งค่า
        </Link>{" "}
        เพื่อดูว่าต้องเติมค่าอะไรบ้างใน <code>.env.local</code> — คู่มือทีละขั้นอยู่ที่{" "}
        <code>docs/01-setup.md</code>
      </Note>
    </div>
  );
}
