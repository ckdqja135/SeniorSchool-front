/**
 * 어드민 메뉴 아이콘 (lucide SVG).
 *
 * DB(AdminMenu.menuIcon, 최대 20자)에는 아이콘 값을 저장한다.
 *  - "팩:아이디" (예: "ph:fork-knife"): 아이콘 팩(iconPacks.tsx)에서 고른 아이콘. 지금 선택기가 저장하는 형식
 *  - "dashboard" 같은 키: lucide 아이콘 (기본 메뉴 정의와 그동안 저장된 값)
 * 예전에 저장된 이모지는 EMOJI_TO_KEY 로 비슷한 SVG 에 대응시켜 그대로 보여주고,
 * 대응이 없는 값은 글자 그대로 그린다. 그래서 DB 를 한꺼번에 바꾸지 않아도 된다.
 */
import type { LucideIcon } from "lucide-react";
import type { IconType } from "react-icons";
import {
  Activity, Bell, Bookmark, Boxes, BriefcaseBusiness, Building2, CalendarDays, ChartColumn,
  ChartLine, ChartPie, Church, ClipboardList, Clock, Coffee, Compass, Database, FileText,
  Files, Flag, FlaskConical, Folder, FolderOpen, Folders, Globe, GraduationCap, Hammer, Heart,
  House, Image, Inbox, KeyRound, Layers, LayoutDashboard, Link, ListChecks, Lock, Mail, Map as MapIcon,
  MapPin, Megaphone, MessageCircle, MessagesSquare, Newspaper, Package, Pin, Puzzle,
  Receipt, Rocket, School, Search, Server, Settings, ShieldCheck, ShoppingCart, Siren,
  SlidersHorizontal, Soup, Sparkles, Star, Store, Tag, Target, Toolbox, TrendingUp, UserCog,
  Users, UtensilsCrossed, Workflow, Wrench,
} from "lucide-react";
import { ICON_PACKS, PACK_CONCEPTS, type PackConcept, type PackKey } from "./iconPacks";

export interface MenuIconDef {
  key: string;        // DB 에 저장되는 값 (20자 이하)
  label: string;      // 선택기에 보이는 이름
  keywords: string;   // 검색어 (공백으로 구분)
  Icon: LucideIcon | IconType;
  /** 아이콘 팩에서 온 값이면 그 팩 (lucide 는 없음) */
  pack?: PackKey;
}

const PACK_INDEX = Object.fromEntries(ICON_PACKS.map((p, i) => [p.key, i])) as Record<PackKey, number>;
const CONCEPT_BY_ID = new Map(PACK_CONCEPTS.map((c) => [c.id, c]));

/** 팩·개념으로 아이콘 정의를 만든다. 그 팩에 아이콘이 없으면 null */
export function packIcon(pack: PackKey, concept: PackConcept): MenuIconDef | null {
  const Icon = concept.icons[PACK_INDEX[pack]];
  if (!Icon) return null;
  return { key: `${pack}:${concept.id}`, label: concept.label, keywords: concept.tags, Icon, pack };
}

export function packLabel(pack: PackKey): string {
  return ICON_PACKS.find((p) => p.key === pack)?.label ?? pack;
}

