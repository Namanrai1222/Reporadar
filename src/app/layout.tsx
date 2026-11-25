import type { Metadata } from "next";
import { connection } from "next/server";
import { Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SessionBoot } from "@/components/auth/SessionBoot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "RepoRadar | AI-Powered GitHub Repository Intelligence and Security Analysis",
    template: "%s | RepoRadar",
  },
  description:
    "Repository X-ray platform for deterministic GitHub analysis, security findings, architecture maps, and grounded LLM synthesis.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Render per request: the CSP nonce only exists at request time, and a
  // prerendered page would ship nonce-less scripts that the CSP blocks.
  await connection();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-text-strong">
        <SessionBoot />
        {children}
      </body>
    </html>
  );
}
