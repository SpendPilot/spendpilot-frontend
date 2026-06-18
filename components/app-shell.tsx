"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot,
  BadgeIndianRupee,
  ChevronRight,
  FileScan,
  LayoutDashboard,
  Menu,
  Moon,
  ShieldAlert,
  SlidersHorizontal,
  ReceiptText,
  Settings2,
  Sun,
  X,
  WalletCards,
} from "lucide-react";
import { useTheme } from "next-themes";

import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { ready, token, profile, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (ready && !token) {
      router.push("/login");
    }
  }, [ready, token, router]);

  useEffect(() => {
    if (!ready || !token || !profile) return;
    const needsOnboarding = profile.effective_role === "employee" && !profile.membership.onboarding_completed;
    if (needsOnboarding && pathname !== "/onboarding") {
      router.push("/onboarding");
    }
    if (!needsOnboarding && pathname === "/onboarding") {
      router.push("/dashboard");
    }
  }, [pathname, profile, ready, router, token]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileMenuOpen]);

  if (
    !ready ||
    !token ||
    !profile ||
    (profile.effective_role === "employee" && !profile.membership.onboarding_completed)
  ) {
    return null;
  }

  const navigation =
    profile.effective_role === "org_owner"
      ? [
          { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { href: "/expenses", label: "Expenses", icon: ReceiptText },
          { href: "/spend-limits", label: "Spend Limits", icon: SlidersHorizontal },
          { href: "/payment-priority", label: "Payment Priority", icon: ShieldAlert },
          { href: "/ai-insights", label: "AI Insights", icon: Bot },
          { href: "/budgets", label: "Budgets", icon: WalletCards },
          { href: "/documents", label: "Bills Library", icon: FileScan },
          { href: "/settings", label: "Departments & Users", icon: Settings2 },
          { href: "/profile", label: "Profile", icon: BadgeIndianRupee },
        ]
      : profile.effective_role === "dept_head"
        ? [
            { href: "/dashboard", label: "Department Dashboard", icon: LayoutDashboard },
            { href: "/expenses", label: "Expense Upload & Review", icon: ReceiptText },
            { href: "/profile", label: "Department Profile", icon: Settings2 },
          ]
        : [
            { href: "/dashboard", label: "Department Budget", icon: LayoutDashboard },
            { href: "/expenses", label: "Upload Variable Expense", icon: ReceiptText },
            { href: "/profile", label: "Profile", icon: Settings2 },
          ];

  return (
    <div className="min-h-screen px-3 py-3 sm:px-4 sm:py-4 lg:px-6">
      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close navigation menu" className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-[rgba(var(--panel),0.98)] p-5 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="section-kicker text-[rgb(var(--primary))]">Spend Control</div>
                <div className="mt-2 font-display text-2xl tracking-tight">Finance workspace</div>
              </div>
              <button
                type="button"
                className="btn-secondary h-11 w-11 rounded-2xl px-0 py-0"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-[28px] bg-[rgb(var(--primary))] p-5 text-white shadow-[0_18px_40px_rgba(32,95,70,0.28)]">
              <div className="text-sm text-white/80">{profile.organization.name}</div>
              <div className="mt-2 font-medium">{profile.user.display_name}</div>
              <div className="text-sm text-white/72">{profile.effective_role}</div>
            </div>

            <nav className="mt-5 flex-1 space-y-2 overflow-y-auto pr-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between rounded-[22px] px-4 py-3 text-sm transition",
                      active
                        ? "bg-[rgb(var(--primary-soft))] text-[rgb(var(--primary-strong))]"
                        : "bg-[rgba(var(--panel-muted),0.72)] text-[rgb(var(--muted-strong))] hover:bg-[rgba(var(--panel-muted),0.96)]",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </span>
                    <ChevronRight className="h-4 w-4 opacity-70" />
                  </Link>
                );
              })}
            </nav>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              >
                {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                Switch appearance
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void logout().then(() => router.push("/login"))}
              >
                Sign out
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1600px] gap-3 lg:min-h-[calc(100vh-2rem)] lg:gap-4 lg:grid-cols-[312px_1fr]">
        <aside className="panel hidden flex-col justify-between p-6 lg:flex">
          <div>
            <div className="rounded-[30px] bg-[linear-gradient(180deg,rgba(32,95,70,1),rgba(18,72,51,1))] p-6 text-white shadow-[0_24px_48px_rgba(32,95,70,0.24)]">
              <div className="section-kicker text-white/65">Spend Control</div>
              <div className="mt-3 font-display text-[30px] tracking-tight">Finance workspace</div>
              <p className="mt-3 text-sm leading-6 text-white/72">
                Review spending activity, route approvals, monitor budgets, and keep the organization aligned on payment decisions.
              </p>
            </div>
            <nav className="mt-6 space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-[22px] px-4 py-3 text-sm transition",
                      active
                        ? "bg-[rgb(var(--primary-soft))] text-[rgb(var(--primary-strong))]"
                        : "text-[rgb(var(--muted-strong))] hover:bg-[rgba(var(--panel-muted),0.84)]",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="panel-soft p-4">
            <div className="text-sm text-[rgb(var(--muted))]">{profile.organization.name}</div>
            <div className="mt-1 font-medium">{profile.user.display_name}</div>
            <div className="text-sm text-[rgb(var(--muted-strong))]">{profile.effective_role}</div>
          </div>
        </aside>
        <div className="space-y-3 lg:space-y-4">
          <header className="panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 lg:hidden">
                  <button
                    type="button"
                    aria-label="Open navigation menu"
                    className="btn-secondary h-11 w-11 rounded-2xl px-0 py-0"
                    onClick={() => setMobileMenuOpen(true)}
                  >
                    <Menu className="h-4 w-4" />
                  </button>
                  <div className="badge-tonal">
                    {profile.organization.name}
                  </div>
                </div>
                <div className="section-kicker mt-3 lg:mt-0">Operational finance</div>
                <div className="mt-1 font-display text-xl tracking-tight sm:text-2xl">Spend Control</div>
                <div className="mt-2 text-sm text-[rgb(var(--muted-strong))] lg:hidden">
                  {profile.user.display_name} - {profile.effective_role}
                </div>
              </div>
              <div className="hidden items-center gap-3 sm:flex">
                <button
                  className="btn-secondary h-11 w-11 rounded-2xl px-0 py-0"
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                >
                  {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <button
                  className="btn-primary"
                  onClick={() => void logout().then(() => router.push("/login"))}
                >
                  Sign out
                </button>
              </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                      active
                        ? "border-[rgba(var(--primary),0.15)] bg-[rgb(var(--primary-soft))] text-[rgb(var(--primary-strong))]"
                        : "bg-[rgba(var(--panel),0.86)] text-[rgb(var(--muted-strong))]",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-3 sm:hidden">
              <button
                className="btn-secondary h-11 w-11 rounded-2xl px-0 py-0"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              >
                {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                className="btn-primary flex-1"
                onClick={() => void logout().then(() => router.push("/login"))}
              >
                Sign out
              </button>
            </div>
          </header>
          <main className="pb-4 sm:pb-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
