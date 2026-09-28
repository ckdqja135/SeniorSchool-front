/**
 * 관리자 메뉴 정의. 사이드바와 상단 헤더(이동 경로)가 같은 정의를 쓴다.
 *
 * 동적 서비스 메뉴는 /services 조회 결과로 만들며, 정적 메뉴와 하단 고정 메뉴 사이에 끼운다.
 */
import type { ServiceConfig } from "@/types/Services";

export interface SubMenuItem {
  label: string;
  href: string;
  subItems?: SubMenuItem[];
}

export interface MenuItem {
  icon: string;
  label: string;
  href: string;
  subItems: SubMenuItem[];
}

const STATIC_MENU: MenuItem[] = [
  { icon: "📊", label: "Dashboard", href: "/myoriadmin", subItems: [] },
  {
    icon: "🗂️",
    label: "자유게시판",
    href: "/myoriadmin/freeboard",
    subItems: [{ label: "자유게시판 관리", href: "/myoriadmin/freeboard" }],
  },
  {
    icon: "🎓",
    label: "학교 오빠",
    href: "/myoriadmin/school",
    subItems: [
      { label: "학교 관리", href: "/myoriadmin/school/management" },
      { label: "대학교 추가 요청 관리", href: "/myoriadmin/school/requests" },
      { label: "후기 관리", href: "/myoriadmin/school/board" },
    ],
  },
  {
    icon: "⛪",
    label: "교회 오빠",
    href: "/myoriadmin/church",
    subItems: [
      { label: "교회 관리", href: "/myoriadmin/church" },
      { label: "교회 추가 요청 관리", href: "/myoriadmin/church/requests" },
      { label: "후기 관리", href: "/myoriadmin/church/board" },
    ],
  },
  {
    icon: "✍️",
    label: "회사 오빠",
    href: "/myoriadmin/company",
    subItems: [
      { label: "회사 관리", href: "/myoriadmin/company" },
      { label: "회사 추가 요청 관리", href: "/myoriadmin/company/requests" },
      { label: "후기 관리", href: "/myoriadmin/company/board" },
      { label: "크롤러 관리", href: "/myoriadmin/company/crawler" },
    ],
  },
  {
    icon: "💼",
    label: "외주 오빠",
    href: "/myoriadmin/outsource",
    subItems: [
      { label: "외주업체 관리", href: "/myoriadmin/outsource" },
      { label: "외주업체 추가 요청 관리", href: "/myoriadmin/outsource/requests" },
      { label: "후기 관리", href: "/myoriadmin/outsource/board" },
    ],
  },
  {
    icon: "🍽️",
    label: "맛잘알 오빠",
    href: "/myoriadmin/restaurant",
    subItems: [
      { label: "식당 관리", href: "/myoriadmin/restaurant" },
      { label: "식당 추가 요청 관리", href: "/myoriadmin/restaurant/requests" },
      { label: "후기 관리", href: "/myoriadmin/restaurant/board" },
      { label: "크롤러 관리", href: "/myoriadmin/restaurant/crawler" },
    ],
  },
];

const BOTTOM_MENU: MenuItem[] = [
  {
    icon: "🛠️",
    label: "서비스 관리",
    href: "/myoriadmin/services",
    subItems: [
      { label: "서비스 목록", href: "/myoriadmin/services" },
      { label: "서비스 추가", href: "/myoriadmin/services/create" },
    ],
  },
  // 여러 서비스에 걸친 정기 작업이라 서비스별 메뉴가 아니라 여기에 둔다
  { icon: "⏱️", label: "스케줄러 실행", href: "/myoriadmin/scheduler", subItems: [] },
  { icon: "📈", label: "접속 분석", href: "/myoriadmin/analytics", subItems: [] },
  { icon: "👥", label: "관리자 관리", href: "/myoriadmin/admin", subItems: [] },
  {
    icon: "📝",
    label: "게시글 관리",
    href: "/myoriadmin/posts",
    subItems: [{ label: "신고 게시글", href: "/myoriadmin/posts/reported" }],
  },
];

export function buildAdminMenu(services: ServiceConfig[]): MenuItem[] {
  const dynamic: MenuItem[] = services.map((svc) => ({
    icon: svc.serviceEmoji,
    label: svc.serviceDisplay,
    href: `/myoriadmin/services/${svc.serviceSlug}`,
    subItems: [
      { label: `${svc.serviceName} 관리`, href: `/myoriadmin/services/${svc.serviceSlug}` },
      { label: `추가 요청 관리`, href: `/myoriadmin/services/${svc.serviceSlug}/requests` },
      { label: `후기 관리`, href: `/myoriadmin/services/${svc.serviceSlug}/board` },
    ],
  }));
  return [...STATIC_MENU, ...dynamic, ...BOTTOM_MENU];
}

export interface Crumb {
  label: string;
  href: string;
}

/** href 가 pathname 을 덮는지 (정확히 같거나, 그 아래 경로) */
function covers(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * 현재 경로의 이동 경로. 가장 길게 일치하는 메뉴를 찾아 [상위 메뉴, (중간 메뉴), 현재 메뉴] 로 돌려준다.
 * 예: /myoriadmin/restaurant/crawler → [맛잘알 오빠, 크롤러 관리]
 *     /myoriadmin/restaurant/board/12 → [맛잘알 오빠, 후기 관리]
 */
export function resolveBreadcrumb(pathname: string, menu: MenuItem[]): Crumb[] {
  let best: { crumbs: Crumb[]; len: number } | null = null;
  const consider = (crumbs: Crumb[], href: string, len = href.length) => {
    if (!covers(href, pathname)) return;
    if (!best || len > best.len) best = { crumbs, len };
  };

  for (const item of menu) {
    const top: Crumb = { label: item.label, href: item.href };
    // 하위 메뉴가 있으면 하위 메뉴가 우선이고, 상위 메뉴는 하위에 안 걸리는 경로(예: /myoriadmin/school)의 대비책이다
    consider([top], item.href, item.subItems.length === 0 ? item.href.length : item.href.length - 0.5);
    for (const sub of item.subItems) {
      const mid: Crumb = { label: sub.label, href: sub.href };
      consider([top, mid], sub.href);
      for (const third of sub.subItems ?? []) consider([top, mid, { label: third.label, href: third.href }], third.href);
    }
  }
  // 어디에도 안 걸리면 Dashboard(/myoriadmin) 가 모든 경로를 덮으므로 그게 남는다
  const found = best as { crumbs: Crumb[]; len: number } | null;
  return found ? found.crumbs : [{ label: "Dashboard", href: "/myoriadmin" }];
}
