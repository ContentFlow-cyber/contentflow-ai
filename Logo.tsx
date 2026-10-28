import Link from "next/link";

export function Logo({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2 font-bold tracking-tight ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mark.png" alt="" width={32} height={32} className="h-8 w-8 rounded-lg shadow-[0_0_14px_rgb(var(--brand)/0.6)] transition hover:shadow-[0_0_22px_rgb(var(--brand2)/0.9)]" />
      <span>
        ContentFlow <span className="text-brand">AI</span>
      </span>
    </Link>
  );
}
