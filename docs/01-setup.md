# 01 — ตั้งค่าตั้งแต่ศูนย์

เป้าหมายของบทนี้: ทักบอทในแอป LINE แล้วบอทตอบกลับได้

ใช้เวลาประมาณ 20–30 นาที ไม่ต้องจ่ายเงิน

---

## ภาพรวมโครงสร้างบัญชี LINE

ก่อนกดอะไร ให้เข้าใจลำดับชั้นนี้ก่อน จะสับสนน้อยลงมาก:

```
LINE account (บัญชี LINE ส่วนตัวของคุณ)
└── Provider  (เจ้าของแอป — จะเป็นชื่อคุณ หรือชื่อบริษัทก็ได้)
    ├── Channel: Messaging API   → บอทในแชท
    │   └── ผูกกับ LINE Official Account 1 ตัว
    ├── Channel: LINE Login      → ปุ่มล็อกอินบนเว็บ
    │   └── LIFF app             → เว็บที่เปิดในแอป LINE
    └── Channel: อื่น ๆ
```

**จุดที่คนพลาดบ่อย:** `userId` ของผู้ใช้คนเดียวกัน **ต่างกันในแต่ละ provider**
ถ้าอยากให้ LINE Login กับบอทเห็นผู้ใช้เป็นคนเดียวกัน ต้องสร้าง channel ทั้งสองไว้ใน **provider เดียวกัน**

---

## ขั้นที่ 1 — สมัคร LINE Developers

1. เปิด https://developers.line.biz/console/
2. กด **Log in** แล้วเข้าด้วยบัญชี LINE ส่วนตัว (หรืออีเมลที่ผูกไว้)
3. ครั้งแรกจะให้กรอกชื่อ + อีเมล → กด **Create my account**

---

## ขั้นที่ 2 — สร้าง Provider

1. หน้าแรกของคอนโซล กด **Create a new provider**
2. ตั้งชื่ออะไรก็ได้ เช่น `My Learning Provider`
3. กด **Create**

> ชื่อ provider จะปรากฏให้ผู้ใช้เห็นตอนกดยินยอมสิทธิ์ ตั้งชื่อให้ดูดีหน่อย

---

## ขั้นที่ 3 — สร้าง Messaging API channel (บอท)

ตั้งแต่ปี 2024 LINE เปลี่ยนวิธีสร้างเป็นแบบนี้:

1. ในหน้า provider กด **Create a new channel** → เลือก **Messaging API**
2. จะเด้งไปหน้า **LINE Official Account Manager** ให้สร้าง Official Account ก่อน
   - กรอกชื่อบัญชี, ประเภทธุรกิจ, ประเทศ → สร้าง
3. กลับมาที่ LINE Developers Console → refresh → จะเห็น channel ใหม่โผล่ในlist
4. เข้าไปที่ channel นั้น

### เก็บค่า 2 ตัวนี้

| ค่า | หาที่ไหน |
|---|---|
| `LINE_CHANNEL_SECRET` | แท็บ **Basic settings** → เลื่อนลงหา *Channel secret* |
| `LINE_CHANNEL_ACCESS_TOKEN` | แท็บ **Messaging API** → ล่างสุด *Channel access token (long-lived)* → กด **Issue** |

เอาไปใส่ใน `.env.local`:

```bash
LINE_CHANNEL_SECRET=abc123...
LINE_CHANNEL_ACCESS_TOKEN=eyJhbGciOi...
```

### ปิดระบบตอบกลับอัตโนมัติ (สำคัญมาก)

ถ้าไม่ปิด บอทของเราจะถูกข้อความอัตโนมัติของ LINE ตอบทับ

1. แท็บ **Messaging API** → หัวข้อ *LINE Official Account features*
2. กด **Edit** ตรง **Auto-reply messages** → จะพาไป Official Account Manager
3. ตั้งค่าดังนี้:
   - **Chat** → เปิด (On)
   - **Greeting messages** → ปิด (Off) — เราเขียน follow event เองแล้ว
   - **Auto-response** / ข้อความตอบกลับอัตโนมัติ → **ปิด (Off)**

---

## ขั้นที่ 4 — รันโปรเจกต์

```powershell
npm install
Copy-Item .env.example .env.local   # ถ้ายังไม่มี
npm run dev
```

เปิด http://localhost:3000/setup จะเห็นว่าตั้งค่าครบหรือยัง

---

## ขั้นที่ 5 — เปิด ngrok ให้ LINE เข้าถึงเครื่องเราได้

LINE ยิง webhook มาจากอินเทอร์เน็ต จึงเข้า `localhost` ไม่ได้ ต้องมีอุโมงค์

### ติดตั้ง ngrok

```powershell
winget install ngrok.ngrok
# หรือดาวน์โหลดจาก https://ngrok.com/download

# สมัครฟรีที่ ngrok.com แล้วเอา authtoken มาใส่ (ทำครั้งเดียว)
ngrok config add-authtoken <TOKEN ของคุณ>
```

### เปิดอุโมงค์

เปิดเทอร์มินัล**อีกหน้าต่าง** (อย่าปิดอันที่รัน `npm run dev`):

```powershell
ngrok http 3000
```

จะได้ผลแบบนี้:

```
Forwarding   https://1a2b-203-0-113-45.ngrok-free.app -> http://localhost:3000
```

เอา URL นั้นไปใส่ใน `.env.local`:

