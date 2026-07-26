/**
 * ชิ้นส่วน UI เล็ก ๆ ที่ใช้ซ้ำหลายหน้า
 * ไม่มีอะไรเกี่ยวกับ LINE — แค่ทำให้หน้าเว็บอ่านง่ายขึ้น
 */
import type { ReactNode } from "react";

export function Card({
  title,
  subtitle,
  children,
  action,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-edge bg-card p-5 shadow-sm">
      {(title || action) && (
        <header className="mb-3 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Badge({ ok, children }: { ok?: boolean; children: ReactNode }) {
  const tone = ok === undefined
    ? "bg-edge text-muted"
    : ok
      ? "bg-line/15 text-line"
      : "bg-red-500/15 text-red-500";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>{children}</span>;
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-edge/60 px-1.5 py-0.5 text-[0.85em] break-all">{children}</code>
  );
}

export function Pre({ children }: { children: ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-edge bg-black/85 p-3 text-xs leading-relaxed text-green-200">
      {children}
    </pre>
  );
}

export function Note({ tone = "info", children }: { tone?: "info" | "warn"; children: ReactNode }) {
  const styles =
    tone === "warn"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  return <div className={`rounded-lg border px-4 py-3 text-sm ${styles}`}>{children}</div>;
}
