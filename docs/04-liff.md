# 04 — LIFF (LINE Front-end Framework)

เว็บแอปของเราที่เปิดอยู่ **ข้างในแอป LINE**

---

## ทำไมต้องมี LIFF

ในกล่องแชททำอะไรได้จำกัด — Flex Message สวยแค่ไหนก็ยังเป็นแค่การ์ดที่กดปุ่มได้
พอเจองานแบบนี้จะไปต่อไม่ไหว:

- ฟอร์มยาว ๆ ที่มีหลายช่อง
- เลือกสินค้าใส่ตะกร้า แล้วแก้จำนวน
- ปฏิทินจองคิว
- หน้าชำระเงิน

LIFF แก้ปัญหานี้: เปิดหน้าเว็บของเราขึ้นมาทับแชท โดยที่ **รู้อยู่แล้วว่าผู้ใช้คือใคร**
ไม่ต้องให้กดล็อกอินซ้ำ และยังสั่งงานแอป LINE ต่อได้

---

## LIFF ต่างจาก LINE Login ยังไง

LIFF **ตั้งอยู่บน** LINE Login — LIFF app ทุกตัวต้องสร้างใต้ LINE Login channel

|  | LINE Login | LIFF |
|---|---|---|
| เปิดที่ไหน | เบราว์เซอร์ทั่วไป | WebView ในแอป LINE (เปิดในเบราว์เซอร์ก็ได้) |
| รู้ว่าใครยังไง | redirect ไป LINE แล้วกลับมา | รู้เลยเพราะอยู่ในแอป LINE อยู่แล้ว |
| สั่งงานแอป LINE | ไม่ได้ | ได้ — ส่งข้อความ, แชร์, สแกน QR |
| SDK | ไม่จำเป็น (HTTP ล้วน) | `@line/liff` ฝั่ง browser |

---

## เริ่มใช้งาน

```ts
// ⚠️ ต้อง import แบบ dynamic — SDK แตะ window ทันทีที่โหลด
// ถ้า import ตรง ๆ จะพังตอน Next.js ทำ server-side render
const liff = (await import("@line/liff")).default;

await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });

if (!liff.isLoggedIn()) {
  liff.login();       // จำเป็นเฉพาะตอนเปิดจากเบราว์เซอร์ธรรมดา
  return;
}

const profile = await liff.getProfile();
// { userId, displayName, pictureUrl, statusMessage }
```

`liffId` เปิดเผยได้ ไม่ใช่ความลับ — จึงตั้งชื่อ env ว่า `NEXT_PUBLIC_LIFF_ID`

ดูโค้ดจริงที่ `src/app/liff/liff-client.tsx`

---

## รู้ว่ากำลังรันอยู่ที่ไหน

```ts
liff.isInClient()    // true = เปิดในแอป LINE, false = เปิดในเบราว์เซอร์
liff.isLoggedIn()    // ล็อกอินแล้วหรือยัง
liff.getOS()         // "ios" | "android" | "web"
liff.getLanguage()   // "th" | "en" | ...
liff.getVersion()    // เวอร์ชัน LIFF SDK
liff.getLineVersion()// เวอร์ชันแอป LINE (null ถ้าเปิดในเบราว์เซอร์)
liff.getContext()    // { type: "utou" | "group" | "room" | "external", ... }
```

**`isInClient()` สำคัญมาก** — ฟังก์ชันหลายตัวใช้ได้เฉพาะในแอป LINE
เขียนโค้ดให้เช็คก่อนเสมอ ไม่งั้นหน้าเว็บจะพังตอนคนเปิดจาก Chrome

---

## ฟังก์ชันที่ใช้บ่อย

### `sendMessages()` — ส่งเข้าห้องแชทที่เปิดอยู่

```ts
await liff.sendMessages([
  { type: "text", text: "สั่งซื้อเรียบร้อยแล้ว" },
]);
```

- ใช้ได้เฉพาะเมื่อ `isInClient() === true` และเปิด LIFF จากในห้องแชท
- ข้อความจะปรากฏเหมือน **ผู้ใช้เป็นคนส่งเอง**
- ไม่นับโควตา (ต่างจาก push message)

### `shareTargetPicker()` — ให้ผู้ใช้เลือกเพื่อนเพื่อแชร์

```ts
await liff.shareTargetPicker([
  { type: "text", text: "ลองใช้แอปนี้สิ https://..." },
]);
```

ต้องเปิดสวิตช์ **Share target picker** ในคอนโซลก่อน (แท็บ LIFF → แก้ไข LIFF app)

### `scanCodeV2()` — สแกน QR code

```ts
const result = await liff.scanCodeV2();   // { value: "..." }
```

เฉพาะในแอป LINE เท่านั้น

### อื่น ๆ

```ts
liff.openWindow({ url: "https://...", external: true });  // เปิดเบราว์เซอร์นอกแอป
liff.closeWindow();                                        // ปิดหน้าต่าง LIFF
liff.getAccessToken();   // token ทึบ ใช้เรียก API ในนามผู้ใช้
liff.getIDToken();       // JWT — ใช้ยืนยันตัวตนกับ backend เรา
liff.getDecodedIDToken(); // ถอด JWT ให้เลย (แต่ "ห้าม" ใช้ยืนยันตัวตน — ไม่ตรวจ signature)
liff.logout();
```

