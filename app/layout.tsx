import type { Metadata } from "next";
import { Amiri } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"
const amiri = Amiri({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "عَون",
  description: "موقع للتلخيص وتوليد الاختبارات القصيره",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={amiri.variable}>
      <body className={`antialiased`}>
        {children}
        <Toaster dir="rtl" />
        <Analytics />
      </body>
    </html>
  );
}
