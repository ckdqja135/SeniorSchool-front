import { notFound } from 'next/navigation';
import Link from 'next/link';
import { DevVendor, BaseVendor, VendorCategory } from '@/types/vendor';
import GovSupportBadge from '@/components/outsource/GovSupportBadge';
import TeamSummaryInline from '@/components/outsource/TeamSummaryInline';

interface VendorDetailPageProps {
    params: {
        id: string;
    };
}

// Mock 데이터 가져오기 함수 (실제로는 API 호출)
async function getVendor(id: string): Promise<DevVendor | BaseVendor | null> {
    // TODO: 실제 API 호출로 교체
    // const response = await fetch(`https://api.example.com/vendors/${id}`);
    // if (!response.ok) return null;
    // return response.json();

    // Mock 데이터
    const mockVendor: DevVendor = {
        id: '1',
        name: '코드몽키랩',
        tagline: '스타트업 특화 웹/앱 개발 전문 팀',
        category: VendorCategory.DEVELOPMENT,
        description: '10년차 시니어 개발자들이 직접 참여하는 풀스택 개발 팀입니다. B2B SaaS, 핀테크, 헬스케어 도메인에 특화되어 있으며, Next.js + TypeScript 기반의 현대적인 웹 애플리케이션 개발을 주로 수행합니다.',
        minBudget: 3000000,
        avgBudget: 5000000,
        maxBudget: 20000000,
        avgBudgetRange: 'RANGE_5_10' as any,
        mainPortfolioUrl: 'https://notion.so/portfolio',
        websiteUrl: 'https://codemonkeylab.com',
        region: '서울 강남',
        timezone: 'Asia/Seoul',
        contactEmail: 'hello@codemonkeylab.com',
        contactChannel: '카카오톡 채널 @codemonkey',
        isPublic: true,
        team: {
            frontend: 3,
            backend: 2,
            ai: 1,
            mobile: 0,
            designer: 1,
            pm: 1,
            devops: 1,
            qa: 0,
            etc: 0,
            total: 9,
        },
        govSupport: {
            hasGovSupportExperience: true,
            govSupportPrograms: ['TIPS', '창업도약패키지', 'K-Startup 바우처'],
            govSupportTotalCount: 5,
            govSupportRecentYear: 2024,
            govSupportMainTitle: 'AI 기반 물류 최적화 플랫폼 고도화 사업',
            govSupportLinks: ['https://www.k-startup.go.kr/'],
            govSupportSummary: 'TIPS 및 창업도약패키지 과제를 다수 수행한 경험이 있습니다.',
        },
        devInfo: {
            techStackSummary: ['React', 'Next.js', 'Node.js', 'AWS', 'TypeScript'],
            frontendStacks: ['React', 'Next.js', 'Vue.js', 'Svelte'],
            backendStacks: ['Node.js', 'Express', 'NestJS', 'PostgreSQL'],
            aiStacks: ['PyTorch', 'TensorFlow'],
            mobileStacks: ['React Native'],
            infraStacks: ['AWS', 'Docker', 'Kubernetes', 'Vercel'],
            devTags: ['SaaS', 'Fintech', 'B2B', '스타트업 특화'],
            repoUrls: ['https://github.com/codemonkeylab/project1'],
            githubAccount: 'github.com/codemonkeylab',
            avgDevExperienceYears: 7,
            devProjectTypes: ['MVP 개발', '관리자 대시보드', '사내툴 개발'],
            devPreferenceNote: 'Next.js + TypeScript 기반의 B2B SaaS를 선호합니다.',
        },
    };

    return mockVendor;
}

