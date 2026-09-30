/**
 * 메뉴 아이콘 팩 (Phosphor / Tabler / Remix / Bootstrap / Material).
 *
 * 같은 뜻의 아이콘을 팩마다 하나씩 묶어 둔다. icons 순서는 ICON_PACKS 순서와 같고,
 * 그 팩에 맞는 아이콘이 없으면 null 이다 (그 팩 탭에서는 보이지 않는다).
 * DB(AdminMenu.menuIcon, 최대 20자)에는 "팩:아이디" 로 저장한다 (예: "ph:fork-knife").
 * react-icons 는 쓰는 아이콘만 번들에 들어간다.
 */
import type { IconType } from "react-icons";
import {
  PiBell, PiBowlFood, PiBriefcase, PiBug, PiBuildings, PiCalendar, PiChartBar, PiChartLine, PiChartPie,
  PiChatCircle, PiChats, PiChurch, PiClipboardText, PiClock, PiCoffee, PiCopy, PiDatabase, PiEnvelope,
  PiFileText, PiFiles, PiFlag, PiFolder, PiForkKnife, PiGear, PiGlobe, PiGraduationCap, PiHammer,
  PiHeart, PiHouse, PiImage, PiKey, PiList, PiListChecks, PiLock, PiMapPin, PiMegaphone, PiNewspaper,
  PiPresentationChart, PiPulse, PiRobot, PiShieldCheck, PiSiren, PiSlidersHorizontal, PiSquaresFour,
  PiStar, PiStorefront, PiTray, PiTreeStructure, PiTrendUp, PiUser, PiUserGear, PiUserPlus, PiUsers,
  PiWrench
} from "react-icons/pi";
import {
  TbActivity, TbAdjustmentsHorizontal, TbBell, TbBriefcase, TbBug, TbBuilding, TbBuildingChurch,
  TbBuildingStore, TbCalendar, TbChartBar, TbChartLine, TbChartPie, TbClipboardList, TbClock, TbCoffee,
  TbCopy, TbDatabase, TbFileText, TbFiles, TbFlag, TbFolder, TbHammer, TbHeart, TbHome, TbInbox, TbKey,
  TbLayoutDashboard, TbList, TbListCheck, TbLock, TbMail, TbMapPin, TbMessageCircle, TbMessages,
  TbNews, TbPhoto, TbReportAnalytics, TbRobot, TbSchool, TbSettings, TbShieldCheck, TbSitemap, TbSoup,
  TbSpeakerphone, TbStar, TbTool, TbToolsKitchen2, TbTrendingUp, TbUrgent, TbUser, TbUserCog,
  TbUserPlus, TbUsers, TbWorld
} from "react-icons/tb";
import {
  RiAlarmWarningLine, RiArrowRightUpLine, RiBarChartLine, RiBowlLine, RiBriefcaseLine, RiBugLine,
  RiBuildingLine, RiCalendarLine, RiChat3Line, RiCheckboxLine, RiClipboardLine, RiCupLine,
  RiDashboardLine, RiDatabase2Line, RiEqualizerLine, RiFileChartLine, RiFileCopy2Line, RiFileCopyLine,
  RiFileTextLine, RiFlagLine, RiFolderLine, RiGlobalLine, RiGraduationCapLine, RiGroupLine,
  RiHammerLine, RiHeartLine, RiHomeLine, RiImageLine, RiInboxLine, RiKey2Line, RiLineChartLine,
  RiListUnordered, RiLockLine, RiMailLine, RiMapPinLine, RiMegaphoneLine, RiMessage3Line,
  RiNewspaperLine, RiNodeTree, RiNotification3Line, RiPieChartLine, RiPulseLine, RiRestaurantLine,
  RiRobotLine, RiSettings3Line, RiShieldCheckLine, RiStarLine, RiStore2Line, RiTimeLine, RiToolsLine,
  RiUserAddLine, RiUserLine, RiUserSettingsLine
} from "react-icons/ri";
import {
  BsActivity, BsBarChart, BsBell, BsBriefcase, BsBug, BsBuilding, BsCalendar, BsChat, BsChatDots,
  BsCheck2Square, BsClipboard, BsClipboardData, BsClock, BsCopy, BsCupHot, BsDatabase, BsDiagram3,
  BsEggFried, BsEnvelope, BsExclamationTriangle, BsFileEarmarkText, BsFiles, BsFlag, BsFolder, BsGear,
  BsGeoAlt, BsGlobe, BsGraphUp, BsGraphUpArrow, BsGrid, BsHammer, BsHeart, BsHouse, BsImage, BsInbox,
  BsKey, BsListUl, BsLock, BsMegaphone, BsMortarboard, BsNewspaper, BsPeople, BsPerson, BsPersonGear,
  BsPersonPlus, BsPieChart, BsRobot, BsShieldCheck, BsShop, BsSliders, BsStar, BsWrench
} from "react-icons/bs";
import {
  MdOutlineAccountTree, MdOutlineAnalytics, MdOutlineApartment, MdOutlineAssignment, MdOutlineBarChart,
  MdOutlineBugReport, MdOutlineBuild, MdOutlineCalendarMonth, MdOutlineCampaign, MdOutlineChatBubble,
  MdOutlineChecklist, MdOutlineChurch, MdOutlineContentCopy, MdOutlineDashboard, MdOutlineDescription,
  MdOutlineFavorite, MdOutlineFlag, MdOutlineFolder, MdOutlineFolderCopy, MdOutlineForum,
  MdOutlineGroup, MdOutlineHandyman, MdOutlineHome, MdOutlineImage, MdOutlineInbox, MdOutlineKey,
  MdOutlineList, MdOutlineLocalCafe, MdOutlineLocationOn, MdOutlineLock, MdOutlineMail,
  MdOutlineManageAccounts, MdOutlineMonitorHeart, MdOutlineNewspaper, MdOutlineNotifications,
  MdOutlinePerson, MdOutlinePersonAdd, MdOutlinePieChart, MdOutlinePublic, MdOutlineRamenDining,
  MdOutlineRestaurant, MdOutlineSchedule, MdOutlineSchool, MdOutlineSettings, MdOutlineShowChart,
  MdOutlineSmartToy, MdOutlineStar, MdOutlineStorage, MdOutlineStorefront, MdOutlineTrendingUp,
  MdOutlineTune, MdOutlineVerifiedUser, MdOutlineWarning, MdOutlineWork
} from "react-icons/md";

