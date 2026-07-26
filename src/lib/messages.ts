/**
 * แคตตาล็อกตัวอย่าง "ข้อความ" ทุกชนิดที่ Messaging API ส่งได้
 *
 * ไฟล์นี้ถูกใช้ 2 ที่:
 *   1) บอท (src/lib/bot.ts) — ผู้ใช้พิมพ์ชื่อ key เข้ามาในแชท แล้วบอทตอบตัวอย่างนั้น
 *   2) หน้า /playground — กดปุ่มเพื่อ push ตัวอย่างเดียวกันไปหาตัวเอง
 *
 * ทุกอย่างที่ส่งได้คือ object JSON ที่มี field `type` เสมอ
 * ส่งได้สูงสุด 5 ข้อความต่อ 1 ครั้งที่เรียก API
 * เอกสารเต็ม: https://developers.line.biz/en/reference/messaging-api/#message-objects
 */
import type { messagingApi } from "@line/bot-sdk";

type Message = messagingApi.Message;

// ---------------------------------------------------------------------------
// 1. Text — ข้อความธรรมดา (สูงสุด 5,000 ตัวอักษร)
// ---------------------------------------------------------------------------
export function textMessage(text: string): Message {
  return { type: "text", text };
}

/**
 * Text + emoji ของ LINE
 * ใส่ตัวยึดตำแหน่งเป็น "$" แล้วบอก index ว่าตัวไหนคือ emoji ตัวใด
 * รายการ emoji: https://developers.line.biz/en/docs/messaging-api/emoji-list/
 */
export function emojiMessage(): Message {
  return {
    type: "text",
    text: "$ สวัสดีจาก LINE Emoji $",
    emojis: [
      { index: 0, productId: "5ac1bfd5040ab15980c9b435", emojiId: "001" },
      { index: 22, productId: "5ac1bfd5040ab15980c9b435", emojiId: "002" },
    ],
  };
}

// ---------------------------------------------------------------------------
// 2. Sticker — ต้องใช้ packageId/stickerId ที่ LINE อนุญาต
//    รายการ: https://developers.line.biz/en/docs/messaging-api/sticker-list/
// ---------------------------------------------------------------------------
export function stickerMessage(): Message {
  return { type: "sticker", packageId: "446", stickerId: "1988" };
}

// ---------------------------------------------------------------------------
// 3. Image — ต้องเป็น URL แบบ HTTPS เท่านั้น (localhost ใช้ไม่ได้)
//    originalContentUrl = รูปเต็ม, previewImageUrl = รูปย่อในแชท
// ---------------------------------------------------------------------------
export function imageMessage(): Message {
  return {
    type: "image",
    originalContentUrl: "https://picsum.photos/id/1015/1024/768",
    previewImageUrl: "https://picsum.photos/id/1015/240/180",
  };
}

// ---------------------------------------------------------------------------
// 4. Video / Audio — ก็ใช้ URL แบบเดียวกัน (ต้อง HTTPS)
// ---------------------------------------------------------------------------
export function videoMessage(): Message {
  return {
    type: "video",
    originalContentUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    previewImageUrl: "https://picsum.photos/id/1043/240/180",
  };
}

// ---------------------------------------------------------------------------
// 5. Location — ปักหมุดแผนที่
// ---------------------------------------------------------------------------
export function locationMessage(): Message {
  return {
    type: "location",
    title: "LINE Thailand",
    address: "127 อาคารเกษร ทาวเวอร์ ถนนราชดำริ กรุงเทพฯ",
    latitude: 13.7455,
    longitude: 100.5399,
  };
}