/** 선택기에 보이는 순서대로. 현재 어드민 메뉴에 쓰는 아이콘을 앞쪽에 둔다 */
export const MENU_ICONS: MenuIconDef[] = [
  { key: "dashboard", label: "대시보드", keywords: "dashboard 홈 메인 요약", Icon: LayoutDashboard },
  { key: "folders", label: "폴더 묶음", keywords: "게시판 자유게시판 folders", Icon: Folders },
  { key: "graduation-cap", label: "학사모", keywords: "학교 대학 univ", Icon: GraduationCap },
  { key: "church", label: "교회", keywords: "교회 church", Icon: Church },
  { key: "building", label: "건물", keywords: "회사 기업 company", Icon: Building2 },
  { key: "briefcase", label: "서류가방", keywords: "외주 업무 비즈니스 outsource", Icon: BriefcaseBusiness },
  { key: "utensils", label: "식기", keywords: "맛집 식당 음식 restaurant", Icon: UtensilsCrossed },
  { key: "wrench", label: "렌치", keywords: "서비스 관리 도구 설정", Icon: Wrench },
  { key: "chart-line", label: "꺾은선 차트", keywords: "접속 분석 통계 analytics", Icon: ChartLine },
  { key: "file-text", label: "문서", keywords: "게시글 글 post", Icon: FileText },
  { key: "toolbox", label: "공구함", keywords: "시스템 관리 도구", Icon: Toolbox },
  { key: "users", label: "사용자들", keywords: "관리자 계정 회원 권한", Icon: Users },

  { key: "chart-column", label: "막대 차트", keywords: "통계 차트", Icon: ChartColumn },
  { key: "chart-pie", label: "원형 차트", keywords: "통계 비율", Icon: ChartPie },
  { key: "trending-up", label: "상승 추세", keywords: "성장 추세", Icon: TrendingUp },
  { key: "activity", label: "활동", keywords: "모니터링 상태 로그", Icon: Activity },
  { key: "settings", label: "톱니바퀴", keywords: "설정 환경", Icon: Settings },
  { key: "sliders", label: "슬라이더", keywords: "설정 조정 옵션", Icon: SlidersHorizontal },
  { key: "hammer", label: "망치", keywords: "도구 작업", Icon: Hammer },
  { key: "workflow", label: "워크플로", keywords: "스케줄러 작업 흐름 자동화", Icon: Workflow },
  { key: "clock", label: "시계", keywords: "스케줄 시간 예약", Icon: Clock },
  { key: "calendar", label: "달력", keywords: "일정 날짜", Icon: CalendarDays },
  { key: "user-cog", label: "사용자 설정", keywords: "계정 관리 권한", Icon: UserCog },
  { key: "shield-check", label: "방패", keywords: "권한 보안", Icon: ShieldCheck },
  { key: "lock", label: "자물쇠", keywords: "권한 보안 잠금", Icon: Lock },
  { key: "key", label: "열쇠", keywords: "권한 인증 키", Icon: KeyRound },

  { key: "folder", label: "폴더", keywords: "게시판 파일", Icon: Folder },
  { key: "folder-open", label: "열린 폴더", keywords: "게시판 파일", Icon: FolderOpen },
  { key: "files", label: "파일들", keywords: "문서 게시글", Icon: Files },
  { key: "clipboard", label: "클립보드", keywords: "목록 요청 검수", Icon: ClipboardList },
  { key: "list-checks", label: "체크리스트", keywords: "검수 요청 할 일", Icon: ListChecks },
  { key: "newspaper", label: "신문", keywords: "소식 게시판 공지", Icon: Newspaper },
  { key: "megaphone", label: "확성기", keywords: "공지 알림 홍보", Icon: Megaphone },
  { key: "messages", label: "대화", keywords: "댓글 후기 리뷰 채팅", Icon: MessagesSquare },
  { key: "message", label: "말풍선", keywords: "댓글 후기 리뷰", Icon: MessageCircle },
  { key: "flag", label: "깃발", keywords: "신고 report", Icon: Flag },
  { key: "siren", label: "경광등", keywords: "신고 경고", Icon: Siren },
  { key: "bell", label: "종", keywords: "알림", Icon: Bell },
  { key: "mail", label: "편지", keywords: "메일 요청 문의", Icon: Mail },
  { key: "inbox", label: "받은편지함", keywords: "요청 접수 문의", Icon: Inbox },

  { key: "school", label: "학교", keywords: "학교 대학 캠퍼스", Icon: School },
  { key: "store", label: "가게", keywords: "상점 식당 매장", Icon: Store },
  { key: "house", label: "집", keywords: "홈 메인", Icon: House },
  { key: "coffee", label: "커피", keywords: "카페 음료", Icon: Coffee },
  { key: "soup", label: "국그릇", keywords: "음식 식당 맛집", Icon: Soup },
  { key: "cart", label: "장바구니", keywords: "쇼핑 구매", Icon: ShoppingCart },
  { key: "map", label: "지도", keywords: "지도 위치", Icon: MapIcon },
  { key: "map-pin", label: "위치 핀", keywords: "위치 장소 주소", Icon: MapPin },
  { key: "compass", label: "나침반", keywords: "탐색 둘러보기", Icon: Compass },
  { key: "globe", label: "지구본", keywords: "전체 사이트 웹", Icon: Globe },

  { key: "database", label: "데이터베이스", keywords: "데이터 DB", Icon: Database },
  { key: "server", label: "서버", keywords: "서버 시스템", Icon: Server },
  { key: "layers", label: "레이어", keywords: "서비스 구조 계층", Icon: Layers },
  { key: "package", label: "상자", keywords: "패키지 상품", Icon: Package },
  { key: "boxes", label: "상자 묶음", keywords: "상품 재고", Icon: Boxes },
  { key: "puzzle", label: "퍼즐", keywords: "확장 플러그인 서비스", Icon: Puzzle },
  { key: "link", label: "링크", keywords: "연결 URL", Icon: Link },
  { key: "image", label: "이미지", keywords: "사진 미디어", Icon: Image },
  { key: "tag", label: "태그", keywords: "분류 카테고리", Icon: Tag },
  { key: "receipt", label: "영수증", keywords: "결제 내역", Icon: Receipt },
  { key: "bookmark", label: "북마크", keywords: "저장 즐겨찾기", Icon: Bookmark },
  { key: "pin", label: "압정", keywords: "고정 공지", Icon: Pin },
  { key: "star", label: "별", keywords: "즐겨찾기 인기 평점", Icon: Star },
  { key: "heart", label: "하트", keywords: "좋아요 인기", Icon: Heart },
  { key: "search", label: "돋보기", keywords: "검색 찾기", Icon: Search },
  { key: "target", label: "과녁", keywords: "목표", Icon: Target },
  { key: "rocket", label: "로켓", keywords: "배포 출시", Icon: Rocket },
  { key: "flask", label: "플라스크", keywords: "실험 테스트", Icon: FlaskConical },
  { key: "sparkles", label: "반짝임", keywords: "신규 새 기능", Icon: Sparkles },
];

