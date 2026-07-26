/**
 * ตรรกะของบอท — รับ webhook event 1 อัน แล้วตัดสินใจว่าจะตอบอะไร
 *
 * LINE ส่ง event มาให้เราแบบ push (LINE เรียก URL ของเรา) ไม่ใช่ให้เรา poll
 * event ที่พบบ่อย:
 *   message      ผู้ใช้ส่งข้อความ/รูป/สติกเกอร์/ตำแหน่ง
 *   postback     ผู้ใช้กดปุ่มที่มี action แบบ postback
 *   follow       ผู้ใช้เพิ่มเพื่อน (หรือปลดบล็อก)
 *   unfollow     ผู้ใช้บล็อก/ลบเพื่อน  ← ไม่มี replyToken ตอบกลับไม่ได้
 *   join / leave บอทถูกเชิญเข้า/ออกจากกลุ่ม
 *
 * กติกาสำคัญของ replyToken:
 *   - ใช้ได้ครั้งเดียว
 *   - หมดอายุเร็ว (ประมาณ 1 นาที)
 *   - ตอบได้สูงสุด 5 ข้อความต่อ 1 reply
 *   - "ฟรี" ไม่นับโควตา ต่างจาก push message ที่นับ
 */
import type { messagingApi, webhook } from "@line/bot-sdk";
import { lineBlobClient, lineClient } from "./line";
import { logEvent } from "./event-log";
import { SAMPLES, SAMPLE_KEYS, isSampleKey, textMessage } from "./messages";

/** ดึง userId ออกจาก source (source เป็น user / group / room) */
export function sourceUserId(source: webhook.Source | undefined): string | undefined {
  if (!source) return undefined;
  if (source.type === "user") return source.userId;
  // ในกลุ่ม/ห้องแชท userId จะมีก็ต่อเมื่อผู้ใช้ยินยอมให้เข้าถึงข้อมูล
  return source.userId;
}

/** id ของ "ห้องสนทนา" ใช้ตอน push หรือสั่ง loading animation */
export function sourceChatId(source: webhook.Source | undefined): string | undefined {
  if (!source) return undefined;
  if (source.type === "group") return source.groupId;
  if (source.type === "room") return source.roomId;
  return source.userId;
}

/** ข้อความช่วยเหลือ — สร้างจากแคตตาล็อกตัวอย่าง จะได้ไม่ต้องแก้ 2 ที่ */
function helpText(): string {
  const samples = SAMPLE_KEYS.map((key) => `  ${key} — ${SAMPLES[key].description}`).join("\n");
  return [
    "📖 พิมพ์คำสั่งเหล่านี้เพื่อดูตัวอย่าง",
    "",
    "▸ ชนิดข้อความ (message types)",
    samples,
    "",
    "▸ เรียก API อื่น ๆ",
    "  me — ดูโปรไฟล์ตัวเองผ่าน Get profile API",
    "  id — ดู userId / groupId ของห้องนี้",
    "  quota — เช็กโควตาข้อความที่เหลือของเดือนนี้",
    "  loading — สั่งให้ขึ้นจุดไข่ปลา 'กำลังพิมพ์'",
    "  bot — ข้อมูลของบอทตัวนี้",
    "",
    "▸ อื่น ๆ",
    "  echo <ข้อความ> — ให้บอททวนคำ",
    "  help — แสดงเมนูนี้",
  ].join("\n");
}

/**
 * จัดการ 1 event
 * คืนค่าเป็น void — ถ้าเกิด error ให้ throw ออกไป แล้วให้ route จับ log ไว้
 * แต่ยังตอบ 200 กลับ LINE เสมอ (ดูคำอธิบายใน route)
 */
