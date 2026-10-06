/**
 * 디오라마 시각 시제품 페이지 (개발·검토용, 검색 엔진 제외).
 * 참고 시안과 도시 장면 품질을 비교하기 위한 화면이며 실데이터는 연동하지 않는다.
 */
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

export const metadata: Metadata = {
  title: '입체 동네 시제품 | 맛잘알',
  robots: { index: false, follow: false },
};

const DioramaLab = dynamic(() => import('@/components/feature/matzalAl/diorama/DioramaLab'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[100dvh] w-full items-center justify-center bg-[#cbb9ab]">
      <div className="rounded-full bg-white/90 px-4 py-2 text-sm text-gray-700 shadow">동네를 짓는 중…</div>
    </div>
  ),
});

export default function DioramaPage() {
  return <DioramaLab />;
}
