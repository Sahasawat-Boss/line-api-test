import Link from "next/link";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { getSession } from "@/lib/session";
import { Card, Code, Note, Pre } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // getSession() ต้องใช้ SESSION_SECRET — ถ้ายังไม่ได้ตั้ง ก็ถือว่ายังไม่ล็อกอิน
  const session = env.sessionSecret ? await getSession() : null;
  if (session) redirect("/profile");

  const configured = Boolean(env.loginChannelId && env.loginChannelSecret);
  const callbackUrl = `${env.appBaseUrl}/api/auth/line/callback`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">LINE Login</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          ให้ผู้ใช้ล็อกอินเข้าเว็บของเราด้วยบัญชี LINE โดยไม่ต้องตั้งรหัสผ่านใหม่
          เบื้องหลังคือ OAuth 2.0 Authorization Code Flow + OpenID Connect มาตรฐาน
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      <Card title="ลองล็อกอิน">
        {configured ? (
          <>
            <a
              href="/api/auth/line/login"
              className="inline-flex items-center gap-2 rounded-lg bg-line px-5 py-2.5 font-medium text-white hover:brightness-95"
            >
              <span className="grid h-5 w-5 place-items-center rounded bg-white text-xs font-bold text-line">
                L
              </span>
              เข้าสู่ระบบด้วย LINE
            </a>
            <p className="mt-3 text-xs text-muted">
              ปุ่มนี้พาไปที่ <Code>/api/auth/line/login</Code> ซึ่งจะ redirect ต่อไปยัง
              access.line.me
            </p>
          </>
        ) : (
          <Note tone="warn">
            ยังไม่ได้ตั้ง <Code>LINE_LOGIN_CHANNEL_ID</Code> และ{" "}
            <Code>LINE_LOGIN_CHANNEL_SECRET</Code> ใน <Code>.env.local</Code> —{" "}
            <Link href="/setup" className="underline">
              ดูวิธีตั้งค่า
            </Link>
          </Note>
        )}
      </Card>

      <Card title="ขั้นตอนทั้งหมด (Authorization Code Flow)">
        <Pre>{`[1] ผู้ใช้กดปุ่มบนเว็บเรา
     GET /api/auth/line/login
     └─ สุ่ม state + nonce เก็บใส่ cookie ชั่วคราว
     └─ 302 ไปที่:
        https://access.line.me/oauth2/v2.1/authorize
          ?response_type=code
          &client_id={LINE_LOGIN_CHANNEL_ID}
          &redirect_uri=${callbackUrl}
          &state={state}
          &nonce={nonce}
          &scope=openid%20profile

[2] ผู้ใช้กด "อนุญาต" ที่หน้าของ LINE

[3] LINE redirect กลับมา
     GET ${callbackUrl}?code=xxx&state=yyy
     └─ เช็คว่า state ตรงกับที่เก็บไว้ (กัน CSRF)

[4] ฝั่ง server แลก code เป็น token   ← ต้องทำที่ server เพราะใช้ channel secret
     POST https://api.line.me/oauth2/v2.1/token
       grant_type=authorization_code
       &code=xxx
       &redirect_uri=${callbackUrl}
       &client_id={CHANNEL_ID}
       &client_secret={CHANNEL_SECRET}

     ได้กลับมา:
       { access_token, refresh_token, id_token, expires_in, scope }

[5] ตรวจ + ถอด id_token (JWT เซ็นด้วย HS256 โดยใช้ channel secret)
     ตรวจ: signature / iss / aud / exp / nonce
     ได้:   sub = userId, name, picture, email

[6] ออก session cookie ของ "แอปเรา" เอง แล้ว redirect ไป /profile`}</Pre>
      </Card>

      <Card title="access_token กับ id_token ต่างกันยังไง">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-edge text-left text-muted">
                <th className="py-2 pr-4 font-medium"></th>
                <th className="py-2 pr-4 font-medium">access_token</th>
                <th className="py-2 font-medium">id_token</th>
              </tr>
            </thead>
            <tbody className="[&_td]:border-b [&_td]:border-edge [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top">
              <tr>
                <td className="text-muted">คืออะไร</td>
                <td>บัตรผ่านสำหรับเรียก API</td>
                <td>บัตรประชาชนบอกว่าใครล็อกอิน</td>
              </tr>
              <tr>
                <td className="text-muted">รูปแบบ</td>
                <td>string ทึบ อ่านไม่ออก</td>
                <td>JWT — ถอดอ่านได้</td>
              </tr>
              <tr>
                <td className="text-muted">เอาไปทำอะไร</td>
                <td>
                  เรียก <Code>GET /v2/profile</Code>
                </td>
                <td>อ่าน userId/ชื่อ/อีเมล โดยไม่ต้องเรียก API เพิ่ม</td>
              </tr>
              <tr>
                <td className="text-muted">ต้องตรวจอะไร</td>
                <td>ส่งไปแล้ว LINE ตรวจให้</td>
                <td className="text-red-500">
                  ต้องตรวจ signature เองทุกครั้ง ห้ามเชื่อ payload ดิบ ๆ
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Note>
        อย่าลืมใส่ <Code>{callbackUrl}</Code> ในช่อง Callback URL ของ LINE Login channel
        ในคอนโซล — ต้องตรงทุกตัวอักษร ไม่งั้นจะขึ้น error 400 &ldquo;redirect_uri&rdquo;
      </Note>
    </div>
  );
}
