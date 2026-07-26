# 02 — Messaging API

บอทในห้องแชท — ตัวที่คนใช้เยอะที่สุดในบรรดา LINE API ทั้งหมด

---

## แนวคิดหลัก: มันเป็น event-driven

เราไม่ได้ไป "ดึง" ข้อความมาอ่าน แต่ LINE จะ "ยิง" HTTP POST มาหาเราเมื่อมีอะไรเกิดขึ้น

```
ผู้ใช้พิมพ์ "flex"
      │
      ▼
เซิร์ฟเวอร์ LINE
      │  POST https://your-app.com/api/line/webhook
      │  x-line-signature: <HMAC-SHA256 ของ body ด้วย channel secret>
      ▼
แอปเรา  ──►  ตรวจลายเซ็น ──►  ตัดสินใจ ──►  POST /v2/bot/message/reply
      │                                              │
      └──────────── ตอบ 200 กลับให้ LINE ◄───────────┘
```

**ไฟล์ที่เกี่ยวข้องในโปรเจกต์นี้**

| ไฟล์ | หน้าที่ |
|---|---|
| `src/app/api/line/webhook/route.ts` | ประตูรับ event + ตรวจลายเซ็น |
| `src/lib/bot.ts` | ตรรกะว่าจะตอบอะไร |
| `src/lib/messages.ts` | ตัวอย่างข้อความทุกชนิด |
| `src/lib/line.ts` | สร้าง client + helper ตรวจลายเซ็น |
| `src/lib/richmenu.tsx` | โครง rich menu + วาดรูปเมนู |

---

## 1. ตรวจลายเซ็น — ห้ามข้าม

ถ้าไม่ตรวจ ใครก็ตามที่รู้ URL ของเราสามารถยิง event ปลอมเข้ามาได้

```ts
// src/app/api/line/webhook/route.ts
const rawBody = await request.text();       // ← ต้องเป็น string ดิบ
const signature = request.headers.get("x-line-signature");

if (!validateSignature(rawBody, CHANNEL_SECRET, signature)) {
  return new Response("Invalid signature", { status: 401 });
}
```

สิ่งที่ `validateSignature` ทำเบื้องหลัง:

```
Base64( HMAC-SHA256( channelSecret, rawBody ) )  ===  x-line-signature ?
```

> **จุดพลาดคลาสสิก:** เรียก `request.json()` ก่อน แล้วค่อย `JSON.stringify()` กลับมาตรวจ
> — ลำดับ key หรือช่องว่างอาจเปลี่ยน ทำให้ hash ไม่ตรง ต้องใช้ raw body เท่านั้น

---

## 2. ตอบ 200 ให้เร็ว และตอบ 200 เสมอ

```ts
try {
  await handleEvent(event);
} catch (error) {
  console.error(error);   // จับไว้ อย่าปล่อยให้ throw ออกไป
}
return NextResponse.json({ ok: true });   // ← 200 เสมอ
```

ถ้าเราตอบ 4xx/5xx LINE จะ **retry ส่ง event เดิมซ้ำ** ทำให้บอทตอบซ้ำ
(สังเกตได้จาก `deliveryContext.isRedelivery === true`)

---

## 3. Event ที่ต้องรู้จัก

| type | เกิดเมื่อ | ตอบกลับได้ไหม |
|---|---|---|
| `message` | ผู้ใช้ส่งข้อความ/รูป/สติกเกอร์/ตำแหน่ง | ✅ มี `replyToken` |
| `postback` | กดปุ่มที่ action เป็น postback | ✅ |
| `follow` | เพิ่มเพื่อน / ปลดบล็อก | ✅ |
| `unfollow` | บล็อกหรือลบบอท | ❌ ไม่มี replyToken |
| `join` / `leave` | บอทเข้า/ออกจากกลุ่ม | `join` ✅ / `leave` ❌ |
| `memberJoined` / `memberLeft` | คนเข้า/ออกจากกลุ่ม | `memberJoined` ✅ |
| `videoPlayComplete` | ดูวิดีโอในข้อความจบ | ✅ |
| `beacon` | เข้าใกล้ LINE Beacon | ✅ |

โครงสร้าง event:

```json
{
  "destination": "U...",              // userId ของบอทเอง
  "events": [{
    "type": "message",
    "mode": "active",
    "timestamp": 1700000000000,
    "webhookEventId": "01H8...",
    "deliveryContext": { "isRedelivery": false },
    "source": { "type": "user", "userId": "U..." },
    "replyToken": "0f3779fba3b3...",
    "message": { "id": "468...", "type": "text", "text": "flex" }
  }]
}
```

`source.type` เป็นได้ 3 แบบ:

| type | มี field | หมายเหตุ |
|---|---|---|
| `user` | `userId` | แชท 1:1 |
| `group` | `groupId`, `userId?` | `userId` มีเฉพาะเมื่อผู้ใช้ยินยอมให้เข้าถึงข้อมูล |
| `room` | `roomId`, `userId?` | ห้องแชทหลายคนแบบไม่มีชื่อกลุ่ม |

---

## 4. reply vs push — เลือกใช้ให้ถูก

