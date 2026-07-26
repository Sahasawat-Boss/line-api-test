# 03 — LINE Login

ให้ผู้ใช้ล็อกอินเว็บของเราด้วยบัญชี LINE โดยไม่ต้องตั้งรหัสผ่านใหม่

เบื้องหลังคือ **OAuth 2.0 Authorization Code Flow + OpenID Connect** มาตรฐาน
ถ้าเคยทำ "Login with Google" มาแล้ว จะคุ้นเคยทันที

---

## ลำดับทั้งหมด

```
[1] ผู้ใช้กดปุ่มบนเว็บเรา
     GET /api/auth/line/login
     ├─ สุ่ม state + nonce  →  เก็บใส่ cookie ชั่วคราว (10 นาที)
     └─ 302 redirect ไป:
        https://access.line.me/oauth2/v2.1/authorize
          ?response_type=code
          &client_id={CHANNEL_ID}
          &redirect_uri=https://your-app.com/api/auth/line/callback
          &state={state}
          &nonce={nonce}
          &scope=openid%20profile

[2] ผู้ใช้เห็นหน้ายินยอมของ LINE แล้วกด "อนุญาต"

[3] LINE redirect กลับมา
     GET /api/auth/line/callback?code=xxx&state=yyy
     └─ เช็ค state ตรงกับที่เก็บไว้ไหม  ← กัน CSRF

[4] แลก code เป็น token  (ต้องทำฝั่ง server เท่านั้น เพราะใช้ channel secret)
     POST https://api.line.me/oauth2/v2.1/token
       grant_type=authorization_code
       &code=xxx
       &redirect_uri=...
       &client_id=...
       &client_secret=...

     ได้: { access_token, refresh_token, id_token, expires_in, scope }

[5] ตรวจ + ถอด id_token
     ตรวจ signature / iss / aud / exp / nonce
     ได้: sub (= userId), name, picture, email

[6] ออก session cookie ของแอปเรา → redirect ไปหน้า /profile
```

**ไฟล์ในโปรเจกต์:**

| ไฟล์ | ขั้นตอน |
|---|---|
| `src/app/api/auth/line/login/route.ts` | [1] |
| `src/app/api/auth/line/callback/route.ts` | [3][4][5][6] |
| `src/lib/session.ts` | จัดการ session cookie ของเรา |
| `src/app/login/page.tsx` | หน้าที่มีปุ่มล็อกอิน |
| `src/app/profile/page.tsx` | หน้าที่ต้องล็อกอินก่อนถึงเข้าได้ |

---

## `state` และ `nonce` — อย่าตัดทิ้ง

| ค่า | กันอะไร | ตรวจยังไง |
|---|---|---|
| `state` | **CSRF** — คนอื่นหลอกให้เบราว์เซอร์เราส่ง code ของเขาเข้ามา | ค่าที่กลับมาต้องตรงกับที่เก็บใน cookie |
| `nonce` | **Replay** — เอา id_token เก่ามาใช้ซ้ำ | ค่าใน payload ของ id_token ต้องตรงกับที่เก็บไว้ |

ทั้งคู่ต้องเป็นค่าสุ่มใหม่ทุกครั้งที่ล็อกอิน

```ts
import { randomBytes } from "node:crypto";
const state = randomBytes(16).toString("hex");
```

---

## `access_token` vs `id_token`

|  | `access_token` | `id_token` |
|---|---|---|
| คืออะไร | บัตรผ่านไปเรียก API | บัตรประชาชนบอกว่าใครล็อกอิน |
| รูปแบบ | string ทึบ อ่านไม่ออก | JWT — ถอดอ่านได้ |
| ใช้ทำอะไร | `GET /v2/profile`, `GET /v2/friendship/status` | อ่าน userId/ชื่อ/อีเมล ได้เลยไม่ต้องยิง API เพิ่ม |
| ต้องตรวจ | ไม่ต้อง (LINE ตรวจให้ตอนเรียก) | **ต้องตรวจ signature เองทุกครั้ง** |

### ตรวจ id_token ยังไง

LINE เซ็นด้วย **HS256** โดยใช้ **channel secret** เป็นกุญแจ:

```ts
import { jwtVerify } from "jose";

const { payload } = await jwtVerify(
  idToken,
  new TextEncoder().encode(LINE_LOGIN_CHANNEL_SECRET),
  {
    issuer: "https://access.line.me",
    audience: LINE_LOGIN_CHANNEL_ID,
  },
);
// payload.sub = userId
```

หรือให้ LINE ตรวจให้ก็ได้ (ช้ากว่าเพราะต้องยิง network):

```
POST https://api.line.me/oauth2/v2.1/verify
  id_token={idToken}&client_id={CHANNEL_ID}
```

> ⚠️ **ห้ามใช้ `JSON.parse(atob(token.split(".")[1]))` แล้วเชื่อค่าเลย**
> JWT ที่ไม่ตรวจลายเซ็นคือข้อความธรรมดาที่ใครก็ปลอมได้

---

## scope ที่ขอได้

| scope | ได้อะไร | เงื่อนไข |
|---|---|---|
| `profile` | `displayName`, `pictureUrl`, `statusMessage` | ใช้ได้เลย |
| `openid` | ได้ `id_token` กลับมาด้วย | ใช้ได้เลย |
| `email` | อีเมลของผู้ใช้ | **ต้องยื่นขออนุมัติในคอนโซลก่อน** |

