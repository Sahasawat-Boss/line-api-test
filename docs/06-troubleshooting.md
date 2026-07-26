# 06 — แก้ปัญหาที่เจอบ่อย

---

## บอทไม่ตอบเลย

ไล่เช็คตามลำดับนี้ อย่าข้าม:

### 1. Webhook Verify ผ่านไหม

คอนโซล → Messaging API channel → แท็บ **Messaging API** → **Verify**

| ผลลัพธ์ | สาเหตุ |
|---|---|
| ✅ Success | ผ่าน ไปเช็คข้อ 2 |
| `404` | URL พิมพ์ผิด (ต้องลงท้าย `/api/line/webhook`) |
| `500` | ยังไม่ได้ตั้ง `LINE_CHANNEL_SECRET` หรือโค้ด error → ดู log ในเทอร์มินัล |
| `401` | ตั้ง `LINE_CHANNEL_SECRET` ผิดตัว (ระวังสับสนกับ Login channel secret) |
| เชื่อมต่อไม่ได้ | ngrok ไม่ได้รัน / `npm run dev` ไม่ได้รัน / URL เก่า |

### 2. สวิตช์ "Use webhook" เปิดหรือยัง

อยู่ใต้ช่อง Webhook URL — **ต้องเป็น On** ถึงจะมี event ส่งมา

### 3. ปิด Auto-reply แล้วหรือยัง

Official Account Manager → ตั้งค่าตอบกลับ:
- **Chat** = On
- **Greeting messages** = Off
- **Auto-response** = Off

ถ้าไม่ปิด LINE จะตอบข้อความอัตโนมัติแทนบอทเรา

### 4. เพิ่มเพื่อนบอทแล้วหรือยัง

สแกน QR จากแท็บ Messaging API → *Bot information*

### 5. ดู log ในเทอร์มินัล

หน้าต่างที่รัน `npm run dev` จะพิมพ์ error ออกมา
และหน้า http://localhost:3000/webhook จะแสดง event ที่เข้ามาแบบ real-time

---

## `Invalid signature` (401)

| สาเหตุ | วิธีแก้ |
|---|---|
| ใช้ channel secret ของ **LINE Login** แทน **Messaging API** | ทั้งสอง channel มี secret คนละตัว เช็คให้ดี |
| parse body ก่อนตรวจลายเซ็น | ต้องอ่าน `await request.text()` ก่อนเสมอ |
| มี middleware/proxy แก้ body ระหว่างทาง | ปิด body parser หรือ compression ที่แตะ request |
| copy secret มาไม่ครบ / ติดช่องว่าง | copy ใหม่ อย่าเว้นวรรค |

---

## `401 Invalid access token`

- Channel access token ผิดหรือหมดอายุ → กด **Issue** ใหม่ในแท็บ Messaging API
- ถ้าเคยกด Issue ซ้ำ ตัวเก่าจะใช้ไม่ได้ทันที — ต้องอัปเดตใน `.env.local` ด้วย
- ตรวจว่า **รีสตาร์ท** `npm run dev` แล้วหลังแก้ env

---

## `400 The property, 'to', in the request body is invalid`

- `userId` ต้องขึ้นต้นด้วย `U` และยาว 33 ตัวอักษร
- `groupId` ขึ้นต้นด้วย `C`, `roomId` ขึ้นต้นด้วย `R`
- **อย่าใช้ LINE ID ที่ขึ้นต้นด้วย `@`** — คนละอย่างกัน
- หา userId ของตัวเอง: พิมพ์ `id` ในแชทกับบอท

---

## `403 Forbidden` ตอน push message

- ผู้ใช้บล็อกบอทไปแล้ว
- `userId` มาจากคนละ provider (ดู `03-line-login.md` หัวข้อ userId)
- บัญชียังไม่ผ่านการยืนยัน สำหรับ API บางตัวที่ต้องใช้บัญชี verified

---

## `429 Too Many Requests` / โควตาหมด

- โควตาข้อความรายเดือนหมด — พิมพ์ `quota` ในแชทเพื่อดู
- **reply message ไม่นับโควตา** ถ้าไม่จำเป็นจริง ๆ ให้ใช้ reply แทน push
- โควตาจะรีเซ็ตต้นเดือนถัดไป

---

## รูปไม่ขึ้นในข้อความ

- URL ต้องเป็น **HTTPS** เท่านั้น
- ต้องเข้าถึงได้จากอินเทอร์เน็ต (localhost ไม่ได้ แม้จะเปิด ngrok ก็ต้องใช้ URL ngrok)
- ต้องเป็น JPEG หรือ PNG
- ขนาดไม่เกิน 10 MB, ความกว้าง/สูงไม่เกิน 4096 px

---

