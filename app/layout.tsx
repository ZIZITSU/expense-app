import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simple Expenses — Your personal ledger",
  description: "Income, expenses, account balances and debts in one simple workspace.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
