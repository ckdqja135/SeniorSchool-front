/**
 * 관리자 메뉴 정의. 사이드바와 상단 헤더(이동 경로)가 같은 정의를 쓴다.
 *
 * 메뉴는 이제 DB(tb_admin_menu)가 원본이고, 권한 그룹별로 다르게 내려온다.
 * - 정상 경로: GET /admin/permission/menus/me → buildMenuFromDb()
 * - 대비 경로: 조회 실패나 아직 시드되지 않은 DB → FALLBACK_MENU (예전 하드코딩 트리)
 *   이 폴백이 있어서 마이그레이션 미적용·API 장애에도 어드민 패널을 계속 쓸 수 있다. 지우지 말 것.
 *
 * 동적 서비스 메뉴는 /services 조회 결과로 만든다(런타임 생성이라 DB 메뉴로 둘 수 없다).
 * '서비스 관리' 메뉴가 보이는 그룹에만 끼워 넣는다.
 */
import type { ServiceConfig } from "@/types/Services";

export interface SubMenuItem {
  label: string;
  href: string;
  subItems?: SubMenuItem[];
  /** DB 메뉴의 식별자 (폴백 메뉴에는 없다) */
  menuIdx?: number;
  /** 경로가 있어 실제로 이동할 수 있는지. 묶음 메뉴는 false */
  navigable?: boolean;
  /** 활성 판정에 쓸 경로들 (자신 + 하위). 묶음 메뉴는 자기 경로가 없어 하위 것으로 판정한다 */
  matchPaths?: string[];
}

export interface MenuItem {
  icon: string;
  label: string;
  href: string;
  subItems: SubMenuItem[];
  menuIdx?: number;
  navigable?: boolean;
  matchPaths?: string[];
}

const STATIC_MENU: MenuItem[] = [
  { icon: "dashboard", label: "Dashboard", href: "/myoriadmin", subItems: [] },
  {
    icon: "folders",
    label: "자유게시판",
    href: "/myoriadmin/freeboard",
    subItems: [{ label: "자유게시판 관리", href: "/myoriadmin/freeboard" }],
  },
  {
    icon: "graduation-cap",
    label: "학교 오빠",
    href: "/myoriadmin/school",
    subItems: [
      { label: "학교 관리", href: "/myoriadmin/school/management" },
      { label: "대학교 추가 요청 관리", href: "/myoriadmin/school/requests" },
      { label: "후기 관리", href: "/myoriadmin/school/board" },
    ],
  },
  {
    icon: "church",
    label: "교회 오빠",
    href: "/myoriadmin/church",
    subItems: [
      { label: "교회 관리", href: "/myoriadmin/church" },
      { label: "교회 추가 요청 관리", href: "/myoriadmin/church/requests" },
      { label: "후기 관리", href: "/myoriadmin/church/board" },
    ],
  },
  {
    icon: "building",
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
    icon: "briefcase",
    label: "외주 오빠",
    href: "/myoriadmin/outsource",
    subItems: [
      { label: "외주업체 관리", href: "/myoriadmin/outsource" },
      { label: "외주업체 추가 요청 관리", href: "/myoriadmin/outsource/requests" },
      { label: "후기 관리", href: "/myoriadmin/outsource/board" },
    ],
  },
  {
    icon: "utensils",
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
    icon: "wrench",
    label: "서비스 관리",
    href: "/myoriadmin/services",
    subItems: [
      { label: "서비스 목록", href: "/myoriadmin/services" },
      { label: "서비스 추가", href: "/myoriadmin/services/create" },
    ],
  },
  { icon: "chart-line", label: "접속 분석", href: "/myoriadmin/analytics", subItems: [] },
  {
    icon: "file-text",
    label: "게시글 관리",
    href: "/myoriadmin/posts",
    subItems: [{ label: "신고 게시글", href: "/myoriadmin/posts/reported" }],
  },
  // 여러 서비스에 걸친 운영 기능이라 서비스별 메뉴가 아니라 여기에 묶어 둔다
  {
    icon: "toolbox",
    label: "시스템 관리",
    href: "/myoriadmin/scheduler",
    navigable: false,
    matchPaths: ["/myoriadmin/scheduler", "/myoriadmin/admin"],
    subItems: [
      { label: "스케줄러 실행", href: "/myoriadmin/scheduler" },
      { label: "권한 관리", href: "/myoriadmin/admin" },
    ],
  },
];

/** 서비스 목록으로 만드는 동적 메뉴 */
function serviceMenus(services: ServiceConfig[]): MenuItem[] {
  return services.map((svc) => ({
    icon: svc.serviceEmoji,
    label: svc.serviceDisplay,
    href: `/myoriadmin/services/${svc.serviceSlug}`,
    subItems: [
      { label: `${svc.serviceName} 관리`, href: `/myoriadmin/services/${svc.serviceSlug}` },
      { label: `추가 요청 관리`, href: `/myoriadmin/services/${svc.serviceSlug}/requests` },
      { label: `후기 관리`, href: `/myoriadmin/services/${svc.serviceSlug}/board` },
    ],
  }));
}

