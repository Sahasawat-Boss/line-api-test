import { env, envStatus } from "@/lib/env";
import { Badge, Card, Code, Note, Pre } from "@/components/ui";

export const dynamic = "force-dynamic";

/** หน้าเช็กว่าตั้งค่า .env.local ครบหรือยัง — เปิดดูได้แม้ยังไม่ได้ตั้งอะไรเลย */
export default function SetupPage() {
  const groups = envStatus();
  const webhookUrl = `${env.appBaseUrl}/api/line/webhook`;
  const callbackUrl = `${env.appBaseUrl}/api/auth/line/callback`;
  const liffUrl = `${env.appBaseUrl}/liff`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ตั้งค่า</h1>
        <p className="mt-2 text-sm text-muted">
          เติมค่าลงในไฟล์ <Code>.env.local</Code> แล้วรีสตาร์ท <Code>npm run dev</Code> ทุกครั้ง —
          Next.js อ่าน env ตอนบูตเท่านั้น
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => (
          <Card
            key={group.title}
            title={group.title}
            subtitle={`ใช้กับ: ${group.enables}`}
            action={<Badge ok={group.ready}>{group.ready ? "พร้อม" : "ยังไม่ครบ"}</Badge>}
          >
            <ul className="space-y-1.5 text-sm">
              {group.items.map((item) => (
                <li key={item.name} className="flex items-center justify-between gap-2">
                  <Code>{item.name}</Code>
                  <Badge ok={item.ok}>{item.ok ? "มีค่าแล้ว" : "ว่าง"}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card
        title="ค่าที่ต้องเอาไปกรอกใน LINE Developers Console"
        subtitle="คำนวณจาก APP_BASE_URL ที่ตั้งไว้ — ถ้ายังเป็น localhost ให้เปลี่ยนเป็น URL ของ ngrok ก่อนใช้งานจริง"
      >
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted">Messaging API &gt; Webhook URL</dt>
            <dd className="mt-1">
              <Code>{webhookUrl}</Code>
            </dd>
          </div>
          <div>
            <dt className="text-muted">LINE Login &gt; Callback URL</dt>
            <dd className="mt-1">
              <Code>{callbackUrl}</Code>
            </dd>
          </div>
          <div>
            <dt className="text-muted">LIFF &gt; Endpoint URL</dt>
            <dd className="mt-1">
              <Code>{liffUrl}</Code>
            </dd>
          </div>
        </dl>
      </Card>

      <Card
        title="ทำไมต้องใช้ ngrok"
        subtitle="LINE ยิง webhook มาจากอินเทอร์เน็ต จึงเข้าถึง localhost ของเราไม่ได้"
      >
        <p className="mb-3 text-sm">
          ngrok เปิดอุโมงค์จาก URL สาธารณะแบบ HTTPS มายังพอร์ต 3000 บนเครื่องเรา
          รันคำสั่งนี้ในหน้าต่างเทอร์มินัลอีกอันคู่กับ <Code>npm run dev</Code>:
        </p>
        <Pre>{`ngrok http 3000

# จะได้ URL หน้าตาแบบนี้
#   https://1a2b-xxx-xxx.ngrok-free.app
# เอาไปใส่ใน .env.local:
#   APP_BASE_URL=https://1a2b-xxx-xxx.ngrok-free.app
# แล้วเอา  {URL}/api/line/webhook  ไปใส่ในคอนโซล LINE`}</Pre>
        <Note tone="warn">
          ngrok แบบฟรีจะเปลี่ยน URL ทุกครั้งที่รันใหม่ — ต้องแก้ทั้ง <Code>.env.local</Code>{" "}
          และค่าในคอนโซล LINE ใหม่ทุกครั้ง
        </Note>
      </Card>

      <Card title="ค่าปัจจุบันที่แอปอ่านได้">
        <Pre>{JSON.stringify(
          {
            APP_BASE_URL: env.appBaseUrl,
            LINE_CHANNEL_ACCESS_TOKEN: mask(env.channelAccessToken),
            LINE_CHANNEL_SECRET: mask(env.channelSecret),
            LINE_LOGIN_CHANNEL_ID: env.loginChannelId || "(ว่าง)",
            LINE_LOGIN_CHANNEL_SECRET: mask(env.loginChannelSecret),
            NEXT_PUBLIC_LIFF_ID: env.liffId || "(ว่าง)",
            SESSION_SECRET: mask(env.sessionSecret),
          },
          null,
          2,
        )}</Pre>
      </Card>
    </div>
  );
}

/** ปิดบังค่าลับ เหลือให้เห็นแค่ 4 ตัวท้ายพอเช็กว่าใส่ถูกตัว */
function mask(value: string): string {
  if (!value) return "(ว่าง)";
  if (value.length <= 8) return "****";
  return `****${value.slice(-4)} (ยาว ${value.length} ตัวอักษร)`;
}
