import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "대학 오빠 - 세상 모든 대학교 정보",
  description: "세상 모든 대학교 정보, 학교선배가 알려줄게",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* Google Fonts - Black Han Sans */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&display=swap" 
          rel="stylesheet" 
        />
        
        {/* Font Awesome */}
        <link 
          rel="stylesheet" 
          href="https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css" 
          integrity="sha384-wvfXpqpZZVQGK6TAh5PVlGOfQNHSoD2xbE+QkPxCAFlNEevoEH3Sl0sibVcOQVnN" 
          crossOrigin="anonymous" 
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