|  | reply | push / multicast / broadcast |
|---|---|---|
| ต้องใช้ | `replyToken` | `userId` / `groupId` |
| ใช้ได้เมื่อไร | ~1 นาทีหลัง event, ครั้งเดียว | เมื่อไรก็ได้ |
| คิดโควตา | **ฟรี** | นับทุกข้อความ × ผู้รับ |
| เหมาะกับ | ตอบคำถามทันที | แจ้งเตือน, โปรโมชัน |

```ts
// reply — ฟรี ตอบกลับ event ที่เพิ่งเข้ามา
await client.replyMessage({
  replyToken: event.replyToken,
  messages: [{ type: "text", text: "สวัสดี" }],   // สูงสุด 5 ข้อความ
});

// push — ส่งเมื่อไรก็ได้ แต่นับโควตา
await client.pushMessage({
  to: "U1234567890abcdef",
  messages: [{ type: "text", text: "แจ้งเตือน" }],
});

// multicast — หลายคนพร้อมกัน (สูงสุด 500 userId, ส่งเข้ากลุ่มไม่ได้)
await client.multicast({ to: ["U111...", "U222..."], messages: [...] });

// broadcast — เพื่อนทุกคนของบัญชี
await client.broadcast({ messages: [...] });
```

**โควตาบัญชีฟรี (Communication plan แบบ Free) ในไทย:** ประมาณ 300 ข้อความ/เดือน
เช็คได้โดยพิมพ์ `quota` ในแชท หรือดูหน้า `/messaging`

---

## 5. ชนิดข้อความ

โค้ดตัวอย่างทั้งหมดอยู่ที่ `src/lib/messages.ts` — พิมพ์ชื่อคำสั่งในแชทเพื่อดูของจริง

### พื้นฐาน

```ts
{ type: "text",  text: "สวัสดี" }                        // ≤ 5,000 ตัวอักษร
{ type: "sticker", packageId: "446", stickerId: "1988" }
{ type: "image", originalContentUrl: "https://...", previewImageUrl: "https://..." }
{ type: "video", originalContentUrl: "https://...", previewImageUrl: "https://..." }
{ type: "audio", originalContentUrl: "https://...", duration: 60000 }
{ type: "location", title: "...", address: "...", latitude: 13.7, longitude: 100.5 }
```

> URL ทุกตัว **ต้องเป็น HTTPS** — `localhost` และ `http://` ใช้ไม่ได้

### Quick Reply — ปุ่มลอยเหนือคีย์บอร์ด

แนบไปกับข้อความชนิดไหนก็ได้ สูงสุด 13 ปุ่ม หายไปเมื่อผู้ใช้กดหรือพิมพ์อย่างอื่น

```ts
{
  type: "text",
  text: "เลือกเลย",
  quickReply: {
    items: [
      { type: "action", action: { type: "message",  label: "ตกลง", text: "ok" } },
      { type: "action", action: { type: "postback", label: "ซื้อ", data: "action=buy&id=1" } },
      { type: "action", action: { type: "location", label: "ส่งตำแหน่ง" } },
      { type: "action", action: { type: "camera",   label: "เปิดกล้อง" } },
      { type: "action", action: { type: "datetimepicker", label: "เลือกวัน", data: "d", mode: "date" } },
    ],
  },
}
```

### Template — เลย์เอาต์สำเร็จรูป

`buttons` (ปุ่ม ≤4), `confirm` (2 ปุ่ม), `carousel` (การ์ดเลื่อน ≤10), `image_carousel`

เขียนง่าย แต่ปรับหน้าตาไม่ได้เลย

### Flex Message — ยืดหยุ่นที่สุด

ออกแบบ layout เองด้วย box / text / image / button / icon / separator

```
bubble
├── header  (ส่วนหัว — ไม่บังคับ)
├── hero    (รูปใหญ่ — ไม่บังคับ)
├── body    (เนื้อหาหลัก)
└── footer  (ปุ่มด้านล่าง — ไม่บังคับ)
```

ห่อหลาย bubble ด้วย `carousel` เพื่อให้เลื่อนแนวนอนได้ (≤12 ใบ)

