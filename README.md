# LINE API Playground 🟢

โปรเจกต์สำหรับ **เรียนรู้ LINE API** ตั้งแต่ศูนย์ — ครบทั้ง Messaging API, LINE Login และ LIFF
ทุกตัวอย่างรันได้จริง มีคอมเมนต์อธิบายภาษาไทยในโค้ด และมีหน้าเว็บให้กดทดลอง

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · `@line/bot-sdk` · `@line/liff`

---

## LINE API ทำอะไรได้บ้าง

"LINE API" ไม่ใช่ API ตัวเดียว แต่เป็นกลุ่มของ API หลายตระกูลที่ทำหน้าที่ต่างกัน:

| ตระกูล | ทำอะไร | ผู้ใช้เห็นอะไร |
|---|---|---|
| **Messaging API** | บอทในห้องแชท รับ/ส่งข้อความ | ห้องแชทกับบอท |
| **LINE Login** | ล็อกอินเว็บด้วยบัญชี LINE | ปุ่ม "เข้าสู่ระบบด้วย LINE" |
| **LIFF** | เว็บแอปที่เปิดในแอป LINE | หน้าเว็บทับหน้าจอแชท |
| LINE Pay | รับชำระเงิน | หน้าจ่ายเงิน |
| LINE MINI App | LIFF ที่ผ่านการรีวิว มีหน้าร้านใน LINE | แอปใน LINE |

> **LINE Notify ปิดให้บริการแล้ว** (31 มี.ค. 2025) ถ้าเจอบทความเก่าที่สอนใช้ LINE Notify
> ให้ข้ามไปใช้ Messaging API แทน

โปรเจกต์นี้ครอบคลุม **3 ตัวแรก** ซึ่งเป็นตัวที่ใช้บ่อยที่สุด

---

## เริ่มยังไง

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

เปิด http://localhost:3000 — หน้าเว็บใช้งานได้ทันทีแม้ยังไม่ได้ตั้งค่าอะไรเลย
ไปที่ http://localhost:3000/setup เพื่อดูว่าต้องเติมค่าอะไรบ้าง

จากนั้นทำตาม **[`docs/01-setup.md`](./docs/01-setup.md)** ทีละขั้น (ประมาณ 20–30 นาที)
จนบอทตอบข้อความได้

---

## เอกสาร

| ไฟล์ | เนื้อหา |
|---|---|
| [`docs/01-setup.md`](./docs/01-setup.md) | สมัคร LINE Developers → สร้าง channel → ngrok → บอทตอบได้ |
| [`docs/02-messaging-api.md`](./docs/02-messaging-api.md) | webhook, ลายเซ็น, event, reply vs push, ชนิดข้อความ, rich menu |
| [`docs/03-line-login.md`](./docs/03-line-login.md) | OAuth flow, state/nonce, id_token, session, เรื่อง userId |
| [`docs/04-liff.md`](./docs/04-liff.md) | LIFF SDK, ฟังก์ชันที่ใช้บ่อย, ความปลอดภัยที่คนพลาดบ่อย |
| [`docs/05-deploy.md`](./docs/05-deploy.md) | deploy Vercel + สิ่งที่ต้องแก้ก่อนใช้จริง |
| [`docs/06-troubleshooting.md`](./docs/06-troubleshooting.md) | รวม error ที่เจอบ่อยและวิธีแก้ |

---

## หน้าเว็บในโปรเจกต์

| หน้า | ทำอะไรได้ |
|---|---|
| `/` | ภาพรวมว่า LINE API แต่ละตระกูลทำอะไร ต่างกันยังไง |
| `/setup` | เช็คว่าตั้ง env ครบไหม + แสดง URL ที่ต้องกรอกในคอนโซล |
| `/messaging` | สถานะบอท, ตารางสรุป event/ข้อความ, ปุ่มสร้าง Rich Menu |
| `/playground` | ทดลอง push / multicast / broadcast + ดู JSON ที่จะถูกส่งจริง |
| `/webhook` | ดู event ดิบที่ LINE ส่งมา แบบเกือบ real-time |
| `/login` | ปุ่มล็อกอิน LINE + อธิบาย OAuth flow ทีละขั้น |
| `/profile` | หน้าที่ต้องล็อกอินก่อน แสดงข้อมูลจาก session |
| `/liff` | ทดลองเรียกฟังก์ชัน LIFF ทุกตัว + ตรวจ id_token ที่ฝั่ง server |