ขอ email: คอนโซล → LINE Login channel → แท็บ **Basic settings** → *OpenID Connect* →
*Email address permission* → **Apply** (กรอกฟอร์มสั้น ๆ อนุมัติทันที)

ถ้ายังไม่ได้ขอแล้วใส่ `scope=email` จะ error ตั้งแต่ขั้นแรก

---

## `bot_prompt` — ชวนเพิ่มเพื่อนบอทไปพร้อมกัน

เพิ่มพารามิเตอร์นี้ตอน redirect ไป authorize:

```
&bot_prompt=normal      // แสดงตัวเลือก "เพิ่มเพื่อน" หลังยินยอม
&bot_prompt=aggressive  // แสดงพร้อมกับหน้ายินยอมเลย
```

ใช้ได้เมื่อ **ผูก LINE Login channel เข้ากับ Messaging API channel** แล้วเท่านั้น
หลังล็อกอินเสร็จ ค่า `friendship_status_changed` จะกลับมาบอกว่าผู้ใช้เพิ่งเพิ่มเพื่อนหรือเปล่า

ในโปรเจกต์นี้ comment ไว้ที่ `src/app/api/auth/line/login/route.ts` — เอา comment ออกได้เลย

---

## เรื่อง userId ที่ต้องระวังที่สุด

> **`userId` เดียวกัน = ผู้ใช้คนเดียวกัน เฉพาะเมื่ออยู่ใน provider เดียวกัน**

ผู้ใช้คนเดียวกัน เปิด 2 channel ที่อยู่คนละ provider จะได้ `userId` คนละค่า

ดังนั้นถ้าอยากให้ userId จาก LINE Login เอาไป push message ผ่านบอทได้:

1. สร้าง Messaging API channel กับ LINE Login channel ไว้ใน **provider เดียวกัน**
2. **ผูก** สอง channel เข้าด้วยกันในคอนโซล (Linked LINE Official Account)

ทดสอบง่าย ๆ: ล็อกอินที่ `/login` → ก๊อป userId จากหน้า `/profile` → เอาไปวางที่ `/playground` แล้วกดส่ง
ถ้าส่งได้แปลว่าผูกถูกแล้ว

---

## Session — LINE ไม่ได้จัดการให้

LINE แค่ยืนยันตัวตนให้ **ครั้งเดียว** ตอนล็อกอิน หลังจากนั้นเป็นหน้าที่เราเอง

ในโปรเจกต์นี้ (`src/lib/session.ts`) ใช้วิธีง่ายที่สุด: JWT ที่เราเซ็นเอง ใส่ไว้ใน cookie

```ts
cookies().set("line_session", token, {
  httpOnly: true,   // JS ฝั่ง client อ่านไม่ได้ → กัน XSS ขโมย session
  secure: true,     // ส่งผ่าน HTTPS เท่านั้น (ตอน prod)
  sameSite: "lax",  // ⚠️ ต้องเป็น lax ไม่ใช่ strict
  maxAge: 60 * 60 * 24 * 7,
});
```

> **ทำไม `sameSite` ต้องเป็น `lax`?**
> เพราะผู้ใช้เดินทางกลับมาจากโดเมน `access.line.me` — ถ้าตั้ง `strict` เบราว์เซอร์จะไม่ส่ง cookie
> มากับ request นั้น ทำให้เช็ค `state` ไม่ผ่านทุกครั้ง

ของจริงถ้าอยากได้ครบกว่านี้ (refresh token, การเพิกถอน session) แนะนำใช้ **Auth.js (NextAuth)**
ซึ่งมี LINE provider ให้อยู่แล้ว

---

## ต่ออายุ / ยกเลิก token

```
# ต่ออายุ access_token
POST https://api.line.me/oauth2/v2.1/token
  grant_type=refresh_token&refresh_token=...&client_id=...&client_secret=...

# ยกเลิก access_token
POST https://api.line.me/oauth2/v2.1/revoke
  access_token=...&client_id=...&client_secret=...
```

`refresh_token` มีอายุ 90 วันนับจากออก และหมดอายุถ้าไม่ได้ใช้

> การกด "ออกจากระบบ" ในโปรเจกต์นี้แค่ลบ cookie ของเรา ไม่ได้ revoke token กับ LINE
> ครั้งหน้าที่กดล็อกอิน LINE จะจำได้และไม่ถามยินยอมซ้ำ

---

## Error ที่เจอบ่อย

| ข้อความ | สาเหตุ |
|---|---|
| `400 invalid_request: redirect_uri` | Callback URL ในคอนโซลไม่ตรงกับที่ส่งไป (ต้องตรงทุกตัวอักษร) |
| `400 invalid_grant` | `code` ถูกใช้ไปแล้ว (ใช้ได้ครั้งเดียว) หรือหมดอายุ |
| `401 invalid_client` | `client_id` / `client_secret` ผิด |
| `state ไม่ตรงกัน` | cookie หาย — เช็ค `sameSite`, หรือ `APP_BASE_URL` คนละโดเมนกับที่เปิดจริง |
| ขอ `email` แล้ว error | ยังไม่ได้ยื่นขออนุมัติสิทธิ์ email ในคอนโซล |

---

ถัดไป → [`04-liff.md`](./04-liff.md)
