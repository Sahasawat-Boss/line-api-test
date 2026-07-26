import Link from "next/link";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { getSession } from "@/lib/session";
import { Card, Code, Note, Pre } from "@/components/ui";

export const dynamic = "force-dynamic";

/** หน้าที่ต้องล็อกอินก่อนถึงจะเข้าได้ — ตัวอย่างการใช้ session ที่สร้างจาก LINE Login */
export default async function ProfilePage() {
  const session = env.sessionSecret ? await getSession() : null;
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">โปรไฟล์</h1>

      <Card title="คุณล็อกอินแล้ว" subtitle="ข้อมูลนี้อ่านจาก session cookie ที่แอปเราออกให้">
        <div className="flex items-center gap-4">
          {session.pictureUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- รูปมาจาก CDN ของ LINE ไม่ได้ตั้งค่า next/image remotePatterns ไว้
            <img
              src={session.pictureUrl}
              alt=""
              className="h-16 w-16 rounded-full border border-edge object-cover"
            />
          )}
          <div className="min-w-0">
            <p className="font-semibold">{session.displayName}</p>
            <p className="truncate font-mono text-xs text-muted">{session.userId}</p>
            {session.email && <p className="text-sm text-muted">{session.email}</p>}
          </div>
        </div>

        <form action="/api/auth/logout" method="post" className="mt-5">
          <button className="rounded-lg border border-edge px-4 py-2 text-sm hover:bg-edge/40">
            ออกจากระบบ
          </button>
        </form>
      </Card>

      <Card title="ข้อมูลใน session">
        <Pre>{JSON.stringify(session, null, 2)}</Pre>
        <p className="mt-3 text-sm text-muted">
          เก็บอยู่ใน cookie ชื่อ <Code>line_session</Code> เป็น JWT ที่เซ็นด้วย{" "}
          <Code>SESSION_SECRET</Code> ตั้ง <Code>httpOnly</Code> ไว้ JavaScript ฝั่ง client
          จึงอ่านไม่ได้
        </p>
      </Card>

      <Card title="เอา userId นี้ไปทำอะไรต่อได้">
        <ul className="space-y-2 text-sm">
          <li className="flex gap-2">
            <span className="text-line">▸</span>
            <span>
              ใช้เป็น primary key ของผู้ใช้ในฐานข้อมูล — ค่านี้คงที่ตลอด ตราบใดที่ยังใช้ channel เดิม
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-line">▸</span>
            <span>
              ส่ง push message หาผู้ใช้คนนี้ — <strong>แต่ต้องผูก</strong> LINE Login channel เข้ากับ
              Messaging API channel ใน provider เดียวกันก่อน ไม่งั้น userId จะคนละชุด
              (ลองก๊อปไปวางที่หน้า{" "}
              <Link href="/playground" className="underline">
                ส่งข้อความ
              </Link>{" "}
              ดู)
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-line">▸</span>
            <span>ผูกกับบัญชีเดิมในระบบเรา (account linking) เพื่อให้ล็อกอินได้ทั้ง 2 ทาง</span>
          </li>
        </ul>
      </Card>

      <Note tone="warn">
        <strong>userId ไม่ใช่ค่าสากล</strong> — ผู้ใช้คนเดียวกันจะมี userId ต่างกันในแต่ละ provider
        ถ้า LINE Login channel กับ Messaging API channel อยู่คนละ provider จะเอา userId
        ข้ามไปใช้กันไม่ได้
      </Note>
    </div>
  );
}
