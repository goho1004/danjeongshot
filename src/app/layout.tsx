import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "증명사진 -단정- · 1분 완성",
  description:
    "셀카 한 장으로 1분 완성 단정 증명사진. 이력서·링크드인용 PNG와 인화 레이아웃. 과한 보정 없이, 올린 사진·결과물은 저장하지 않아요. 여권·관공서용은 아닙니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Noto+Sans+KR:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased text-ink-900">{children}</body>
    </html>
  );
}
