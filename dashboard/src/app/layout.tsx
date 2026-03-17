import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavHeader } from "./NavHeader";
import { PwaProvider } from "./PwaProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Central Command - Claude Code",
  description: "Claude Code Agent Team Dashboard",
  manifest: "/manifest.json",
  themeColor: "#1a1a2e",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Central Command",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 dark:bg-gray-950`}
      >
        <div className="min-h-screen flex flex-col">
          <PwaProvider />
          <NavHeader />

          {/* Main Content */}
          <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
