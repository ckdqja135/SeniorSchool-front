import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://reviewhub.life"),
  title: {
    default: "오리(오늘의 리뷰) - 교회·기업·대학교·외주·맛집 리뷰 플랫폼",
    template: "%s | 오리(오늘의 리뷰)",
  },
  description:
    "교회, 기업, 대학교, 외주, 맛집 등 다양한 분야의 솔직한 리뷰를 공유하는 커뮤니티 플랫폼입니다. 오늘의 리뷰를 확인하세요.",
  keywords: [
    "리뷰",
    "교회 리뷰",
    "기업 리뷰",
    "대학교 리뷰",
    "외주 리뷰",
    "맛집 리뷰",
    "오늘의 리뷰",
    "오리",
    "커뮤니티",
  ],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://reviewhub.life",
    siteName: "오리(오늘의 리뷰)",
    title: "오리(오늘의 리뷰) - 교회·기업·대학교·외주·맛집 리뷰 플랫폼",
    description:
      "교회, 기업, 대학교, 외주, 맛집 등 다양한 분야의 솔직한 리뷰를 공유하는 커뮤니티 플랫폼입니다.",
  },
  twitter: {
    card: "summary_large_image",
    title: "오리(오늘의 리뷰) - 리뷰 플랫폼",
    description:
      "교회, 기업, 대학교, 외주, 맛집 등 다양한 분야의 솔직한 리뷰를 공유하는 커뮤니티 플랫폼입니다.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://reviewhub.life",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "오리(오늘의 리뷰)",
        url: "https://reviewhub.life",
        description:
          "교회, 기업, 대학교, 외주, 맛집 등 다양한 분야의 솔직한 리뷰를 공유하는 커뮤니티 플랫폼",
        inLanguage: "ko-KR",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate:
              "https://reviewhub.life/search?q={search_term_string}",
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        name: "오리(오늘의 리뷰)",
        url: "https://reviewhub.life",
      },
    ],
  };

  return (
    <html lang="ko">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Google Fonts - Black Han Sans */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
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
      <body>{children}</body>
    </html>
  );
}