> **เครื่องมือที่ควรใช้:** [Flex Message Simulator](https://developers.line.biz/flex-simulator/)
> ลากวางออกแบบผ่าน GUI แล้วก๊อป JSON มาใช้เลย เร็วกว่าเขียนมือมาก

---

## 6. Action — ปุ่มแต่ละชนิดทำอะไร

| type | เกิดอะไรขึ้นเมื่อกด |
|---|---|
| `message` | ส่งข้อความแทนผู้ใช้ (ผู้ใช้เห็นข้อความในแชท) |
| `postback` | ส่ง `data` ลับหลัง (ผู้ใช้ไม่เห็น เว้นแต่ใส่ `displayText`) |
| `uri` | เปิดลิงก์ — ถ้าเป็น LIFF URL จะเปิดเว็บในแอป LINE |
| `datetimepicker` | เปิดตัวเลือกวัน/เวลา ค่ากลับมาใน postback event |
| `camera` / `cameraRoll` | เปิดกล้อง / คลังรูป |
| `location` | เปิดหน้าเลือกสถานที่ |
| `richmenuswitch` | สลับไป rich menu อีกอันหนึ่ง (ใช้ทำเมนูหลายแท็บ) |

**`message` กับ `postback` ต่างกันตรงไหน?**
`message` เหมาะกับคำสั่งที่ผู้ใช้เห็นแล้วเข้าใจ (`"ดูเมนู"`)
`postback` เหมาะกับข้อมูลภายในที่ผู้ใช้ไม่ควรเห็น (`"action=order&productId=8821"`)

---

## 7. Rich Menu

เมนูรูปภาพติดล่างจอแชท — ต้องทำ 3 ขั้นถึงจะโผล่

```ts
// 1. สร้างโครง
const { richMenuId } = await client.createRichMenu({
  size: { width: 2500, height: 843 },
  selected: true,              // เปิดค้างไว้ตอนเข้าแชทครั้งแรก
  name: "เมนูหลัก",             // ชื่อภายใน ผู้ใช้ไม่เห็น
  chatBarText: "เปิดเมนู",      // ข้อความบนแถบ ≤ 14 ตัวอักษร
  areas: [
    { bounds: { x: 0,    y: 0, width: 833, height: 843 }, action: { type: "message", text: "help" } },
    { bounds: { x: 833,  y: 0, width: 833, height: 843 }, action: { type: "message", text: "flex" } },
    { bounds: { x: 1666, y: 0, width: 834, height: 843 }, action: { type: "uri", uri: "https://..." } },
  ],
});

// 2. อัปโหลดรูป (คนละโดเมน: api-data.line.me)
await blobClient.setRichMenuImage(richMenuId, imageBlob);

// 3. ตั้งเป็น default ของทุกคน
await client.setDefaultRichMenu(richMenuId);
// หรือผูกรายคน: POST /v2/bot/user/{userId}/richmenu/{richMenuId}
```

**ขนาดรูปที่ยอมรับ (ต้องตรงเป๊ะ):**
`2500×1686` `2500×843` `1200×810` `1200×405` `800×540` `800×270`
JPEG หรือ PNG ไม่เกิน 1 MB

ในโปรเจกต์นี้เราวาดรูปด้วยโค้ด (`next/og`) แทนการหาไฟล์รูปมาใส่ — ดู `src/lib/richmenu.tsx`
กดปุ่มสร้างได้ที่หน้า `/messaging`

> หลังสร้างแล้วต้อง **ปิดแล้วเปิดห้องแชทใหม่** เมนูถึงจะโผล่

---

## 8. ดาวน์โหลดไฟล์ที่ผู้ใช้ส่งมา

รูป/วิดีโอ/เสียง/ไฟล์ ไม่ได้มาพร้อม webhook — มาแค่ `messageId` ต้องไปดึงเอง

```ts
const stream = await blobClient.getMessageContent(message.id);
for await (const chunk of stream) { /* เก็บลง S3 / ส่งเข้าโมเดล AI */ }
```

ไฟล์อยู่บนเซิร์ฟเวอร์ LINE ประมาณ 1 สัปดาห์เท่านั้น

---

## 9. คำสั่งที่บอทตัวนี้รองรับ

| พิมพ์ | ได้อะไร |
|---|---|
| `help` | รายการคำสั่งทั้งหมด |
| `text` `emoji` `sticker` `image` `video` `location` | ตัวอย่างข้อความพื้นฐาน |
| `quickreply` `buttons` `confirm` `carousel` | ตัวอย่างปุ่ม/เทมเพลต |
| `flex` `flexcarousel` | ตัวอย่าง Flex Message |
| `me` | โปรไฟล์ตัวเอง (Get profile API) |
| `id` | `userId` / `groupId` ของห้องนี้ |
| `quota` | โควตาข้อความที่เหลือ |
| `bot` | ข้อมูลบอท |
| `loading` | จุดไข่ปลา "กำลังพิมพ์" |
| `echo <ข้อความ>` | ทวนคำ |

---

## 10. API อื่นที่ยังไม่ได้ใส่ในโปรเจกต์นี้

| API | ทำอะไร |
|---|---|
| **Narrowcast** | ส่งเจาะกลุ่มตามเพศ/อายุ/พื้นที่/OS |
| **Audience Match** | อัปโหลดรายชื่อลูกค้าเพื่อสร้างกลุ่มเป้าหมาย |
| **Insight** | สถิติ: จำนวนเพื่อน, อัตราการอ่าน, demographic |
| **LINE Beacon** | ตรวจจับผู้ใช้ที่เดินเข้าใกล้อุปกรณ์ beacon |
| **Account Link** | ผูกบัญชี LINE เข้ากับ user ในระบบเดิมของเรา |
| **Membership** | บอทแบบสมาชิกรายเดือน |

ทั้งหมดอยู่ใน `@line/bot-sdk` แล้ว เรียกผ่าน `MessagingApiClient` ตัวเดียวกัน

---

ถัดไป → [`03-line-login.md`](./03-line-login.md)