```bash
APP_BASE_URL=https://1a2b-203-0-113-45.ngrok-free.app
```

แล้ว **รีสตาร์ท** `npm run dev` (Next.js อ่าน env ตอนบูตเท่านั้น)

> **ngrok ฟรีเปลี่ยน URL ทุกครั้งที่รันใหม่** ต้องแก้ทั้ง `.env.local` และค่าในคอนโซล LINE ใหม่ทุกครั้ง
> ถ้ารำคาญ สมัคร ngrok แบบมีโดเมนถาวร หรือ deploy ขึ้น Vercel ไปเลย (ดู `05-deploy.md`)

---

## ขั้นที่ 6 — ตั้ง Webhook URL

1. คอนโซล → Messaging API channel → แท็บ **Messaging API**
2. หัวข้อ **Webhook settings**
   - **Webhook URL** = `https://<ngrok ของคุณ>/api/line/webhook`
   - กด **Update**
   - กด **Verify** → ต้องขึ้น **Success** สีเขียว
   - เปิดสวิตช์ **Use webhook** ให้เป็น **On**

ถ้า Verify ไม่ผ่าน ให้ดู `docs/06-troubleshooting.md`

---

## ขั้นที่ 7 — เพิ่มเพื่อนบอทแล้วทดสอบ

1. แท็บ **Messaging API** → ส่วน *Bot information* จะมี QR code
2. สแกนด้วยแอป LINE ในมือถือ → เพิ่มเพื่อน
3. บอทควรทักทายทันที (นั่นคือ `follow` event ทำงาน)
4. พิมพ์ `help` → บอทจะส่งรายการคำสั่งทั้งหมดมาให้
5. เปิด http://localhost:3000/webhook ค้างไว้ จะเห็น event ดิบวิ่งเข้ามาแบบ real-time

**ถึงตรงนี้ Messaging API ใช้งานได้แล้ว** 🎉

---

## ขั้นที่ 8 — (เลือกทำ) LINE Login channel

ทำเมื่ออยากลองหน้า `/login`

1. กลับไปที่ **provider เดิม** → **Create a new channel** → **LINE Login**
2. กรอกชื่อ, ภาษา, ประเทศ, เลือก App types = **Web app**
3. เข้าไปที่ channel ที่สร้าง

| ค่า | หาที่ไหน |
|---|---|
| `LINE_LOGIN_CHANNEL_ID` | แท็บ **Basic settings** → *Channel ID* (ตัวเลขล้วน) |
| `LINE_LOGIN_CHANNEL_SECRET` | แท็บ **Basic settings** → *Channel secret* |

4. แท็บ **LINE Login** → ช่อง **Callback URL** ใส่ (บรรทัดละ 1 อัน):

```
http://localhost:3000/api/auth/line/callback
https://<ngrok ของคุณ>/api/auth/line/callback
```

> ต้องตรง **ทุกตัวอักษร** รวมทั้ง `http`/`https` และไม่มี `/` ปิดท้าย

5. ตั้ง `SESSION_SECRET` ให้เป็นค่าสุ่ม:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

6. รีสตาร์ท dev server → เปิด http://localhost:3000/login

### ผูก Login channel เข้ากับบอท (แนะนำ)

ถ้าอยากให้ `userId` จาก LINE Login เอาไป push message ได้:

- Messaging API channel → แท็บ **Messaging API** → *Linked LINE Official Account*
- หรือ LINE Login channel → แท็บ **Basic settings** → *Linked OA*

---

## ขั้นที่ 9 — (เลือกทำ) LIFF app

ทำเมื่ออยากลองหน้า `/liff`

1. LINE Login channel → แท็บ **LIFF** → **Add**
2. กรอก:
   - **LIFF app name**: `Learning LIFF`
   - **Size**: `Full`
   - **Endpoint URL**: `https://<ngrok ของคุณ>/liff` ← ต้องเป็น **https** เท่านั้น
   - **Scopes**: ติ๊ก `profile` และ `openid`
   - **Bot link feature**: `On (Normal)` ถ้าอยากชวนเพิ่มเพื่อนบอทไปด้วย
3. กด **Add** → จะได้ **LIFF ID** หน้าตาแบบ `2001234567-AbCdEfGh`

```bash
NEXT_PUBLIC_LIFF_ID=2001234567-AbCdEfGh
```

4. รีสตาร์ท dev server
5. ทดสอบ: พิมพ์ในแชทกับบอท `echo https://liff.line.me/2001234567-AbCdEfGh`
   แล้วกดลิงก์ที่บอทส่งกลับมา → หน้า LIFF จะเปิดในแอป LINE

---

## สรุปค่าทั้งหมดใน `.env.local`

```bash
# Messaging API channel
LINE_CHANNEL_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiJ9...
LINE_CHANNEL_SECRET=0123456789abcdef...

# LINE Login channel
LINE_LOGIN_CHANNEL_ID=2001234567
LINE_LOGIN_CHANNEL_SECRET=fedcba9876543210...

# LIFF
NEXT_PUBLIC_LIFF_ID=2001234567-AbCdEfGh

# ทั่วไป
APP_BASE_URL=https://1a2b-203-0-113-45.ngrok-free.app
SESSION_SECRET=<ค่าสุ่ม 64 ตัวอักษร>
```

ตรวจสอบได้ที่หน้า http://localhost:3000/setup

---

ถัดไป → [`02-messaging-api.md`](./02-messaging-api.md)
