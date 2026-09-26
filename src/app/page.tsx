import { fetchRecentFreeboardPosts, fetchBestPosts } from '@/lib/freeboard/freeboardAPI';
import { getRecentOutsourceBoards } from '@/lib/outsource/outsourceAPI';
import { getRecentMatzalAlBoards } from '@/lib/matzalAl/matzalAlAPI';
import { fetchActiveServices } from '@/lib/services/serviceConfigAPI';
import HomeClient from './HomeClient';

export default async function HomePage() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  const [
    univResult,
    churchResult,
    companyResult,
    freeBoardResult,
    bestPostsResult,
    outsourceResult,
    matzalAlResult,
    servicesResult,
  ] = await Promise.allSettled([
    baseUrl
      ? fetch(`${baseUrl}/board/recent`, { next: { revalidate: 60 } }).then(r => r.json())
      : Promise.resolve({ status: 0, data: [] }),
    baseUrl
      ? fetch(`${baseUrl}/church/boards/recent`, { next: { revalidate: 60 } }).then(r => r.json())
      : Promise.resolve({ status: 0, data: [] }),
    baseUrl
      ? fetch(`${baseUrl}/comp/board/recent`, { next: { revalidate: 60 } }).then(r => r.json())
      : Promise.resolve({ status: 0, data: [] }),
    fetchRecentFreeboardPosts(),
    fetchBestPosts(),
    getRecentOutsourceBoards(),
    getRecentMatzalAlBoards(5),
    fetchActiveServices(),
  ]);

  // 대학 후기
  const univData = univResult.status === 'fulfilled' ? univResult.value : { status: 0, data: [] };
  const initialUnivPosts = univData.status === 200 && univData.data
    ? univData.data.map((item: any) => ({
        ...item,
        boardIdx: typeof item.boardIdx === 'string' ? parseInt(item.boardIdx) : item.boardIdx,
        univIdx: typeof item.univIdx === 'string' ? parseInt(item.univIdx) : item.univIdx,
        boardLike: typeof item.boardLike === 'string' ? parseInt(item.boardLike) : item.boardLike,
        boardHits: typeof item.boardHits === 'string' ? parseInt(item.boardHits) : item.boardHits,
        university: {
          univName: item.univName || '',
          univLocate: item.univLocate || '',
          univType: item.univType || '',
          univCampos: item.univCampos || '',
        },
      }))
    : [];

  // 교회 후기
  const churchData = churchResult.status === 'fulfilled' ? churchResult.value : { status: 0, data: [] };
  const initialChurchPosts = churchData.status === 200 && churchData.data ? churchData.data : [];

  // 회사 후기
  const companyData = companyResult.status === 'fulfilled' ? companyResult.value : { status: 0, data: [] };
  const initialCompanyPosts = companyData.status === 200 && companyData.data ? companyData.data : [];

  // 자유게시판
  const freeBoardData = freeBoardResult.status === 'fulfilled' ? freeBoardResult.value : null;
  const initialFreeBoardPosts = freeBoardData?.data ?? [];

  // 베스트 포스트 (중복 제거)
  const bestPostsData = bestPostsResult.status === 'fulfilled' ? bestPostsResult.value : null;
  const rawBestPosts = bestPostsData?.data ?? [];
  const initialBestPosts = rawBestPosts.filter((post: any, index: number, self: any[]) =>
    index === self.findIndex((p: any) => p.boardType === post.boardType && p.boardIdx === post.boardIdx)
  );

  // 외주 후기
  const outsourceData = outsourceResult.status === 'fulfilled' ? outsourceResult.value : null;
  const initialOutsourceBoards = outsourceData?.data ?? [];

  // 맛잘알 후기
  const initialMatzalAlBoards = matzalAlResult.status === 'fulfilled' ? matzalAlResult.value : [];

  // 동적 서비스
  const dynamicServices = servicesResult.status === 'fulfilled' ? servicesResult.value : [];

  return (
    <HomeClient
      initialUnivPosts={initialUnivPosts}
      initialChurchPosts={initialChurchPosts}
      initialCompanyPosts={initialCompanyPosts}
      initialFreeBoardPosts={initialFreeBoardPosts}
      initialBestPosts={initialBestPosts}
      initialOutsourceBoards={initialOutsourceBoards}
      initialMatzalAlBoards={initialMatzalAlBoards}
      dynamicServices={dynamicServices}
    />
  );
}