export default async function VendorDetailPage({ params }: VendorDetailPageProps) {
    const vendor = await getVendor(params.id);

    if (!vendor) {
        notFound();
    }

    const isDev = vendor.category === VendorCategory.DEVELOPMENT;
    const devVendor = isDev ? (vendor as DevVendor) : null;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 헤더 */}
            <div className="bg-white border-b">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Link
                        href="/outsource-mentor"
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
                    >
                        ← 목록으로 돌아가기
                    </Link>

                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">
                                {vendor.name}
                            </h1>
                            <p className="text-xl text-gray-600 mb-4">{vendor.tagline}</p>
                        </div>
                        {!vendor.isPublic && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-sm">
                                비공개
                            </span>
                        )}
                    </div>

                    {/* 배지 영역 */}
                    <div className="flex items-center gap-3 mt-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                            {vendor.category}
                        </span>
                        {vendor.govSupport?.hasGovSupportExperience && (
                            <GovSupportBadge
                                hasSupport={true}
                                totalCount={vendor.govSupport.govSupportTotalCount}
                            />
                        )}
                        {vendor.region && (
                            <span className="text-sm text-gray-500">📍 {vendor.region}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* 메인 컨텐츠 */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="space-y-8">
                    {/* 소개 */}
                    {vendor.description && (
                        <section className="bg-white p-6 rounded-lg shadow-sm">
                            <h2 className="text-2xl font-bold mb-4">소개</h2>
                            <p className="text-gray-700 whitespace-pre-wrap">{vendor.description}</p>
                        </section>
                    )}

                    {/* 팀 구성 */}
                    {vendor.team && vendor.team.total > 0 && (
                        <section className="bg-white p-6 rounded-lg shadow-sm">
                            <h2 className="text-2xl font-bold mb-4">팀 구성</h2>
                            <TeamSummaryInline team={vendor.team} />
                        </section>
                    )}

                    {/* 개발 스택 (개발 분야만) */}
                    {devVendor && (
                        <section className="bg-white p-6 rounded-lg shadow-sm">
                            <h2 className="text-2xl font-bold mb-4">기술 스택</h2>

                            {/* 주요 기술스택 */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold mb-2">주요 기술</h3>
                                <div className="flex flex-wrap gap-2">
                                    {devVendor.devInfo.techStackSummary.map((tech, idx) => (
                                        <span
                                            key={idx}
                                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium"
                                        >
                                            {tech}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* 프론트엔드 */}
                            {devVendor.devInfo.frontendStacks && devVendor.devInfo.frontendStacks.length > 0 && (
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Frontend</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {devVendor.devInfo.frontendStacks.map((tech, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                                                {tech}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 백엔드 */}
                            {devVendor.devInfo.backendStacks && devVendor.devInfo.backendStacks.length > 0 && (
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Backend</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {devVendor.devInfo.backendStacks.map((tech, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                                                {tech}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 인프라 */}
                            {devVendor.devInfo.infraStacks && devVendor.devInfo.infraStacks.length > 0 && (
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Infrastructure</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {devVendor.devInfo.infraStacks.map((tech, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                                                {tech}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {/* 정부지원사업 */}
                    {vendor.govSupport?.hasGovSupportExperience && (
                        <section className="bg-white p-6 rounded-lg shadow-sm">
                            <h2 className="text-2xl font-bold mb-4">정부지원사업 수행 경력</h2>

                            {vendor.govSupport.govSupportPrograms && (
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-gray-600 mb-2">수행 프로그램</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {vendor.govSupport.govSupportPrograms.map((program, idx) => (
                                            <span
                                                key={idx}
                                                className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm"
                                            >
                                                {program}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {vendor.govSupport.govSupportMainTitle && (
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-gray-600 mb-2">대표 과제</h3>
                                    <p className="text-gray-700">{vendor.govSupport.govSupportMainTitle}</p>
                                </div>
                            )}

                            {vendor.govSupport.govSupportSummary && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-600 mb-2">상세 설명</h3>
                                    <p className="text-gray-700">{vendor.govSupport.govSupportSummary}</p>
                                </div>
                            )}
                        </section>
                    )}

                    {/* 예산 정보 */}
                    <section className="bg-white p-6 rounded-lg shadow-sm">
                        <h2 className="text-2xl font-bold mb-4">프로젝트 예산</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {vendor.minBudget !== undefined && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">최소</p>
                                    <p className="text-xl font-bold text-gray-900">
                                        {vendor.minBudget.toLocaleString()}원
                                    </p>
                                </div>
                            )}
                            {vendor.avgBudget !== undefined && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">평균</p>
                                    <p className="text-xl font-bold text-blue-600">
                                        {vendor.avgBudget.toLocaleString()}원
                                    </p>
                                </div>
                            )}
                            {vendor.maxBudget !== undefined && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">최대</p>
                                    <p className="text-xl font-bold text-gray-900">
                                        {vendor.maxBudget.toLocaleString()}원
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 연락처 정보 */}
                    <section className="bg-white p-6 rounded-lg shadow-sm">
                        <h2 className="text-2xl font-bold mb-4">연락처</h2>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">이메일</p>
                                <a
                                    href={`mailto:${vendor.contactEmail}`}
                                    className="text-blue-600 hover:underline"
                                >
                                    {vendor.contactEmail}
                                </a>
                            </div>
                            {vendor.websiteUrl && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">웹사이트</p>
                                    <a
                                        href={vendor.websiteUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                    >
                                        {vendor.websiteUrl}
                                    </a>
                                </div>
                            )}
                            {vendor.contactChannel && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">기타 연락처</p>
                                    <p className="text-gray-700">{vendor.contactChannel}</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

