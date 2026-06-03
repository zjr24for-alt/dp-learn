import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { BackToTop } from "@/components/back-to-top";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE = {
  title: "DP Learn — Deep Potential 学习笔记",
  description: "DP-GEN / DeePMD / VASP / LAMMPS 学习辅助网站，整合个人实战笔记与官方文档，支持智能问答、论文检索与学习进度追踪",
  url: "https://dp-learn.vercel.app",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: `%s | ${SITE.title}`,
  },
  description: SITE.description,
  keywords: ["DP-GEN", "DeePMD", "Deep Potential", "VASP", "LAMMPS", "机器学习势函数", "分子动力学", "DFT", "计算材料学"],
  authors: [{ name: "dp-learn" }],
  openGraph: {
    type: "website",
    url: SITE.url,
    title: SITE.title,
    description: SITE.description,
    siteName: "DP Learn",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
  },
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
        <BackToTop />
        <footer className="border-t border-zinc-200 py-6 text-center text-sm text-zinc-500">
          <div className="max-w-6xl mx-auto px-4">
            DP Learn — Deep Potential / DeePMD / VASP / LAMMPS 学习笔记 · <a href="https://github.com/zjr24for-alt/dp-learn" className="hover:text-zinc-700 underline">GitHub</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
