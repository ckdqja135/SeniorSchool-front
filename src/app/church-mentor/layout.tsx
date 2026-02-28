import { Metadata } from "next";

export const metadata: Metadata = {
  title: "교회 리뷰",
  description:
    "다양한 교회에 대한 솔직한 리뷰와 정보를 확인하세요. 오리(오늘의 리뷰) 교회 멘토 섹션입니다.",
  openGraph: {
    title: "교회 리뷰 | 오리(오늘의 리뷰)",
    description:
      "다양한 교회에 대한 솔직한 리뷰와 정보를 확인하세요.",
    url: "https://reviewhub.life/church-mentor",
  },
};

export default function ChurchMentorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
