# 05 — Deploy ขึ้นจริง

เบื่อ ngrok ที่เปลี่ยน URL ทุกครั้งแล้วใช่ไหม — deploy ขึ้น Vercel ฟรี ได้โดเมนถาวร

---

## Deploy บน Vercel

### 1. เอาโค้ดขึ้น GitHub

```powershell
git init
git add .
git commit -m "LINE API learning project"
gh repo create line-api-test --private --source=. --push
```

> `.env.local` อยู่ใน `.gitignore` อยู่แล้ว — ค่าลับจะไม่ถูก push ขึ้นไป

### 2. Import เข้า Vercel

1. เปิด https://vercel.com/new
2. เลือก repo → **Import**
3. Framework จะถูกตรวจเป็น Next.js อัตโนมัติ ไม่ต้องแก้อะไร
4. ยัง **อย่ากด Deploy** — ไปตั้ง env ก่อน

### 3. ตั้ง Environment Variables

ในหน้า import (หรือ Project Settings → Environment Variables) ใส่ให้ครบ:

| Key | Value |
|---|---|
| `LINE_CHANNEL_ACCESS_TOKEN` | ค่าจากคอนโซล |
| `LINE_CHANNEL_SECRET` | ค่าจากคอนโซล |
| `LINE_LOGIN_CHANNEL_ID` | ค่าจากคอนโซล |
| `LINE_LOGIN_CHANNEL_SECRET` | ค่าจากคอนโซล |
| `NEXT_PUBLIC_LIFF_ID` | ค่าจากคอนโซล |
| `SESSION_SECRET` | ค่าสุ่มใหม่ (อย่าใช้ตัวเดียวกับตอน dev) |
| `APP_BASE_URL` | `https://ชื่อโปรเจกต์.vercel.app` |

> `APP_BASE_URL` ต้องรอให้ deploy รอบแรกเสร็จก่อนถึงจะรู้ค่า —
> deploy ก่อน แล้วค่อยกลับมาใส่ แล้ว **redeploy อีกครั้ง**

### 4. อัปเดต URL ในคอนโซล LINE

| ที่ | ค่าใหม่ |
|---|---|
| Messaging API → Webhook URL | `https://xxx.vercel.app/api/line/webhook` |
| LINE Login → Callback URL | `https://xxx.vercel.app/api/auth/line/callback` |
| LIFF → Endpoint URL | `https://xxx.vercel.app/liff` |

กด **Verify** ที่ Webhook URL อีกครั้ง ต้องขึ้น Success

---

## ⚠️ สิ่งที่ต้องแก้ก่อนใช้งานจริง

โปรเจกต์นี้เขียนเพื่อ **การเรียนรู้** มีของที่จงใจทำง่ายไว้และใช้กับ production ไม่ได้

### 1. Event log เก็บใน memory

`src/lib/event-log.ts` เก็บ event ไว้ในตัวแปรใน RAM

- หายทุกครั้งที่ restart
- บน Vercel ที่มีหลาย instance แต่ละ request อาจไปคนละ instance → log ไม่ครบ

**แก้เป็น:** Postgres / Redis / Vercel KV หรือถ้าแค่อยาก debug ก็ดู log ปกติพอ

### 2. ประมวลผลก่อนตอบ 200

ตอนนี้เรา `await handleEvent()` ให้เสร็จก่อนตอบ 200 — เข้าใจง่ายแต่เสี่ยง timeout

**แก้เป็น:** ตอบ 200 ทันที แล้วโยนงานเข้าคิว

```ts
// รูปแบบที่ควรใช้ใน production
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verify(rawBody, request.headers.get("x-line-signature"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  const { events } = JSON.parse(rawBody);
  await queue.enqueue(events);        // Vercel Queue / QStash / SQS / BullMQ
  return NextResponse.json({ ok: true });   // ตอบทันที
}
```

### 3. ไม่มี idempotency

ถ้า LINE retry ส่ง event เดิม (`deliveryContext.isRedelivery === true`) บอทจะทำงานซ้ำ

**แก้เป็น:** เก็บ `webhookEventId` ที่เคยประมวลผลแล้วไว้ใน Redis พร้อม TTL แล้วเช็คก่อนทำงาน

### 4. Session แบบง่าย

`src/lib/session.ts` เป็น JWT ตัวเดียวไม่มีทาง revoke ถ้ายังไม่หมดอายุ

**แก้เป็น:** [Auth.js (NextAuth)](https://authjs.dev/) ที่มี LINE provider ให้อยู่แล้ว
หรือเก็บ session ใน DB เพื่อให้เพิกถอนได้

### 5. ไม่มี rate limiting

Endpoint ทั้งหมดเปิดโล่ง โดยเฉพาะ `/api/line/send` และ `/api/line/richmenu`
ที่ยิงได้ไม่จำกัดและกินโควตาข้อความ

**แก้เป็น:** ป้องกันด้วย session/API key และใส่ rate limit (Vercel KV, Upstash Ratelimit)

### 6. Rich menu route ไม่มีการยืนยันตัวตน

ใครเข้าถึง URL ได้ก็ลบ rich menu ของ production ได้ — ควรจำกัดสิทธิ์หรือย้ายไปเป็น script ที่รันมือ

---

## ทางเลือกอื่นนอกจาก Vercel

| แพลตฟอร์ม | ข้อดี | ข้อควรรู้ |
|---|---|---|
| **Vercel** | ง่ายที่สุดสำหรับ Next.js, ฟรี | serverless — ไม่มี state ค้างในหน่วยความจำ |
| **Railway / Render** | รันเป็น container ต่อเนื่อง, มี state ได้ | ฟรีจำกัด, sleep เมื่อไม่มีคนใช้ |
| **Cloudflare Workers** | เร็วมาก | ต้องแก้โค้ดที่ใช้ `node:crypto`/`node:stream` |
| **VPS + Docker** | คุมได้ทุกอย่าง | ต้องตั้ง HTTPS/reverse proxy เอง |

Messaging API ต้องการแค่ **HTTPS endpoint ที่รับ POST ได้** — จะโฮสต์ที่ไหนก็ได้ทั้งนั้น

---

## Checklist ก่อนขึ้นจริง

- [ ] ค่าลับทั้งหมดอยู่ใน environment variables ไม่ได้ hardcode
- [ ] `SESSION_SECRET` เป็นค่าสุ่มใหม่ ไม่ซ้ำกับตอน dev
- [ ] Webhook ตรวจลายเซ็นเสมอ และตอบ 200 แม้ handler พัง
- [ ] มี idempotency กัน retry ซ้ำ
- [ ] ปิด Auto-reply / Greeting message ใน Official Account Manager
- [ ] Callback URL / Endpoint URL ในคอนโซลตรงกับโดเมนจริง
- [ ] `/api/line/send` และ `/api/line/richmenu` มีการป้องกัน
- [ ] ตั้ง monitoring/alert เมื่อ webhook error (Sentry, Vercel Log Drains)
- [ ] รู้ว่าโควตาข้อความเหลือเท่าไร และจะทำยังไงเมื่อหมด

---

ถัดไป → [`06-troubleshooting.md`](./06-troubleshooting.md)