const BY_KEY = new Map(MENU_ICONS.map((d) => [d.key, d]));

// 이모지 변형 선택자(U+FE0F). 소스에 보이지 않는 문자를 넣지 않으려고 코드로 만든다
const VARIATION_SELECTOR = new RegExp(String.fromCharCode(0xfe0f), "g");

/** 예전에 저장된 이모지 → 비슷한 SVG 키 (이모지 선택기에 있던 것 + 동적 서비스에서 흔한 것) */
const EMOJI_TO_KEY: Record<string, string> = {
  "📊": "dashboard", "🗂": "folders", "📁": "folder", "📂": "folder-open", "🎓": "graduation-cap",
  "⛪": "church", "✍": "building", "💼": "briefcase", "🍽": "utensils", "🛠": "wrench",
  "📈": "chart-line", "📉": "chart-line", "📝": "file-text", "🧰": "toolbox", "👥": "users",
  "👤": "users", "⚙": "settings", "🔐": "lock", "🔒": "lock", "🏢": "building", "🏫": "school",
  "🏪": "store", "🧭": "compass", "📦": "package", "📌": "pin", "🔔": "bell", "🗓": "calendar",
  "📅": "calendar", "🧾": "receipt", "💬": "message", "⭐": "star", "🔎": "search", "🔍": "search",
  "📮": "mail", "📧": "mail", "🧪": "flask", "🗺": "map", "☕": "coffee", "🍜": "soup",
  "🍴": "utensils", "🛒": "cart", "🎯": "target", "🚀": "rocket", "🧩": "puzzle", "🏠": "house",
  "❤": "heart", "🚨": "siren", "📢": "megaphone", "🏷": "tag", "🔗": "link", "🖼": "image",
};

/** 저장값(키 또는 예전 이모지) → 아이콘 정의. 대응이 없으면 null */
export function resolveMenuIcon(value: string | null | undefined): MenuIconDef | null {
  if (!value) return null;
  const v = value.trim();
  const sep = v.indexOf(":");
  if (sep > 0) {
    const pack = v.slice(0, sep) as PackKey;
    const concept = CONCEPT_BY_ID.get(v.slice(sep + 1));
    return pack in PACK_INDEX && concept ? packIcon(pack, concept) : null;
  }
  const direct = BY_KEY.get(v);
  if (direct) return direct;
  // 이모지 변형 선택자(U+FE0F)를 떼고 찾는다 (선택자가 붙은 이모지와 안 붙은 이모지를 같게 본다)
  const key = EMOJI_TO_KEY[v.replace(VARIATION_SELECTOR, "")];
  return key ? BY_KEY.get(key) ?? null : null;
}

/** 메뉴 아이콘. SVG 로 그릴 수 없는 값은 글자 그대로 보여준다 */
export function MenuIcon({
  value,
  size = 20,
  className = "",
}: {
  value: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const def = resolveMenuIcon(value);
  if (def) {
    const { Icon } = def;
    // lucide 만 선 굵기를 맞춘다. 팩 아이콘은 팩 고유의 굵기를 쓴다
    return <Icon size={size} strokeWidth={def.pack ? undefined : 1.8} aria-hidden="true" className={`shrink-0 ${className}`} />;
  }
  if (!value) return null;
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center leading-none ${className}`} style={{ width: size, height: size, fontSize: size * 0.9 }}>
      {value}
    </span>
  );
}
