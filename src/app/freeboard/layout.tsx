import { Metadata } from "next";

export const metadata: Metadata = {
  title: "자유게시판",
  description:
    "자유롭게 의견을 나누고 소통하는 오리(오빠의 리뷰) 자유게시판입니다.",
  openGraph: {
    title: "자유게시판 | 오리(오빠의 리뷰)",
    description:
      "자유롭게 의견을 나누고 소통하는 오리(오빠의 리뷰) 자유게시판입니다.",
    url: "https://reviewhub.life/freeboard", 
  },
};

export default function FreeboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
