import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DP Learn — Deep Potential 学习笔记",
  description:
    "DP-GEN / DeePMD / VASP / LAMMPS 学习辅助网站，整合个人实战笔记与官方文档，支持智能问答与学习进度追踪",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-zinc-200 py-6 text-center text-sm text-zinc-500">
          <div className="max-w-6xl mx-auto px-4">
            DP Learn — 基于 DP-GEN + DeePMD + VASP + LAMMPS 的学习笔记 · 部署于 GitHub Pages
          </div>
        </footer>
      </body>
    </html>
  );
}