---

## คำสั่งที่บอทรองรับ

พิมพ์ในห้องแชทกับบอทได้เลย:

```
help                                    ดูคำสั่งทั้งหมด

text  emoji  sticker  image  video      ตัวอย่างข้อความพื้นฐาน
location  quickreply                    ตัวอย่างปุ่มลอย
buttons  confirm  carousel              ตัวอย่าง template
flex  flexcarousel                      ตัวอย่าง Flex Message

me                                      โปรไฟล์ตัวเอง (Get profile API)
id                                      userId / groupId ของห้องนี้
quota                                   โควตาข้อความที่เหลือ
bot                                     ข้อมูลบอท
loading                                 จุดไข่ปลา "กำลังพิมพ์"
echo <ข้อความ>                          ทวนคำ
```

---

## โครงสร้างโค้ด

```
src/
├── app/
│   ├── page.tsx                        ภาพรวม LINE API
│   ├── setup/                          เช็ค env
│   ├── messaging/                      สถานะบอท + rich menu
│   ├── playground/                     ฟอร์มส่งข้อความ
│   ├── webhook/                        ดู event log
│   ├── login/  profile/                LINE Login
│   ├── liff/                           หน้า LIFF
│   └── api/
│       ├── line/webhook/route.ts       ★ ประตูรับ event จาก LINE
│       ├── line/send/route.ts          push / multicast / broadcast
│       ├── line/richmenu/route.ts      สร้าง/ดู/ลบ rich menu
│       ├── line/bot-info/route.ts      สถานะบอท
│       ├── line/events/route.ts        อ่าน/ล้าง event log
│       ├── auth/line/login/route.ts    ★ เริ่ม OAuth flow
│       ├── auth/line/callback/route.ts ★ แลก code เป็น token
│       ├── auth/logout/route.ts        ลบ session
│       └── liff/verify/route.ts        ★ ตรวจ id_token จาก LIFF
├── lib/
│   ├── env.ts                          อ่าน env + เช็คความครบถ้วน
│   ├── line.ts                         สร้าง client + ตรวจลายเซ็น
│   ├── bot.ts                          ★ ตรรกะของบอททั้งหมด
│   ├── messages.ts                     ★ ตัวอย่างข้อความทุกชนิด
│   ├── richmenu.tsx                    โครง rich menu + วาดรูปเมนู
│   ├── event-log.ts                    เก็บ event ไว้ใน memory
│   └── session.ts                      session cookie ของแอปเรา
└── components/ui.tsx                   ชิ้นส่วน UI ที่ใช้ซ้ำ
```

★ = ไฟล์ที่ควรอ่านก่อน

---

## แนะนำลำดับการอ่านโค้ด

1. `src/app/api/line/webhook/route.ts` — เข้าใจว่า event เข้ามายังไง และทำไมต้องตรวจลายเซ็น
2. `src/lib/bot.ts` — เห็นว่าเลือกตอบยังไงตามชนิด event
3. `src/lib/messages.ts` — ดูหน้าตา JSON ของข้อความแต่ละชนิด
4. `src/app/api/auth/line/callback/route.ts` — OAuth flow ครบทุกขั้นในไฟล์เดียว
5. `src/app/liff/liff-client.tsx` — LIFF SDK ฝั่ง browser

---

## ⚠️ อย่าเอาไปใช้ production ตรง ๆ

โปรเจกต์นี้จงใจทำหลายอย่างให้ง่ายเพื่อการเรียนรู้ — event log อยู่ใน memory,
ไม่มี rate limiting, ไม่มี idempotency, session แบบง่าย, endpoint ไม่มีการยืนยันตัวตน

รายละเอียดว่าต้องแก้อะไรบ้างอยู่ใน [`docs/05-deploy.md`](./docs/05-deploy.md)

---

## ลิงก์ทางการ

- [LINE Developers Console](https://developers.line.biz/console/)
- [Messaging API docs](https://developers.line.biz/en/docs/messaging-api/)
- [Flex Message Simulator](https://developers.line.biz/flex-simulator/) — ออกแบบ Flex ผ่าน GUI
- [line-bot-sdk-nodejs](https://github.com/line/line-bot-sdk-nodejs)
