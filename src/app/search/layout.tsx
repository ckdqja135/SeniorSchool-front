import { Metadata } from "next";

export const metadata: Metadata = {
  title: "검색",
  description:
    "교회, 기업, 대학교, 외주, 맛집 리뷰를 검색하세요. 오리(오빠의 리뷰) 통합 검색입니다.",
  openGraph: {
    title: "검색 | 오리(오빠의 리뷰)",
    description:
      "교회, 기업, 대학교, 외주, 맛집 리뷰를 검색하세요.",
    url: "https://reviewhub.life/search",
  },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