export type PackKey = "ph" | "ti" | "ri" | "bi" | "ms";

export const ICON_PACKS: { key: PackKey; label: string }[] = [
  { key: "ph", label: "Phosphor" },
  { key: "ti", label: "Tabler" },
  { key: "ri", label: "Remix" },
  { key: "bi", label: "Bootstrap" },
  { key: "ms", label: "Material" },
];

export interface PackConcept {
  id: string;
  label: string;
  tags: string;
  icons: (IconType | null)[];
}

/** 선택기에 보이는 순서대로 */
export const PACK_CONCEPTS: PackConcept[] = [
  { id: "squares-four", label: "대시보드", tags: "홈 메인 현황 dashboard", icons: [PiSquaresFour, TbLayoutDashboard, RiDashboardLine, BsGrid, MdOutlineDashboard] },
  { id: "house", label: "홈", tags: "메인 처음", icons: [PiHouse, TbHome, RiHomeLine, BsHouse, MdOutlineHome] },
  { id: "list", label: "목록", tags: "리스트", icons: [PiList, TbList, RiListUnordered, BsListUl, MdOutlineList] },
  { id: "star", label: "즐겨찾기", tags: "별 추천", icons: [PiStar, TbStar, RiStarLine, BsStar, MdOutlineStar] },
  { id: "heart", label: "좋아요", tags: "하트 찜", icons: [PiHeart, TbHeart, RiHeartLine, BsHeart, MdOutlineFavorite] },
  { id: "map-pin", label: "위치", tags: "지도 장소 주변", icons: [PiMapPin, TbMapPin, RiMapPinLine, BsGeoAlt, MdOutlineLocationOn] },
  { id: "globe", label: "웹사이트", tags: "글로벌 지구", icons: [PiGlobe, TbWorld, RiGlobalLine, BsGlobe, MdOutlinePublic] },
  { id: "files", label: "게시판", tags: "글 문서 자유게시판", icons: [PiFiles, TbFiles, RiFileCopyLine, BsFiles, MdOutlineFolderCopy] },
  { id: "file-text", label: "문서", tags: "글 게시글 파일", icons: [PiFileText, TbFileText, RiFileTextLine, BsFileEarmarkText, MdOutlineDescription] },
  { id: "newspaper", label: "뉴스", tags: "소식 공지 기사", icons: [PiNewspaper, TbNews, RiNewspaperLine, BsNewspaper, MdOutlineNewspaper] },
  { id: "megaphone", label: "공지", tags: "알림 확성기 홍보", icons: [PiMegaphone, TbSpeakerphone, RiMegaphoneLine, BsMegaphone, MdOutlineCampaign] },
  { id: "chats", label: "대화", tags: "채팅 댓글 메시지", icons: [PiChats, TbMessages, RiChat3Line, BsChatDots, MdOutlineForum] },
  { id: "chat-circle", label: "후기", tags: "댓글 리뷰 말풍선", icons: [PiChatCircle, TbMessageCircle, RiMessage3Line, BsChat, MdOutlineChatBubble] },
  { id: "image", label: "이미지", tags: "사진 갤러리", icons: [PiImage, TbPhoto, RiImageLine, BsImage, MdOutlineImage] },
  { id: "clipboard-text", label: "요청", tags: "신청 추가 요청", icons: [PiClipboardText, TbClipboardList, RiClipboardLine, BsClipboard, MdOutlineAssignment] },
  { id: "list-checks", label: "검수", tags: "체크 할일 목록", icons: [PiListChecks, TbListCheck, RiCheckboxLine, BsCheck2Square, MdOutlineChecklist] },
  { id: "folder", label: "폴더", tags: "분류 묶음", icons: [PiFolder, TbFolder, RiFolderLine, BsFolder, MdOutlineFolder] },
  { id: "copy", label: "복사", tags: "문서 복제", icons: [PiCopy, TbCopy, RiFileCopy2Line, BsCopy, MdOutlineContentCopy] },
  { id: "users", label: "사용자", tags: "회원 사람 관리자 그룹", icons: [PiUsers, TbUsers, RiGroupLine, BsPeople, MdOutlineGroup] },
  { id: "user", label: "회원", tags: "사람 프로필", icons: [PiUser, TbUser, RiUserLine, BsPerson, MdOutlinePerson] },
  { id: "user-gear", label: "관리자", tags: "권한 운영자 설정", icons: [PiUserGear, TbUserCog, RiUserSettingsLine, BsPersonGear, MdOutlineManageAccounts] },
  { id: "user-plus", label: "회원 추가", tags: "가입 초대", icons: [PiUserPlus, TbUserPlus, RiUserAddLine, BsPersonPlus, MdOutlinePersonAdd] },
  { id: "graduation-cap", label: "학교", tags: "학생 교육 학교 오빠 대학교", icons: [PiGraduationCap, TbSchool, RiGraduationCapLine, BsMortarboard, MdOutlineSchool] },
  { id: "church", label: "교회", tags: "종교 교회 오빠", icons: [PiChurch, TbBuildingChurch, null, null, MdOutlineChurch] },
  { id: "buildings", label: "회사", tags: "기업 직장 회사 오빠", icons: [PiBuildings, TbBuilding, RiBuildingLine, BsBuilding, MdOutlineApartment] },
  { id: "briefcase", label: "외주", tags: "업무 외주 오빠 비즈니스", icons: [PiBriefcase, TbBriefcase, RiBriefcaseLine, BsBriefcase, MdOutlineWork] },
  { id: "fork-knife", label: "식당", tags: "음식 맛집 맛잘알 레스토랑 식당", icons: [PiForkKnife, TbToolsKitchen2, RiRestaurantLine, BsEggFried, MdOutlineRestaurant] },
  { id: "coffee", label: "카페", tags: "커피 디저트", icons: [PiCoffee, TbCoffee, RiCupLine, BsCupHot, MdOutlineLocalCafe] },
  { id: "storefront", label: "매장", tags: "가게 상점", icons: [PiStorefront, TbBuildingStore, RiStore2Line, BsShop, MdOutlineStorefront] },
  { id: "bowl-food", label: "음식", tags: "국밥 한식 요리", icons: [PiBowlFood, TbSoup, RiBowlLine, null, MdOutlineRamenDining] },
  { id: "chart-line", label: "접속 분석", tags: "분석 그래프 통계 추이", icons: [PiChartLine, TbChartLine, RiLineChartLine, BsGraphUp, MdOutlineShowChart] },
  { id: "chart-bar", label: "통계", tags: "막대 분석 리포트", icons: [PiChartBar, TbChartBar, RiBarChartLine, BsBarChart, MdOutlineBarChart] },
  { id: "chart-pie", label: "비율", tags: "통계 파이", icons: [PiChartPie, TbChartPie, RiPieChartLine, BsPieChart, MdOutlinePieChart] },
  { id: "trend-up", label: "성장", tags: "상승 추이", icons: [PiTrendUp, TbTrendingUp, RiArrowRightUpLine, BsGraphUpArrow, MdOutlineTrendingUp] },
  { id: "pulse", label: "활동", tags: "로그 모니터링", icons: [PiPulse, TbActivity, RiPulseLine, BsActivity, MdOutlineMonitorHeart] },
  { id: "report", label: "리포트", tags: "보고서 분석", icons: [PiPresentationChart, TbReportAnalytics, RiFileChartLine, BsClipboardData, MdOutlineAnalytics] },
  { id: "gear", label: "설정", tags: "환경 관리 서비스", icons: [PiGear, TbSettings, RiSettings3Line, BsGear, MdOutlineSettings] },
  { id: "sliders", label: "조정", tags: "필터 옵션", icons: [PiSlidersHorizontal, TbAdjustmentsHorizontal, RiEqualizerLine, BsSliders, MdOutlineTune] },
  { id: "wrench", label: "도구", tags: "수리 서비스 관리", icons: [PiWrench, TbTool, RiToolsLine, BsWrench, MdOutlineBuild] },
  { id: "hammer", label: "작업", tags: "빌드", icons: [PiHammer, TbHammer, RiHammerLine, BsHammer, MdOutlineHandyman] },
  { id: "tree-structure", label: "메뉴 구조", tags: "트리 계층", icons: [PiTreeStructure, TbSitemap, RiNodeTree, BsDiagram3, MdOutlineAccountTree] },
  { id: "database", label: "데이터", tags: "DB 저장소", icons: [PiDatabase, TbDatabase, RiDatabase2Line, BsDatabase, MdOutlineStorage] },
  { id: "robot", label: "크롤러", tags: "자동 봇 수집 크롤링", icons: [PiRobot, TbRobot, RiRobotLine, BsRobot, MdOutlineSmartToy] },
  { id: "bug", label: "오류", tags: "버그 에러", icons: [PiBug, TbBug, RiBugLine, BsBug, MdOutlineBugReport] },
  { id: "shield-check", label: "보안", tags: "권한 인증", icons: [PiShieldCheck, TbShieldCheck, RiShieldCheckLine, BsShieldCheck, MdOutlineVerifiedUser] },
  { id: "lock", label: "잠금", tags: "비밀번호", icons: [PiLock, TbLock, RiLockLine, BsLock, MdOutlineLock] },
  { id: "key", label: "키", tags: "API 인증", icons: [PiKey, TbKey, RiKey2Line, BsKey, MdOutlineKey] },
  { id: "clock", label: "시간", tags: "기록 히스토리", icons: [PiClock, TbClock, RiTimeLine, BsClock, MdOutlineSchedule] },
  { id: "calendar", label: "일정", tags: "캘린더 날짜", icons: [PiCalendar, TbCalendar, RiCalendarLine, BsCalendar, MdOutlineCalendarMonth] },
  { id: "bell", label: "알림", tags: "푸시 공지", icons: [PiBell, TbBell, RiNotification3Line, BsBell, MdOutlineNotifications] },
  { id: "envelope", label: "메일", tags: "이메일 우편", icons: [PiEnvelope, TbMail, RiMailLine, BsEnvelope, MdOutlineMail] },
  { id: "tray", label: "받은함", tags: "수신", icons: [PiTray, TbInbox, RiInboxLine, BsInbox, MdOutlineInbox] },
  { id: "flag", label: "신고", tags: "깃발 신고", icons: [PiFlag, TbFlag, RiFlagLine, BsFlag, MdOutlineFlag] },
  { id: "siren", label: "긴급", tags: "경고 사이렌", icons: [PiSiren, TbUrgent, RiAlarmWarningLine, BsExclamationTriangle, MdOutlineWarning] },
];