export async function handleEvent(event: webhook.Event): Promise<void> {
  switch (event.type) {
    case "message":
      return handleMessage(event as webhook.MessageEvent);
    case "postback":
      return handlePostback(event as webhook.PostbackEvent);
    case "follow":
      return handleFollow(event as webhook.FollowEvent);
    case "unfollow":
      // ไม่มี replyToken — ทำได้แค่บันทึกไว้ (ของจริงมักใช้ mark ผู้ใช้ว่า inactive)
      logEvent({ type: "unfollow", summary: "ผู้ใช้บล็อกหรือลบบอท", raw: event });
      return;
    case "join":
      return replyText(event as webhook.JoinEvent, "ขอบคุณที่เชิญเข้ากลุ่มครับ พิมพ์ help เพื่อดูคำสั่ง");
    case "leave":
      logEvent({ type: "leave", summary: "บอทถูกเตะออกจากกลุ่ม", raw: event });
      return;
    case "memberJoined":
      return replyText(event as webhook.MemberJoinedEvent, "ยินดีต้อนรับสมาชิกใหม่ 👋");
    default:
      logEvent({ type: event.type, summary: `event ชนิด ${event.type} (ยังไม่ได้เขียน handler)`, raw: event });
      return;
  }
}

// ---------------------------------------------------------------------------
// message event
// ---------------------------------------------------------------------------
async function handleMessage(event: webhook.MessageEvent): Promise<void> {
  const message = event.message;

  switch (message.type) {
    case "text":
      return handleText(event, message.text);

    case "sticker": {
      const sticker = message as webhook.StickerMessageContent;
      logEvent({ type: "message.sticker", summary: `สติกเกอร์ ${sticker.packageId}/${sticker.stickerId}`, raw: event });
      return replyText(
        event,
        `ได้รับสติกเกอร์แล้ว\npackageId: ${sticker.packageId}\nstickerId: ${sticker.stickerId}\n` +
          `keywords: ${(sticker.keywords ?? []).join(", ") || "-"}`,
      );
    }

    case "location": {
      const loc = message as webhook.LocationMessageContent;
      logEvent({ type: "message.location", summary: `ตำแหน่ง ${loc.latitude}, ${loc.longitude}`, raw: event });
      return replyText(
        event,
        `ได้รับตำแหน่ง\nชื่อ: ${loc.title ?? "-"}\nที่อยู่: ${loc.address ?? "-"}\npos: ${loc.latitude}, ${loc.longitude}`,
      );
    }

    case "image":
    case "video":
    case "audio":
    case "file": {
      logEvent({ type: `message.${message.type}`, summary: `ได้รับไฟล์ชนิด ${message.type}`, raw: event });
      // ไฟล์ที่ผู้ใช้ส่งมา ต้องไปดาวน์โหลดจาก api-data.line.me ด้วย messageId
      // (ตัวไฟล์อยู่บน server ของ LINE ประมาณ 1 สัปดาห์)
      const size = await tryGetContentSize(message.id);
      return replyText(
        event,
        `ได้รับ ${message.type} แล้ว\nmessageId: ${message.id}\n` +
          (size === null
            ? "ดาวน์โหลดไฟล์ไม่สำเร็จ (ดู log ฝั่ง server)"
            : `ขนาดไฟล์: ${(size / 1024).toFixed(1)} KB\n\nโค้ดที่ใช้ดึงไฟล์อยู่ที่ src/lib/bot.ts → tryGetContentSize()`),
      );
    }

    default: {
      // ชนิดที่เหลือ (เช่น text ที่ถูกแยกไปข้างบนแล้ว) — TypeScript narrow เป็น never ที่นี่
      // จึงต้อง cast กลับเพื่ออ่าน .type สำหรับ log
      const other = message as webhook.MessageContent;
      logEvent({ type: `message.${other.type}`, summary: `ข้อความชนิด ${other.type}`, raw: event });
      return replyText(event, `ได้รับข้อความชนิด "${other.type}" แล้วครับ`);
    }
  }
}

