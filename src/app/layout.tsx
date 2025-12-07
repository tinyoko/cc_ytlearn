import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { SessionProvider } from "@/components/providers/session-provider";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-jp",
});

export const metadata: Metadata = {
  title: "YouTube Learning Companion",
  description:
    "YouTube動画のトランスクリプトを活用した最高の学習体験を実現するアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${notoSansJP.variable} antialiased`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
