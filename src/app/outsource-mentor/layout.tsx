import { Metadata } from "next";

export const metadata: Metadata = {
  title: "외주 리뷰",
  description:
    "다양한 외주 업체에 대한 솔직한 리뷰와 정보를 확인하세요. 오리(오늘의 리뷰) 외주 멘토 섹션입니다.",
  openGraph: {
    title: "외주 리뷰 | 오리(오늘의 리뷰)",
    description:
      "다양한 외주 업체에 대한 솔직한 리뷰와 정보를 확인하세요.",
    url: "https://reviewhub.life/outsource-mentor",
  },
};

export default function OutsourceMentorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