// ---------------------------------------------------------------------------
// router ของคำสั่งที่เป็นข้อความ
// ---------------------------------------------------------------------------
async function handleText(event: webhook.MessageEvent, text: string): Promise<void> {
  const raw = text.trim();
  const command = raw.toLowerCase();
  logEvent({ type: "message.text", summary: `ข้อความ: "${raw}"`, raw: event });

  const client = lineClient();
  const replyToken = event.replyToken;
  if (!replyToken) return;

  // 1) คำสั่ง help
  if (["help", "เมนู", "menu", "?", "help me"].includes(command)) {
    await client.replyMessage({ replyToken, messages: [textMessage(helpText())] });
    return;
  }

  // 2) ชื่อของตัวอย่างข้อความ → ส่งตัวอย่างนั้นกลับไป
  if (isSampleKey(command)) {
    await client.replyMessage({
      replyToken,
      messages: [
        textMessage(`ตัวอย่าง "${SAMPLES[command].label}" — ${SAMPLES[command].description}`),
        SAMPLES[command].build(),
      ],
    });
    return;
  }

  // 3) เรียก API อื่น ๆ ของ Messaging API
  if (command === "me") {
    const userId = sourceUserId(event.source);
    if (!userId) {
      await client.replyMessage({ replyToken, messages: [textMessage("ดึง userId ไม่ได้จากห้องนี้")] });
      return;
    }
    const profile = await client.getProfile(userId);
    const messages: messagingApi.Message[] = [
      textMessage(
        `โปรไฟล์ของคุณ\nชื่อ: ${profile.displayName}\nuserId: ${profile.userId}\n` +
          `สเตตัส: ${profile.statusMessage ?? "-"}\nภาษา: ${profile.language ?? "-"}`,
      ),
    ];
    // รูปโปรไฟล์อาจไม่มี ถ้าผู้ใช้ไม่ได้ตั้งไว้
    if (profile.pictureUrl) {
      messages.push({
        type: "image",
        originalContentUrl: profile.pictureUrl,
        previewImageUrl: profile.pictureUrl,
      });
    }
    await client.replyMessage({ replyToken, messages });
    return;
  }

  if (command === "id") {
    const source = event.source;
    await client.replyMessage({
      replyToken,
      messages: [
        textMessage(
          `source.type: ${source?.type ?? "-"}\n` +
            `userId: ${sourceUserId(source) ?? "-"}\n` +
            `chatId (ใช้ push): ${sourceChatId(source) ?? "-"}\n\n` +
            `เอา userId ไปใส่ในหน้า /playground เพื่อทดลอง push message ได้เลย`,
        ),
      ],
    });
    return;
  }

  if (command === "quota") {
    // โควตาข้อความ push ของบัญชีฟรี — reply message ไม่นับโควตา
    const [quota, consumption] = await Promise.all([
      client.getMessageQuota(),
      client.getMessageQuotaConsumption(),
    ]);
    await client.replyMessage({
      replyToken,
      messages: [
        textMessage(
          `โควตาข้อความเดือนนี้\nชนิด: ${quota.type}\n` +
            `โควตา: ${quota.value ?? "ไม่จำกัด"}\nใช้ไปแล้ว: ${consumption.totalUsage}\n\n` +
            `หมายเหตุ: reply message ไม่นับโควตา แต่ push/multicast/broadcast นับ`,
        ),
      ],
    });
    return;
  }

  if (command === "bot") {
    const info = await client.getBotInfo();
    await client.replyMessage({
      replyToken,
      messages: [
        textMessage(
          `ข้อมูลบอท\nชื่อ: ${info.displayName}\nbasicId: ${info.basicId}\n` +
            `userId: ${info.userId}\nchatMode: ${info.chatMode}\nmarkAsReadMode: ${info.markAsReadMode}`,
        ),
      ],
    });
    return;
  }

  if (command === "loading") {
    const chatId = sourceChatId(event.source);
    if (chatId) {
      // แสดงจุดไข่ปลา "กำลังพิมพ์" ใช้ได้เฉพาะแชท 1:1 เท่านั้น
      await client.showLoadingAnimation({ chatId, loadingSeconds: 5 });
    }
    await client.replyMessage({
      replyToken,
      messages: [textMessage("สั่ง loading animation แล้ว (ใช้ได้เฉพาะแชท 1:1)")],
    });
    return;
  }

  // 4) echo <ข้อความ>
  if (command.startsWith("echo ")) {
    await client.replyMessage({ replyToken, messages: [textMessage(raw.slice(5))] });
    return;
  }

  // 5) ไม่ตรงคำสั่งไหนเลย → ทวนคำ + ใบ้ว่ามี help
  await client.replyMessage({
    replyToken,
    messages: [
      {
        type: "text",
        text: `คุณพิมพ์ว่า: "${raw}"`,
        quickReply: {
          items: [
            { type: "action", action: { type: "message", label: "ดูคำสั่งทั้งหมด", text: "help" } },
            { type: "action", action: { type: "message", label: "ลอง Flex", text: "flex" } },
            { type: "action", action: { type: "message", label: "โปรไฟล์ฉัน", text: "me" } },
          ],
        },
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// postback event — เกิดจากการกดปุ่มที่ action.type === "postback"
// ---------------------------------------------------------------------------
async function handlePostback(event: webhook.PostbackEvent): Promise<void> {
  const data = event.postback.data;
  // data เป็น string อะไรก็ได้ นิยมเขียนเป็น query string แล้ว parse
  const params = new URLSearchParams(data);
  logEvent({ type: "postback", summary: `postback data="${data}"`, raw: event });

  // ถ้าเป็น datetimepicker จะมี params.datetime / date / time มาด้วย
  const picked = event.postback.params;
  const pickedText = picked ? `\nค่าที่เลือก: ${JSON.stringify(picked)}` : "";

  await replyText(
    event,
    `ได้รับ postback\ndata ดิบ: ${data}\n` +
      `แตกเป็น key/value: ${JSON.stringify(Object.fromEntries(params))}${pickedText}\n\n` +
      `ข้อดีของ postback คือผู้ใช้ไม่เห็นข้อมูลนี้ในแชท เหมาะกับส่ง id ของสินค้า/คำสั่ง`,
  );
}

// ---------------------------------------------------------------------------
// follow event — ผู้ใช้เพิ่มเพื่อน
// ---------------------------------------------------------------------------
async function handleFollow(event: webhook.FollowEvent): Promise<void> {
  logEvent({ type: "follow", summary: "มีผู้ใช้เพิ่มเพื่อน", raw: event });
  const userId = sourceUserId(event.source);
  const client = lineClient();

  let name = "คุณ";
  if (userId) {
    try {
      name = (await client.getProfile(userId)).displayName;
    } catch {
      // ผู้ใช้อาจปิดการเข้าถึงโปรไฟล์ — ไม่ใช่เรื่องผิดปกติ
    }
  }

  if (!event.replyToken) return;
  await client.replyMessage({
    replyToken: event.replyToken,
    messages: [
      textMessage(`สวัสดีครับ ${name} 👋\nนี่คือบอทสำหรับเรียนรู้ LINE Messaging API\n\nพิมพ์ "help" เพื่อดูคำสั่งทั้งหมด`),
      SAMPLES.quickreply.build(),
    ],
  });
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
async function replyText(event: webhook.Event & { replyToken?: string }, text: string) {
  if (!event.replyToken) return;
  await lineClient().replyMessage({ replyToken: event.replyToken, messages: [textMessage(text)] });
}

/**
 * ดาวน์โหลดไฟล์ที่ผู้ใช้ส่งมา แล้วคืนขนาดเป็น byte
 * ของจริงคุณคงเอา buffer นี้ไปอัปโหลดขึ้น S3 / ส่งเข้าโมเดล AI ต่อ
 */
async function tryGetContentSize(messageId: string): Promise<number | null> {
  try {
    const stream = await lineBlobClient().getMessageContent(messageId);
    let size = 0;
    for await (const chunk of stream) {
      size += (chunk as Buffer).length;
    }
    return size;
  } catch (error) {
    console.error("[bot] ดาวน์โหลด content ไม่สำเร็จ:", error);
    return null;
  }
}