---

## ⚠️ ความปลอดภัย — จุดที่คนพลาดมากที่สุด

```
❌ ผิด
   // ฝั่ง client
   const p = await liff.getProfile();
   fetch("/api/order", {
     method: "POST",
     body: JSON.stringify({ userId: p.userId, productId: 5 }),
   });
   // ใครก็เปิด devtools แล้วแก้ userId เป็นของคนอื่นได้
   // → สั่งของในนามคนอื่น / ดูข้อมูลคนอื่น
```

```
✅ ถูก
   // ฝั่ง client — ส่ง token ไม่ใช่ userId
   fetch("/api/order", {
     method: "POST",
     body: JSON.stringify({ idToken: liff.getIDToken(), productId: 5 }),
   });

   // ฝั่ง server — ให้ LINE ยืนยันว่า token นี้จริง และเป็นของใคร
   POST https://api.line.me/oauth2/v2.1/verify
     id_token={idToken}&client_id={LINE_LOGIN_CHANNEL_ID}
   → { sub: "U1234...", name, picture, exp, ... }
   //  ใช้ sub เป็น userId ที่เชื่อถือได้
```

โค้ดจริงอยู่ที่ `src/app/api/liff/verify/route.ts`
กดปุ่ม "ส่ง id_token ให้ server ตรวจ" ที่หน้า `/liff` เพื่อดูการทำงาน

**สรุปกฎเหล็ก:** ทุกอย่างที่มาจากเบราว์เซอร์คือ input ที่ไว้ใจไม่ได้
`userId` ที่ยืนยันแล้วต้องมาจากการตรวจ token ฝั่ง server เท่านั้น

---

## Size และ LIFF URL

ตอนสร้าง LIFF app ในคอนโซลต้องเลือกขนาด:

| Size | ความสูง | เหมาะกับ |
|---|---|---|
| `Full` | เต็มจอ | ฟอร์มยาว, แคตตาล็อก, หน้าชำระเงิน |
| `Tall` | 80% | ฟอร์มสั้น, เลือกตัวเลือก |
| `Compact` | 50% | ยืนยันข้อมูลสั้น ๆ (ยังเห็นแชทข้างหลัง) |

ทุก LIFF app จะได้ URL รูปแบบ:

```
https://liff.line.me/{LIFF_ID}
https://liff.line.me/{LIFF_ID}?foo=bar        // query param ส่งต่อไปยัง endpoint ได้
https://liff.line.me/{LIFF_ID}/detail/123     // path ก็ส่งต่อได้
```

เอา URL นี้ไปใช้ได้ทุกที่: ส่งในแชท, ปุ่ม `uri` action ใน Flex Message, ช่องใน rich menu

---

## ทดสอบยังไง

**วิธีที่เร็วที่สุด** — ส่ง LIFF URL ให้ตัวเองในแชทกับบอท:

```
พิมพ์ในแชท:  echo https://liff.line.me/2001234567-AbCdEfGh
```

แล้วกดลิงก์ที่บอทส่งกลับมา

**วิธีอื่น**
- LINE Developers Console → LIFF app → มี QR code ให้สแกน
- เปิดใน Chrome ตรง ๆ ก็ได้ (`isInClient` จะเป็น `false` และฟังก์ชันที่ต้องใช้แอปจะพัง — ปกติ)
- ใช้ [LIFF Inspector](https://github.com/line/liff-inspector) เพื่อ debug ใน WebView ของมือถือ

---

## ปัญหาที่เจอบ่อย

| อาการ | สาเหตุ |
|---|---|
| `liff.init` ค้าง / ไม่ทำงาน | `liffId` ผิด หรือยังไม่ได้ตั้ง `NEXT_PUBLIC_LIFF_ID` |
| หน้าขาว ตอน SSR | import `@line/liff` แบบปกติ — ต้อง dynamic import ใน `useEffect` |
| `sendMessages` error | เปิดจากเบราว์เซอร์ หรือเปิด LIFF นอกห้องแชท |
| Endpoint URL ใส่ไม่ได้ | ต้องเป็น `https://` เท่านั้น — `localhost` ไม่ได้ ใช้ ngrok |
| แก้โค้ดแล้วไม่อัปเดตในแอป LINE | WebView cache — ปิดหน้า LIFF แล้วเปิดใหม่ หรือล้าง cache แอป LINE |
| `getIDToken()` คืน `null` | ไม่ได้ติ๊ก scope `openid` ตอนสร้าง LIFF app |

---

## LINE MINI App คืออะไร

LIFF เวอร์ชัน "ทางการ" — ผ่านการรีวิวจาก LINE แล้วจะได้:

- ปรากฏในหน้ารวมแอปของ LINE (มีคนเห็นเยอะขึ้น)
- ผู้ใช้ไม่ต้องกดยินยอมสิทธิ์
- ใช้ Service Message ส่งข้อความแจ้งเตือนธุรกรรมได้โดยไม่ต้องเป็นเพื่อน

เหมาะกับแอปที่ทำเสร็จแล้วและจะเปิดใช้จริง — ตอนเรียนใช้ LIFF ธรรมดาพอ

---

ถัดไป → [`05-deploy.md`](./05-deploy.md)
