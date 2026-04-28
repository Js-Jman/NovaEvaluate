import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ToastProvider from "@/components/ToastProvider";
import NavHeader from "@/components/NavHeader";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "NovaEvaluate — AI Worksheet Grader",
  description: "AI-powered scanned worksheet grading system. Upload answer keys, scan student sheets, and grade with AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col relative overflow-x-hidden">
        {/* Decorative gradient orbs for premium feel */}
        <div className="fixed w-[800px] h-[800px] -top-[400px] -right-[400px] rounded-full blur-[120px] opacity-20 pointer-events-none mix-blend-multiply bg-[radial-gradient(circle,#ec4899_0%,transparent_70%)]" />
        <div className="fixed w-[600px] h-[600px] top-[20%] -left-[300px] rounded-full blur-[100px] opacity-20 pointer-events-none mix-blend-multiply bg-[radial-gradient(circle,#3b82f6_0%,transparent_70%)]" />
        <div className="fixed w-[700px] h-[700px] -bottom-[300px] left-[20%] rounded-full blur-[120px] opacity-15 pointer-events-none mix-blend-multiply bg-[radial-gradient(circle,#8b5cf6_0%,transparent_70%)]" />

        <ToastProvider>
          <NavHeader />
          <main className="flex-1 flex flex-col relative z-10">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
