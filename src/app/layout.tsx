import "@/styles/globals.css";
import localFont from "next/font/local";

const pretendard = localFont({
  src: './fonts/PretendardVariable.woff2',
  weight: '45 920',
  style: 'normal',
  display: 'swap',
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${pretendard.className} antialisaed`}>
      <body
      >
        {children}
      </body>
    </html>
  );
}