// ---------------------------------------------------------------------------
// 6. Quick Reply — ปุ่มลอยเหนือแป้นพิมพ์ หายไปเมื่อกดหรือพิมพ์อย่างอื่น
//    แนบไปกับข้อความชนิดไหนก็ได้ ผ่าน field `quickReply` (สูงสุด 13 ปุ่ม)
// ---------------------------------------------------------------------------
export function quickReplyMessage(): Message {
  return {
    type: "text",
    text: "ลองกดปุ่มด้านล่างดูครับ — quick reply เหมาะกับให้ผู้ใช้เลือกแทนการพิมพ์",
    quickReply: {
      items: [
        {
          type: "action",
          imageUrl: "https://cdn-icons-png.flaticon.com/128/992/992651.png",
          // messageAction = กดแล้วส่งข้อความนั้นแทนผู้ใช้ (บอทเห็นเป็น message event)
          action: { type: "message", label: "ส่ง Flex", text: "flex" },
        },
        {
          type: "action",
          // postbackAction = กดแล้วส่ง data ลับหลัง ผู้ใช้ไม่เห็นข้อความในแชท
          action: { type: "postback", label: "Postback", data: "action=demo&value=42", displayText: "กดปุ่ม postback" },
        },
        {
          type: "action",
          // ขอตำแหน่งจากผู้ใช้ (เปิดหน้าเลือกสถานที่ของ LINE)
          action: { type: "location", label: "ส่งตำแหน่ง" },
        },
        {
          type: "action",
          // เปิดกล้อง / คลังรูป
          action: { type: "camera", label: "เปิดกล้อง" },
        },
        {
          type: "action",
          action: { type: "cameraRoll", label: "เลือกรูป" },
        },
        {
          type: "action",
          // ให้ผู้ใช้เลือกวันเวลา ค่าจะกลับมาใน postback event
          action: {
            type: "datetimepicker",
            label: "เลือกวันที่",
            data: "action=pickdate",
            mode: "datetime",
          },
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// 7. Template messages — เลย์เอาต์สำเร็จรูป ปรับแต่งได้น้อยแต่เขียนง่าย
// ---------------------------------------------------------------------------
export function buttonsTemplate(): Message {
  return {
    type: "template",
    // altText = ข้อความที่แสดงใน notification และบนอุปกรณ์ที่แสดง template ไม่ได้
    altText: "[Buttons template] เลือกเมนู",
    template: {
      type: "buttons",
      thumbnailImageUrl: "https://picsum.photos/id/1080/1024/1024",
      imageAspectRatio: "square",
      imageSize: "cover",
      title: "Buttons Template",
      text: "เลือกได้สูงสุด 4 ปุ่ม",
      actions: [
        { type: "message", label: "ตอบข้อความ", text: "hello" },
        { type: "postback", label: "ส่ง postback", data: "action=buy&item=101" },
        { type: "uri", label: "เปิดเว็บ", uri: "https://developers.line.biz/" },
      ],
    },
  };
}

export function confirmTemplate(): Message {
  return {
    type: "template",
    altText: "[Confirm template] ยืนยันไหม?",
    template: {
      type: "confirm",
      text: "ยืนยันการทำรายการหรือไม่?",
      actions: [
        { type: "postback", label: "ยืนยัน", data: "action=confirm&answer=yes", displayText: "ยืนยัน" },
        { type: "postback", label: "ยกเลิก", data: "action=confirm&answer=no", displayText: "ยกเลิก" },
      ],
    },
  };
}

export function carouselTemplate(): Message {
  return {
    type: "template",
    altText: "[Carousel template] สินค้าแนะนำ",
    template: {
      type: "carousel",
      columns: [1, 2, 3].map((n) => ({
        thumbnailImageUrl: `https://picsum.photos/id/${100 + n}/1024/678`,
        title: `สินค้าชิ้นที่ ${n}`,
        text: `รายละเอียดสินค้าชิ้นที่ ${n}`,
        actions: [
          { type: "postback", label: "หยิบใส่ตะกร้า", data: `action=add&item=${n}` },
          { type: "uri", label: "ดูรายละเอียด", uri: "https://developers.line.biz/" },
        ],
      })),
      imageAspectRatio: "rectangle",
      imageSize: "cover",
    },
  };
}

// ---------------------------------------------------------------------------
// 8. Flex Message — ยืดหยุ่นที่สุด เขียน layout เองด้วย box/text/image/button
//    โครงสร้าง: bubble (การ์ดเดียว) หรือ carousel (หลายการ์ดเลื่อนแนวนอน)
//    bubble มี 4 ส่วน: header / hero / body / footer
//    ออกแบบผ่าน GUI ได้ที่ Flex Message Simulator:
//    https://developers.line.biz/flex-simulator/
// ---------------------------------------------------------------------------
export function flexBubble(): Message {
  const bubble: messagingApi.FlexBubble = {
    type: "bubble",
    hero: {
      type: "image",
      url: "https://picsum.photos/id/292/1024/682",
      size: "full",
      aspectRatio: "20:13",
      aspectMode: "cover",
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        { type: "text", text: "Flex Message", weight: "bold", size: "xl" },
        {
          type: "box",
          layout: "baseline",
          spacing: "sm",
          contents: [
            // ไอคอนดาว 4 ดวง + ดาวเทา 1 ดวง = เรตติ้ง 4.0
            ...Array.from({ length: 4 }, () => ({
              type: "icon" as const,
              size: "sm" as const,
              url: "https://developers-resource.landpress.line.me/fx/img/review_gold_star_28.png",
            })),
            {
              type: "icon",
              size: "sm",
              url: "https://developers-resource.landpress.line.me/fx/img/review_gray_star_28.png",
            },
            { type: "text", text: "4.0", size: "sm", color: "#999999", margin: "md", flex: 0 },
          ],
        },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                { type: "text", text: "ที่อยู่", color: "#aaaaaa", size: "sm", flex: 2 },
                { type: "text", text: "กรุงเทพมหานคร", wrap: true, color: "#666666", size: "sm", flex: 5 },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                { type: "text", text: "เวลา", color: "#aaaaaa", size: "sm", flex: 2 },
                { type: "text", text: "10:00 - 22:00", wrap: true, color: "#666666", size: "sm", flex: 5 },
              ],
            },
          ],
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      flex: 0,
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#06C755", // สีเขียว LINE
          height: "sm",
          action: { type: "uri", label: "เปิดเอกสาร LINE", uri: "https://developers.line.biz/" },
        },
        {
          type: "button",
          style: "link",
          height: "sm",
          action: { type: "postback", label: "กดแล้วส่ง postback", data: "action=flex-demo" },
        },
      ],
    },
  };

  return { type: "flex", altText: "[Flex] การ์ดตัวอย่าง", contents: bubble };
}

