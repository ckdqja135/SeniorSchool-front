import { Metadata } from "next";

export const metadata: Metadata = {
  title: "대학교 리뷰",
  description:
    "다양한 대학교에 대한 솔직한 리뷰와 정보를 확인하세요. 오리(오빠의 리뷰) 대학교 멘토 섹션입니다.",
  openGraph: {
    title: "대학교 리뷰 | 오리(오빠의 리뷰)",
    description:
      "다양한 대학교에 대한 솔직한 리뷰와 정보를 확인하세요.",
    url: "https://ori.blue/univ-mentor",
  },
  alternates: {
    canonical: "https://ori.blue/univ-mentor",
  },
};

export default function UnivMentorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
