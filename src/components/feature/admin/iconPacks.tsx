/**
 * 메뉴 아이콘 팩 (Phosphor / Tabler / Remix / Bootstrap / Material / Lucide / Heroicons / Ionicons / Boxicons / Font Awesome).
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
import {
  LuActivity, LuBell, LuBot, LuBriefcase, LuBug, LuBuilding2, LuCalendarDays, LuChartColumn,
  LuChartLine, LuChartPie, LuChurch, LuClipboardList, LuClock, LuCoffee, LuCopy, LuDatabase,
  LuFileChartColumn, LuFileText, LuFiles, LuFlag, LuFolder, LuGlobe, LuGraduationCap, LuHammer,
  LuHeart, LuHouse, LuImage, LuInbox, LuKeyRound, LuLayoutDashboard, LuList, LuListChecks, LuLock,
  LuMail, LuMapPin, LuMegaphone, LuMessageCircle, LuMessagesSquare, LuNetwork, LuNewspaper, LuSettings,
  LuShieldCheck, LuSiren, LuSlidersHorizontal, LuSoup, LuStar, LuStore, LuTrendingUp, LuUser,
  LuUserCog, LuUserPlus, LuUsers, LuUtensilsCrossed, LuWrench
} from "react-icons/lu";
import {
  HiOutlineAcademicCap, HiOutlineAdjustmentsHorizontal, HiOutlineArrowTrendingUp, HiOutlineBell,
  HiOutlineBriefcase, HiOutlineBugAnt, HiOutlineBuildingOffice2, HiOutlineBuildingStorefront,
  HiOutlineCalendarDays, HiOutlineChartBar, HiOutlineChartPie, HiOutlineChatBubbleLeftRight,
  HiOutlineChatBubbleOvalLeft, HiOutlineCircleStack, HiOutlineClipboardDocumentCheck,
  HiOutlineClipboardDocumentList, HiOutlineClock, HiOutlineCog6Tooth, HiOutlineCpuChip,
  HiOutlineDocumentChartBar, HiOutlineDocumentDuplicate, HiOutlineDocumentText, HiOutlineEnvelope,
  HiOutlineExclamationTriangle, HiOutlineFlag, HiOutlineFolder, HiOutlineGlobeAlt, HiOutlineHeart,
  HiOutlineHome, HiOutlineInbox, HiOutlineKey, HiOutlineLockClosed, HiOutlineMapPin,
  HiOutlineMegaphone, HiOutlineNewspaper, HiOutlinePhoto, HiOutlinePresentationChartLine,
  HiOutlineQueueList, HiOutlineShieldCheck, HiOutlineSquares2X2, HiOutlineStar, HiOutlineUser,
  HiOutlineUserCircle, HiOutlineUserPlus, HiOutlineUsers, HiOutlineWrench
} from "react-icons/hi2";
import {
  IoAnalyticsOutline, IoBarChartOutline, IoBriefcaseOutline, IoBugOutline, IoBuildOutline,
  IoBusinessOutline, IoCafeOutline, IoCalendarOutline, IoChatbubbleOutline, IoChatbubblesOutline,
  IoCheckboxOutline, IoClipboardOutline, IoCopyOutline, IoDocumentTextOutline, IoDocumentsOutline,
  IoFastFoodOutline, IoFileTrayOutline, IoFlagOutline, IoFolderOutline, IoGitNetworkOutline,
  IoGlobeOutline, IoGridOutline, IoHammerOutline, IoHardwareChipOutline, IoHeartOutline, IoHomeOutline,
  IoImageOutline, IoKeyOutline, IoListOutline, IoLocationOutline, IoLockClosedOutline, IoMailOutline,
  IoMegaphoneOutline, IoNewspaperOutline, IoNotificationsOutline, IoOptionsOutline, IoPeopleOutline,
  IoPersonAddOutline, IoPersonCircleOutline, IoPersonOutline, IoPieChartOutline, IoPulseOutline,
  IoReceiptOutline, IoRestaurantOutline, IoSchoolOutline, IoServerOutline, IoSettingsOutline,
  IoShieldCheckmarkOutline, IoStarOutline, IoStorefrontOutline, IoTimeOutline, IoTrendingUpOutline,
  IoWarningOutline
} from "react-icons/io5";
import {
  BiAlarm, BiArchive, BiBarChartAlt2, BiBell, BiBot, BiBowlRice, BiBriefcase, BiBug, BiBuildings,
  BiCalendar, BiChurch, BiClipboard, BiCoffee, BiCog, BiConversation, BiCopy, BiEnvelope, BiFileBlank,
  BiFlag, BiFolder, BiFolderOpen, BiGlobe, BiGridAlt, BiGroup, BiHeart, BiHome, BiImage, BiKey,
  BiLineChart, BiListCheck, BiListUl, BiLock, BiMapPin, BiMessageRounded, BiNews, BiPieChart, BiPulse,
  BiReceipt, BiRestaurant, BiServer, BiShieldQuarter, BiSitemap, BiSliderAlt, BiStar, BiStore, BiTime,
  BiTrendingUp, BiUser, BiUserCircle, BiUserPlus, BiWrench
} from "react-icons/bi";
import {
  FaArrowTrendUp, FaBell, FaBowlFood, FaBriefcase, FaBug, FaBuilding, FaBullhorn, FaCalendarDays,
  FaChartColumn, FaChartLine, FaChartPie, FaChurch, FaClipboardList, FaClock, FaComment, FaComments,
  FaCopy, FaDatabase, FaEnvelope, FaFileLines, FaFlag, FaFolder, FaFolderOpen, FaGear, FaGlobe,
  FaGraduationCap, FaHammer, FaHeart, FaHeartPulse, FaHouse, FaImage, FaInbox, FaKey, FaList,
  FaListCheck, FaLock, FaMapPin, FaMugHot, FaNewspaper, FaReceipt, FaRobot, FaShieldHalved, FaSitemap,
  FaSliders, FaStar, FaStore, FaTableCellsLarge, FaTriangleExclamation, FaUser, FaUserGear, FaUserPlus,
  FaUsers, FaUtensils, FaWrench
} from "react-icons/fa6";

export type PackKey = "ph" | "ti" | "ri" | "bi" | "ms" | "lu" | "hi" | "io" | "bx" | "fa";

export const ICON_PACKS: { key: PackKey; label: string }[] = [
  { key: "ph", label: "Phosphor" },
  { key: "ti", label: "Tabler" },
  { key: "ri", label: "Remix" },
  { key: "bi", label: "Bootstrap" },
  { key: "ms", label: "Material" },
  { key: "lu", label: "Lucide" },
  { key: "hi", label: "Heroicons" },
  { key: "io", label: "Ionicons" },
  { key: "bx", label: "Boxicons" },
  { key: "fa", label: "Font Awesome" },
];

export interface PackConcept {
  id: string;
  label: string;
  tags: string;
  icons: (IconType | null)[];
}

/** 선택기에 보이는 순서대로 */
export const PACK_CONCEPTS: PackConcept[] = [
  { id: "squares-four", label: "대시보드", tags: "홈 메인 현황 dashboard", icons: [PiSquaresFour, TbLayoutDashboard, RiDashboardLine, BsGrid, MdOutlineDashboard, LuLayoutDashboard, HiOutlineSquares2X2, IoGridOutline, BiGridAlt, FaTableCellsLarge] },
  { id: "house", label: "홈", tags: "메인 처음", icons: [PiHouse, TbHome, RiHomeLine, BsHouse, MdOutlineHome, LuHouse, HiOutlineHome, IoHomeOutline, BiHome, FaHouse] },
  { id: "list", label: "목록", tags: "리스트", icons: [PiList, TbList, RiListUnordered, BsListUl, MdOutlineList, LuList, HiOutlineQueueList, IoListOutline, BiListUl, FaList] },
  { id: "star", label: "즐겨찾기", tags: "별 추천", icons: [PiStar, TbStar, RiStarLine, BsStar, MdOutlineStar, LuStar, HiOutlineStar, IoStarOutline, BiStar, FaStar] },
  { id: "heart", label: "좋아요", tags: "하트 찜", icons: [PiHeart, TbHeart, RiHeartLine, BsHeart, MdOutlineFavorite, LuHeart, HiOutlineHeart, IoHeartOutline, BiHeart, FaHeart] },
  { id: "map-pin", label: "위치", tags: "지도 장소 주변", icons: [PiMapPin, TbMapPin, RiMapPinLine, BsGeoAlt, MdOutlineLocationOn, LuMapPin, HiOutlineMapPin, IoLocationOutline, BiMapPin, FaMapPin] },
  { id: "globe", label: "웹사이트", tags: "글로벌 지구", icons: [PiGlobe, TbWorld, RiGlobalLine, BsGlobe, MdOutlinePublic, LuGlobe, HiOutlineGlobeAlt, IoGlobeOutline, BiGlobe, FaGlobe] },
  { id: "files", label: "게시판", tags: "글 문서 자유게시판", icons: [PiFiles, TbFiles, RiFileCopyLine, BsFiles, MdOutlineFolderCopy, LuFiles, HiOutlineDocumentDuplicate, IoDocumentsOutline, BiFolderOpen, FaFolderOpen] },
  { id: "file-text", label: "문서", tags: "글 게시글 파일", icons: [PiFileText, TbFileText, RiFileTextLine, BsFileEarmarkText, MdOutlineDescription, LuFileText, HiOutlineDocumentText, IoDocumentTextOutline, BiFileBlank, FaFileLines] },
  { id: "newspaper", label: "뉴스", tags: "소식 공지 기사", icons: [PiNewspaper, TbNews, RiNewspaperLine, BsNewspaper, MdOutlineNewspaper, LuNewspaper, HiOutlineNewspaper, IoNewspaperOutline, BiNews, FaNewspaper] },
  { id: "megaphone", label: "공지", tags: "알림 확성기 홍보", icons: [PiMegaphone, TbSpeakerphone, RiMegaphoneLine, BsMegaphone, MdOutlineCampaign, LuMegaphone, HiOutlineMegaphone, IoMegaphoneOutline, null, FaBullhorn] },
  { id: "chats", label: "대화", tags: "채팅 댓글 메시지", icons: [PiChats, TbMessages, RiChat3Line, BsChatDots, MdOutlineForum, LuMessagesSquare, HiOutlineChatBubbleLeftRight, IoChatbubblesOutline, BiConversation, FaComments] },
  { id: "chat-circle", label: "후기", tags: "댓글 리뷰 말풍선", icons: [PiChatCircle, TbMessageCircle, RiMessage3Line, BsChat, MdOutlineChatBubble, LuMessageCircle, HiOutlineChatBubbleOvalLeft, IoChatbubbleOutline, BiMessageRounded, FaComment] },
  { id: "image", label: "이미지", tags: "사진 갤러리", icons: [PiImage, TbPhoto, RiImageLine, BsImage, MdOutlineImage, LuImage, HiOutlinePhoto, IoImageOutline, BiImage, FaImage] },
  { id: "clipboard-text", label: "요청", tags: "신청 추가 요청", icons: [PiClipboardText, TbClipboardList, RiClipboardLine, BsClipboard, MdOutlineAssignment, LuClipboardList, HiOutlineClipboardDocumentList, IoClipboardOutline, BiClipboard, FaClipboardList] },
  { id: "list-checks", label: "검수", tags: "체크 할일 목록", icons: [PiListChecks, TbListCheck, RiCheckboxLine, BsCheck2Square, MdOutlineChecklist, LuListChecks, HiOutlineClipboardDocumentCheck, IoCheckboxOutline, BiListCheck, FaListCheck] },
  { id: "folder", label: "폴더", tags: "분류 묶음", icons: [PiFolder, TbFolder, RiFolderLine, BsFolder, MdOutlineFolder, LuFolder, HiOutlineFolder, IoFolderOutline, BiFolder, FaFolder] },
  { id: "copy", label: "복사", tags: "문서 복제", icons: [PiCopy, TbCopy, RiFileCopy2Line, BsCopy, MdOutlineContentCopy, LuCopy, HiOutlineDocumentDuplicate, IoCopyOutline, BiCopy, FaCopy] },
  { id: "users", label: "사용자", tags: "회원 사람 관리자 그룹", icons: [PiUsers, TbUsers, RiGroupLine, BsPeople, MdOutlineGroup, LuUsers, HiOutlineUsers, IoPeopleOutline, BiGroup, FaUsers] },
  { id: "user", label: "회원", tags: "사람 프로필", icons: [PiUser, TbUser, RiUserLine, BsPerson, MdOutlinePerson, LuUser, HiOutlineUser, IoPersonOutline, BiUser, FaUser] },
  { id: "user-gear", label: "관리자", tags: "권한 운영자 설정", icons: [PiUserGear, TbUserCog, RiUserSettingsLine, BsPersonGear, MdOutlineManageAccounts, LuUserCog, HiOutlineUserCircle, IoPersonCircleOutline, BiUserCircle, FaUserGear] },
  { id: "user-plus", label: "회원 추가", tags: "가입 초대", icons: [PiUserPlus, TbUserPlus, RiUserAddLine, BsPersonPlus, MdOutlinePersonAdd, LuUserPlus, HiOutlineUserPlus, IoPersonAddOutline, BiUserPlus, FaUserPlus] },
  { id: "graduation-cap", label: "학교", tags: "학생 교육 학교 오빠 대학교", icons: [PiGraduationCap, TbSchool, RiGraduationCapLine, BsMortarboard, MdOutlineSchool, LuGraduationCap, HiOutlineAcademicCap, IoSchoolOutline, null, FaGraduationCap] },
  { id: "church", label: "교회", tags: "종교 교회 오빠", icons: [PiChurch, TbBuildingChurch, null, null, MdOutlineChurch, LuChurch, null, null, BiChurch, FaChurch] },
  { id: "buildings", label: "회사", tags: "기업 직장 회사 오빠", icons: [PiBuildings, TbBuilding, RiBuildingLine, BsBuilding, MdOutlineApartment, LuBuilding2, HiOutlineBuildingOffice2, IoBusinessOutline, BiBuildings, FaBuilding] },
  { id: "briefcase", label: "외주", tags: "업무 외주 오빠 비즈니스", icons: [PiBriefcase, TbBriefcase, RiBriefcaseLine, BsBriefcase, MdOutlineWork, LuBriefcase, HiOutlineBriefcase, IoBriefcaseOutline, BiBriefcase, FaBriefcase] },
  { id: "fork-knife", label: "식당", tags: "음식 맛집 맛잘알 레스토랑 식당", icons: [PiForkKnife, TbToolsKitchen2, RiRestaurantLine, BsEggFried, MdOutlineRestaurant, LuUtensilsCrossed, null, IoRestaurantOutline, BiRestaurant, FaUtensils] },
  { id: "coffee", label: "카페", tags: "커피 디저트", icons: [PiCoffee, TbCoffee, RiCupLine, BsCupHot, MdOutlineLocalCafe, LuCoffee, null, IoCafeOutline, BiCoffee, FaMugHot] },
  { id: "storefront", label: "매장", tags: "가게 상점", icons: [PiStorefront, TbBuildingStore, RiStore2Line, BsShop, MdOutlineStorefront, LuStore, HiOutlineBuildingStorefront, IoStorefrontOutline, BiStore, FaStore] },
  { id: "bowl-food", label: "음식", tags: "국밥 한식 요리", icons: [PiBowlFood, TbSoup, RiBowlLine, null, MdOutlineRamenDining, LuSoup, null, IoFastFoodOutline, BiBowlRice, FaBowlFood] },
  { id: "chart-line", label: "접속 분석", tags: "분석 그래프 통계 추이", icons: [PiChartLine, TbChartLine, RiLineChartLine, BsGraphUp, MdOutlineShowChart, LuChartLine, HiOutlinePresentationChartLine, IoAnalyticsOutline, BiLineChart, FaChartLine] },
  { id: "chart-bar", label: "통계", tags: "막대 분석 리포트", icons: [PiChartBar, TbChartBar, RiBarChartLine, BsBarChart, MdOutlineBarChart, LuChartColumn, HiOutlineChartBar, IoBarChartOutline, BiBarChartAlt2, FaChartColumn] },
  { id: "chart-pie", label: "비율", tags: "통계 파이", icons: [PiChartPie, TbChartPie, RiPieChartLine, BsPieChart, MdOutlinePieChart, LuChartPie, HiOutlineChartPie, IoPieChartOutline, BiPieChart, FaChartPie] },
  { id: "trend-up", label: "성장", tags: "상승 추이", icons: [PiTrendUp, TbTrendingUp, RiArrowRightUpLine, BsGraphUpArrow, MdOutlineTrendingUp, LuTrendingUp, HiOutlineArrowTrendingUp, IoTrendingUpOutline, BiTrendingUp, FaArrowTrendUp] },
  { id: "pulse", label: "활동", tags: "로그 모니터링", icons: [PiPulse, TbActivity, RiPulseLine, BsActivity, MdOutlineMonitorHeart, LuActivity, null, IoPulseOutline, BiPulse, FaHeartPulse] },
  { id: "report", label: "리포트", tags: "보고서 분석", icons: [PiPresentationChart, TbReportAnalytics, RiFileChartLine, BsClipboardData, MdOutlineAnalytics, LuFileChartColumn, HiOutlineDocumentChartBar, IoReceiptOutline, BiReceipt, FaReceipt] },
  { id: "gear", label: "설정", tags: "환경 관리 서비스", icons: [PiGear, TbSettings, RiSettings3Line, BsGear, MdOutlineSettings, LuSettings, HiOutlineCog6Tooth, IoSettingsOutline, BiCog, FaGear] },
  { id: "sliders", label: "조정", tags: "필터 옵션", icons: [PiSlidersHorizontal, TbAdjustmentsHorizontal, RiEqualizerLine, BsSliders, MdOutlineTune, LuSlidersHorizontal, HiOutlineAdjustmentsHorizontal, IoOptionsOutline, BiSliderAlt, FaSliders] },
  { id: "wrench", label: "도구", tags: "수리 서비스 관리", icons: [PiWrench, TbTool, RiToolsLine, BsWrench, MdOutlineBuild, LuWrench, HiOutlineWrench, IoBuildOutline, BiWrench, FaWrench] },
  { id: "hammer", label: "작업", tags: "빌드", icons: [PiHammer, TbHammer, RiHammerLine, BsHammer, MdOutlineHandyman, LuHammer, null, IoHammerOutline, null, FaHammer] },
  { id: "tree-structure", label: "메뉴 구조", tags: "트리 계층", icons: [PiTreeStructure, TbSitemap, RiNodeTree, BsDiagram3, MdOutlineAccountTree, LuNetwork, null, IoGitNetworkOutline, BiSitemap, FaSitemap] },
  { id: "database", label: "데이터", tags: "DB 저장소", icons: [PiDatabase, TbDatabase, RiDatabase2Line, BsDatabase, MdOutlineStorage, LuDatabase, HiOutlineCircleStack, IoServerOutline, BiServer, FaDatabase] },
  { id: "robot", label: "크롤러", tags: "자동 봇 수집 크롤링", icons: [PiRobot, TbRobot, RiRobotLine, BsRobot, MdOutlineSmartToy, LuBot, HiOutlineCpuChip, IoHardwareChipOutline, BiBot, FaRobot] },
  { id: "bug", label: "오류", tags: "버그 에러", icons: [PiBug, TbBug, RiBugLine, BsBug, MdOutlineBugReport, LuBug, HiOutlineBugAnt, IoBugOutline, BiBug, FaBug] },
  { id: "shield-check", label: "보안", tags: "권한 인증", icons: [PiShieldCheck, TbShieldCheck, RiShieldCheckLine, BsShieldCheck, MdOutlineVerifiedUser, LuShieldCheck, HiOutlineShieldCheck, IoShieldCheckmarkOutline, BiShieldQuarter, FaShieldHalved] },
  { id: "lock", label: "잠금", tags: "비밀번호", icons: [PiLock, TbLock, RiLockLine, BsLock, MdOutlineLock, LuLock, HiOutlineLockClosed, IoLockClosedOutline, BiLock, FaLock] },
  { id: "key", label: "키", tags: "API 인증", icons: [PiKey, TbKey, RiKey2Line, BsKey, MdOutlineKey, LuKeyRound, HiOutlineKey, IoKeyOutline, BiKey, FaKey] },
  { id: "clock", label: "시간", tags: "기록 히스토리", icons: [PiClock, TbClock, RiTimeLine, BsClock, MdOutlineSchedule, LuClock, HiOutlineClock, IoTimeOutline, BiTime, FaClock] },
  { id: "calendar", label: "일정", tags: "캘린더 날짜", icons: [PiCalendar, TbCalendar, RiCalendarLine, BsCalendar, MdOutlineCalendarMonth, LuCalendarDays, HiOutlineCalendarDays, IoCalendarOutline, BiCalendar, FaCalendarDays] },
  { id: "bell", label: "알림", tags: "푸시 공지", icons: [PiBell, TbBell, RiNotification3Line, BsBell, MdOutlineNotifications, LuBell, HiOutlineBell, IoNotificationsOutline, BiBell, FaBell] },
  { id: "envelope", label: "메일", tags: "이메일 우편", icons: [PiEnvelope, TbMail, RiMailLine, BsEnvelope, MdOutlineMail, LuMail, HiOutlineEnvelope, IoMailOutline, BiEnvelope, FaEnvelope] },
  { id: "tray", label: "받은함", tags: "수신", icons: [PiTray, TbInbox, RiInboxLine, BsInbox, MdOutlineInbox, LuInbox, HiOutlineInbox, IoFileTrayOutline, BiArchive, FaInbox] },
  { id: "flag", label: "신고", tags: "깃발 신고", icons: [PiFlag, TbFlag, RiFlagLine, BsFlag, MdOutlineFlag, LuFlag, HiOutlineFlag, IoFlagOutline, BiFlag, FaFlag] },
  { id: "siren", label: "긴급", tags: "경고 사이렌", icons: [PiSiren, TbUrgent, RiAlarmWarningLine, BsExclamationTriangle, MdOutlineWarning, LuSiren, HiOutlineExclamationTriangle, IoWarningOutline, BiAlarm, FaTriangleExclamation] },
];
