import Link from "next/link";
import { ClerkProvider, SignInButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { CommandPalette } from "@/components/ui/CommandPalette";
import "./globals.css";

export const metadata = {
  title: "CodeRev - CP Knowledge Tracker",
  description: "Personal LeetCode / Codeforces dashboard with drills and spaced repetition",
};

const nav = [
  { href: "/", label: "Home" },
  { href: "/problems", label: "Problems" },
  { href: "/problems/new", label: "Add Problem" },
  { href: "/tags", label: "Tags" },
  { href: "/drills", label: "Drills" },
  { href: "/docs/ai", label: "AI Roadmap" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen bg-zinc-50 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-bold tracking-tight">
              CodeRev
            </Link>
            <nav className="flex flex-wrap gap-4 text-sm">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-zinc-600 hover:text-indigo-600 dark:text-zinc-400"
                >
                  {item.label}
                </Link>
              ))}
              {userId ? (
                <UserButton />
              ) : (
                <SignInButton />
              )}
            </nav>
          </div>
        </header>
        <CommandPalette />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
    </ClerkProvider>
  );
}