/**
 * DB 메뉴를 못 받았을 때 쓰는 예전 하드코딩 트리.
 * 마이그레이션 미적용·API 장애 시 어드민이 아무 메뉴도 못 보는 상황을 막는 안전장치다.
 */
export function buildAdminMenu(services: ServiceConfig[]): MenuItem[] {
  return [...STATIC_MENU, ...serviceMenus(services), ...BOTTOM_MENU];
}

// ─── DB 메뉴 → 사이드바 메뉴 ──────────────────────────────

export interface DbMenuNode {
  menuIdx: number;
  menuName: string;
  menuPath: string | null;
  menuIcon: string | null;
  sortOrder: number;
  children: DbMenuNode[];
}

/** 자신 + 하위의 실제 경로들 (활성 판정용) */
function collectPaths(node: DbMenuNode): string[] {
  const out = node.menuPath ? [node.menuPath] : [];
  for (const c of node.children) out.push(...collectPaths(c));
  return out;
}

/**
 * 활성 판정·React key·펼침 식별에 쓸 href.
 * 묶음 메뉴(경로 없음)는 첫 하위 경로를 빌려 쓰고, 그것도 없으면 겹치지 않는 가짜 값을 준다.
 */
function effectiveHref(node: DbMenuNode): string {
  if (node.menuPath) return node.menuPath;
  const [first] = collectPaths(node);
  return first ?? `#menu-${node.menuIdx}`;
}

function toSub(node: DbMenuNode): SubMenuItem {
  return {
    label: node.menuName,
    href: effectiveHref(node),
    menuIdx: node.menuIdx,
    navigable: node.menuPath !== null,
    matchPaths: collectPaths(node),
    subItems: node.children.map(toSub),
  };
}

/**
 * 권한에 맞게 걸러진 DB 메뉴 트리를 사이드바 메뉴로 바꾼다.
 * 사이드바는 3단까지만 그리므로 백엔드도 3단으로 제한한다.
 */
export function buildMenuFromDb(dbMenus: DbMenuNode[], services: ServiceConfig[]): MenuItem[] {
  const items: MenuItem[] = dbMenus.map((top) => ({
    icon: top.menuIcon ?? "•",
    label: top.menuName,
    href: effectiveHref(top),
    menuIdx: top.menuIdx,
    navigable: top.menuPath !== null,
    matchPaths: collectPaths(top),
    subItems: top.children.map(toSub),
  }));

  // 동적 서비스 메뉴는 '서비스 관리'가 보이는 그룹에만 (그 메뉴의 권한을 따라간다)
  const svcAt = items.findIndex((i) => i.href === "/myoriadmin/services");
  if (svcAt >= 0 && services.length > 0) {
    items.splice(svcAt, 0, ...serviceMenus(services));
  }

  return items;
}

/** 메뉴가 현재 경로를 담당하는지 — 하위가 있으면 접두사, 없으면 정확히 일치 (사이드바·이동 경로 공용) */
export function isMenuActive(item: MenuItem | SubMenuItem, pathname: string): boolean {
  const paths = item.matchPaths?.length ? item.matchPaths : [item.href];
  const hasChildren = (item as MenuItem).subItems?.length ? true : false;
  return hasChildren
    ? paths.some((p) => pathname === p || pathname.startsWith(`${p}/`))
    : paths.some((p) => pathname === p);
}

export interface Crumb {
  label: string;
  href: string;
  /** 경로가 없는 묶음 메뉴는 링크로 만들지 않는다 (누르면 404) */
  navigable?: boolean;
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
    const top: Crumb = { label: item.label, href: item.href, navigable: item.navigable !== false };
    // 하위 메뉴가 있으면 하위 메뉴가 우선이고, 상위 메뉴는 하위에 안 걸리는 경로(예: /myoriadmin/school)의 대비책이다
    consider([top], item.href, item.subItems.length === 0 ? item.href.length : item.href.length - 0.5);
    for (const sub of item.subItems) {
      const mid: Crumb = { label: sub.label, href: sub.href, navigable: sub.navigable !== false };
      consider([top, mid], sub.href);
      for (const third of sub.subItems ?? []) {
        consider([top, mid, { label: third.label, href: third.href, navigable: third.navigable !== false }], third.href);
      }
    }
  }
  // 어디에도 안 걸리면 Dashboard(/myoriadmin) 가 모든 경로를 덮으므로 그게 남는다
  const found = best as { crumbs: Crumb[]; len: number } | null;
  return found ? found.crumbs : [{ label: "Dashboard", href: "/myoriadmin", navigable: true }];
}
