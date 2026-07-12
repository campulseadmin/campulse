"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { SignOutButton } from "@/app/dashboard/signout";

interface Me { displayName: string; username: string | null; initial: string; }

const TABS = [
  { key: "users", label: "Users", href: "/admin" },
  { key: "reports", label: "Reports", href: "/admin?tab=reports" },
  { key: "events", label: "Events", href: "/admin?tab=events" },
  { key: "requests", label: "Admin Requests", href: "/admin?tab=requests" },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const pathname = usePathname();
  const params = useSearchParams();
  const active = params.get("tab") || "users";

  useEffect(() => {
    fetch("/api/sidebar").then((r) => r.json()).then((d) => {
      if (d.me) setMe(d.me);
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--fg)" }}>
      {/* Admin top bar — distinct portal chrome, not the user app nav */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-4 h-14"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center">
            <BrandLogo height={24} />
          </Link>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            ADMIN PORTAL
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-[13px] hover:underline" style={{ color: "var(--muted)" }}>
            ← Back to app
          </Link>
          <div className="tw-avatar" style={{ background: "var(--accent)", width: 32, height: 32, fontSize: 13 }}>
            {me ? me.initial : "?"}
          </div>
          <SignOutButton />
        </div>
      </header>

      {/* Tab strip */}
      <nav className="flex gap-1 px-4 border-b" style={{ borderColor: "var(--border)" }}>
        {TABS.map((t) => {
          const isActive = t.key === active;
          return (
            <Link
              key={t.key}
              href={t.href}
              className="px-4 py-3 text-[15px] font-semibold relative"
              style={{ color: isActive ? "var(--fg)" : "var(--muted)" }}
            >
              {t.label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2"
                  style={{ width: 40, height: 3, background: "var(--accent)", borderRadius: 9999 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <main className="max-w-3xl mx-auto w-full p-4 pb-20">{children}</main>
    </div>
  );
}
