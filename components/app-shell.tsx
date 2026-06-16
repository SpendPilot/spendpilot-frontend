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
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-white/95 p-5 shadow-2xl backdrop-blur-2xl dark:bg-slate-950/95">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.35em] text-sky-500">Spend Control</div>
                <div className="mt-2 font-display text-2xl text-slate-950 dark:text-white">Finance OS</div>
              </div>
              <button
                type="button"
                className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-[28px] bg-slate-950 p-5 text-white dark:bg-slate-900">
              <div className="text-sm text-sky-300">{profile.organization.name}</div>
              <div className="mt-2 font-medium">{profile.user.display_name}</div>
              <div className="text-sm text-slate-300">{profile.effective_role}</div>
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
                      "flex items-center justify-between rounded-2xl px-4 py-3 text-sm transition",
                      active
                        ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                        : "bg-slate-100/80 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
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
                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium dark:border-slate-800"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              >
                {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                Switch appearance
              </button>
              <button
                type="button"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white dark:bg-white dark:text-slate-950"
                onClick={() => void logout().then(() => router.push("/login"))}
              >
                Sign out
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1600px] gap-3 lg:min-h-[calc(100vh-2rem)] lg:gap-4 lg:grid-cols-[300px_1fr]">
        <aside className="panel hidden flex-col justify-between p-6 lg:flex">
          <div>
            <div className="rounded-3xl bg-slate-950 p-5 text-white dark:bg-slate-800">
              <div className="text-xs uppercase tracking-[0.35em] text-sky-300">Spend Control</div>
              <div className="mt-3 font-display text-2xl">Finance OS</div>
              <p className="mt-2 text-sm text-slate-300">
                Tenant-aware finance workflows with Entra ID, approvals, budgets, and AI-assisted invoice extraction.
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
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
                      active
                        ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="rounded-3xl border border-slate-200/80 p-4 dark:border-slate-800">
            <div className="text-sm text-slate-400">{profile.organization.name}</div>
            <div className="mt-1 font-medium">{profile.user.display_name}</div>
            <div className="text-sm text-slate-500">{profile.effective_role}</div>
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
                    className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700"
                    onClick={() => setMobileMenuOpen(true)}
                  >
                    <Menu className="h-4 w-4" />
                  </button>
                  <div className="rounded-full border border-sky-300/70 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-700 dark:border-sky-700 dark:text-sky-200">
                    {profile.organization.name}
                  </div>
                </div>
                <div className="mt-3 text-xs uppercase tracking-[0.3em] text-slate-400 lg:mt-0">Business finance control</div>
                <div className="mt-1 font-display text-xl sm:text-2xl">Spend Control Platform</div>
                <div className="mt-2 text-sm text-slate-500 dark:text-slate-400 lg:hidden">
                  {profile.user.display_name} - {profile.effective_role}
                </div>
              </div>
              <div className="hidden items-center gap-3 sm:flex">
                <button
                  className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700"
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                >
                  {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <button
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white dark:bg-white dark:text-slate-950"
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
                        ? "border-sky-500 bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                        : "border-slate-200 bg-white/80 text-slate-600 dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-300",
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
                className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              >
                {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white dark:bg-white dark:text-slate-950"
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
