import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "LINE API Playground",
  description: "โปรเจกต์สำหรับเรียนรู้ LINE Messaging API, LINE Login และ LIFF",
};

const NAV = [
  { href: "/setup", label: "ตั้งค่า" },
  { href: "/messaging", label: "Messaging API" },
  { href: "/playground", label: "ส่งข้อความ" },
  { href: "/webhook", label: "Webhook log" },
  { href: "/login", label: "LINE Login" },
  { href: "/liff", label: "LIFF" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-10 border-b border-edge bg-card/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="grid h-6 w-6 place-items-center rounded bg-line text-xs font-bold text-white">
                L
              </span>
              LINE API Playground
            </Link>
            <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-line">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>

        <footer className="mx-auto max-w-5xl px-5 pb-10 text-xs text-muted">
          โปรเจกต์เพื่อการเรียนรู้ · เอกสารทั้งหมดอยู่ในโฟลเดอร์{" "}
          <code className="rounded bg-edge/60 px-1">docs/</code>
        </footer>
      </body>
    </html>
  );
}
