import { Metadata } from "next";

export const metadata: Metadata = {
  title: "맛잘알 리뷰",
  description:
    "맛집에 대한 솔직한 리뷰와 정보를 확인하세요. 오리(오빠의 리뷰) 맛잘알 섹션입니다.",
  openGraph: {
    title: "맛잘알 리뷰 | 오리(오빠의 리뷰)",
    description:
      "맛집에 대한 솔직한 리뷰와 정보를 확인하세요.",
    url: "https://reviewhub.life/matzal-al-mentor",
  },
};

export default function MatzalAlMentorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