export function flexCarousel(): Message {
  const bubbles: messagingApi.FlexBubble[] = ["Basic", "Standard", "Pro"].map((plan, i) => ({
    type: "bubble",
    size: "micro",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        { type: "text", text: plan, weight: "bold", size: "lg", color: "#06C755" },
        { type: "text", text: `${(i + 1) * 199} บาท/เดือน`, size: "sm", color: "#666666" },
        { type: "separator", margin: "md" },
        { type: "text", text: `ผู้ใช้ ${(i + 1) * 5} คน`, size: "xs", color: "#888888", margin: "md" },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#06C755",
          height: "sm",
          action: { type: "postback", label: "เลือก", data: `action=plan&name=${plan}` },
        },
      ],
    },
  }));

  const carousel: messagingApi.FlexCarousel = { type: "carousel", contents: bubbles };
  return { type: "flex", altText: "[Flex] แพ็กเกจ", contents: carousel };
}

// ---------------------------------------------------------------------------
// แคตตาล็อก: key → ตัวอย่าง (ใช้ทั้งในบอทและใน playground)
// ---------------------------------------------------------------------------
export type SampleKey =
  | "text"
  | "emoji"
  | "sticker"
  | "image"
  | "video"
  | "location"
  | "quickreply"
  | "buttons"
  | "confirm"
  | "carousel"
  | "flex"
  | "flexcarousel";

export const SAMPLES: Record<
  SampleKey,
  { label: string; description: string; build: () => Message }
> = {
  text: {
    label: "Text",
    description: "ข้อความธรรมดา — พื้นฐานที่สุด สูงสุด 5,000 ตัวอักษร",
    build: () => textMessage("สวัสดีครับ นี่คือข้อความแบบ text ธรรมดา"),
  },
  emoji: {
    label: "Text + Emoji",
    description: "แทรก LINE emoji ลงในข้อความด้วย index + productId",
    build: emojiMessage,
  },
  sticker: {
    label: "Sticker",
    description: "สติกเกอร์ ระบุด้วย packageId + stickerId",
    build: stickerMessage,
  },
  image: {
    label: "Image",
    description: "รูปภาพ ต้องเป็น URL แบบ HTTPS เท่านั้น",
    build: imageMessage,
  },
  video: {
    label: "Video",
    description: "วิดีโอ พร้อมรูป preview",
    build: videoMessage,
  },
  location: {
    label: "Location",
    description: "ปักหมุดแผนที่ ระบุ lat/lng",
    build: locationMessage,
  },
  quickreply: {
    label: "Quick Reply",
    description: "ปุ่มลอยเหนือคีย์บอร์ด — message / postback / location / camera / datetime",
    build: quickReplyMessage,
  },
  buttons: {
    label: "Buttons Template",
    description: "การ์ดสำเร็จรูป รูป + หัวข้อ + ปุ่มไม่เกิน 4",
    build: buttonsTemplate,
  },
  confirm: {
    label: "Confirm Template",
    description: "กล่องยืนยัน 2 ปุ่ม",
    build: confirmTemplate,
  },
  carousel: {
    label: "Carousel Template",
    description: "การ์ดเลื่อนแนวนอน สูงสุด 10 ใบ",
    build: carouselTemplate,
  },
  flex: {
    label: "Flex Bubble",
    description: "การ์ดที่ออกแบบ layout เองได้เต็มที่ (header/hero/body/footer)",
    build: flexBubble,
  },
  flexcarousel: {
    label: "Flex Carousel",
    description: "Flex หลายการ์ดเรียงแนวนอน",
    build: flexCarousel,
  },
};

export const SAMPLE_KEYS = Object.keys(SAMPLES) as SampleKey[];

export function isSampleKey(value: string): value is SampleKey {
  return value in SAMPLES;
}
