import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "THE SYSTEM — Hunter Discipline Interface",
  description:
    "A Solo Leveling inspired consistency enforcement system: daily logs, XP, ranks, punishment mode and AI photo verification.",
};

export const viewport: Viewport = {
  themeColor: "#01030a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Rajdhani:wght@500;600;700&family=Share+Tech+Mono&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-void text-sys-soft antialiased">
        <div className="system-bg" />
        <div className="system-grid" />
        <div className="scanlines" />
        <div className="vignette" />
        {children}
      </body>
    </html>
  );
}
