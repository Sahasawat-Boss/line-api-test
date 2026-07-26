/**
 * รวมการอ่านค่า environment ไว้ที่เดียว
 *
 * แนวคิด: โปรเจกต์นี้เป็นโปรเจกต์เรียนรู้ เราจึง "ไม่" throw ตอนแอปบูต
 * เพราะอยากให้เปิดเว็บดูหน้า /setup ได้ก่อนแม้ยังไม่ได้ตั้งค่าอะไรเลย
 * แต่ตรงจุดที่ต้องเรียก LINE API จริง ๆ จะเรียก requireEnv() เพื่อให้ error ชัดเจน
 */

export const env = {
  // Messaging API channel
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",
  channelSecret: process.env.LINE_CHANNEL_SECRET ?? "",

  // LINE Login channel
  loginChannelId: process.env.LINE_LOGIN_CHANNEL_ID ?? "",
  loginChannelSecret: process.env.LINE_LOGIN_CHANNEL_SECRET ?? "",

  // LIFF (ฝั่ง browser อ่านผ่าน process.env.NEXT_PUBLIC_LIFF_ID โดยตรง)
  liffId: process.env.NEXT_PUBLIC_LIFF_ID ?? "",

  // อื่น ๆ
  appBaseUrl: (process.env.APP_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
  sessionSecret: process.env.SESSION_SECRET ?? "",
} as const;

type EnvKey = keyof typeof env;

/** ชื่อตัวแปรจริงใน .env.local สำหรับแสดงใน error message ให้ผู้เรียนตามได้ถูก */
const ENV_VAR_NAME: Record<EnvKey, string> = {
  channelAccessToken: "LINE_CHANNEL_ACCESS_TOKEN",
  channelSecret: "LINE_CHANNEL_SECRET",
  loginChannelId: "LINE_LOGIN_CHANNEL_ID",
  loginChannelSecret: "LINE_LOGIN_CHANNEL_SECRET",
  liffId: "NEXT_PUBLIC_LIFF_ID",
  appBaseUrl: "APP_BASE_URL",
  sessionSecret: "SESSION_SECRET",
};

/** อ่านค่า env ที่ "ต้องมี" — ถ้าไม่มีจะโยน error ที่บอกชื่อตัวแปรตรง ๆ */
export function requireEnv(key: EnvKey): string {
  const value = env[key];
  if (!value) {
    throw new Error(
      `ยังไม่ได้ตั้งค่า ${ENV_VAR_NAME[key]} ในไฟล์ .env.local — ดูวิธีหาค่าได้ที่ docs/01-setup.md`,
    );
  }
  return value;
}

/** สรุปสถานะการตั้งค่าไว้แสดงในหน้า /setup */
export function envStatus() {
  const groups = [
    {
      title: "Messaging API (บอทตอบข้อความ)",
      keys: ["channelAccessToken", "channelSecret"] as EnvKey[],
      enables: "webhook, reply/push/broadcast, rich menu",
    },
    {
      title: "LINE Login (เข้าสู่ระบบด้วย LINE)",
      keys: ["loginChannelId", "loginChannelSecret"] as EnvKey[],
      enables: "หน้า /login, /profile",
    },
    {
      title: "LIFF (เว็บแอปในแอป LINE)",
      keys: ["liffId"] as EnvKey[],
      enables: "หน้า /liff",
    },
    {
      title: "ทั่วไป",
      keys: ["appBaseUrl", "sessionSecret"] as EnvKey[],
      enables: "redirect_uri และ session cookie",
    },
  ];

  return groups.map((group) => ({
    ...group,
    items: group.keys.map((key) => ({
      name: ENV_VAR_NAME[key],
      ok: Boolean(env[key]),
    })),
    ready: group.keys.every((key) => Boolean(env[key])),
  }));
}