## Rich menu สร้างแล้วไม่โผล่

1. **ปิดแล้วเปิดห้องแชทใหม่** ในแอป LINE — เมนูไม่ refresh เอง
2. เช็คว่าตั้งเป็น default แล้ว: กด "ดูรายการที่มีอยู่" ที่หน้า `/messaging`
3. ขนาดรูปต้องตรงเป๊ะกับที่ประกาศใน `size` — ไม่งั้นอัปโหลดจะ error
4. ไฟล์ต้องไม่เกิน 1 MB

---

## LINE Login: `400 invalid_request`

| ข้อความย่อย | สาเหตุ |
|---|---|
| `redirect_uri` | Callback URL ในคอนโซลไม่ตรงกับที่ส่งไป — ต้องตรง **ทุกตัวอักษร** รวม http/https และไม่มี `/` ปิดท้าย |
| `invalid_grant` | `code` ถูกใช้ไปแล้ว (ใช้ได้ครั้งเดียว) หรือหมดอายุ — กดล็อกอินใหม่ |
| `invalid_client` | `client_id` / `client_secret` ผิด |
| `invalid_scope` | ขอ `email` โดยยังไม่ได้ยื่นอนุมัติในคอนโซล |

เช็คว่า `APP_BASE_URL` ตรงกับ URL ที่เปิดเบราว์เซอร์อยู่จริง —
ถ้าเปิดผ่าน ngrok แต่ `APP_BASE_URL` เป็น localhost จะไม่ตรงทันที

---

## `state ไม่ตรงกัน` ตอนล็อกอิน

cookie หายระหว่างทาง:

- ตรวจว่า `sameSite` เป็น `lax` ไม่ใช่ `strict` (`src/lib/session.ts`)
- เปิดเว็บผ่านโดเมนเดียวกับที่ตั้งใน `APP_BASE_URL` (อย่าสลับ localhost ↔ ngrok กลางคัน)
- cookie อายุ 10 นาที — ถ้าค้างหน้ายินยอมนานเกินไปจะหมดอายุ
- เบราว์เซอร์บล็อก third-party cookie แบบเข้มงวด → ลองโหมดปกติแทน incognito

---

## LIFF: หน้าขาว / `liff.init` พัง

- `NEXT_PUBLIC_LIFF_ID` ไม่ได้ตั้ง หรือใส่ผิด
- import `@line/liff` แบบปกติ → ต้อง dynamic import ใน `useEffect` เท่านั้น
- Endpoint URL ในคอนโซลไม่ตรงกับที่ deploy จริง
- ngrok URL เปลี่ยนแล้วแต่ยังไม่ได้อัปเดตในคอนโซล

---

## แก้โค้ดแล้วไม่มีอะไรเปลี่ยน

| กรณี | วิธีแก้ |
|---|---|
| แก้ `.env.local` | **ต้องรีสตาร์ท** `npm run dev` — Next.js อ่าน env ตอนบูตเท่านั้น |
| แก้หน้า LIFF | WebView ของ LINE cache ไว้ — ปิดหน้า LIFF แล้วเปิดใหม่ |
| ngrok restart | URL เปลี่ยน ต้องแก้ทั้ง `.env.local` และคอนโซล LINE |
| build cache แปลก ๆ | `Remove-Item -Recurse -Force .next` แล้วรันใหม่ |

---

## `Another next dev server is already running`

มี dev server ค้างอยู่จากรอบก่อน:

```powershell
# ดูว่าใครถือพอร์ต 3000
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess

# ปิด
taskkill /PID <เลข PID> /F
```

---

## เครื่องมือ debug ที่ควรรู้

| เครื่องมือ | ใช้ทำอะไร |
|---|---|
| หน้า `/webhook` ในโปรเจกต์นี้ | ดู event ดิบที่ LINE ส่งมา แบบ real-time |
| http://127.0.0.1:4040 | หน้า inspect ของ ngrok — เห็นทุก request พร้อม replay ได้ |
| [Flex Message Simulator](https://developers.line.biz/flex-simulator/) | ออกแบบ Flex ผ่าน GUI แล้วก๊อป JSON |
| [LIFF Inspector](https://github.com/line/liff-inspector) | debug หน้า LIFF ที่รันในมือถือ |
| [LINE Developers Community (TH)](https://www.facebook.com/groups/linedevth) | ถามคนไทยที่ทำ LINE API |

---

## เอกสารทางการ

- Messaging API: https://developers.line.biz/en/docs/messaging-api/
- API Reference: https://developers.line.biz/en/reference/messaging-api/
- LINE Login: https://developers.line.biz/en/docs/line-login/
- LIFF: https://developers.line.biz/en/docs/liff/
- Node SDK: https://github.com/line/line-bot-sdk-nodejs
