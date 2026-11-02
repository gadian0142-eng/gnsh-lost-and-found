import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "찾음 | 경남과학고 분실물 게시판",
  description: "경남과학고등학교 학생과 교사가 교내 습득물과 보관 장소를 공유하는 게시판",
  icons: {icon:"/favicon.svg"},
};
export default function RootLayout({children}: Readonly<{children:React.ReactNode}>) {
  return <html lang="ko"><body>{children}</body></html>;
}
