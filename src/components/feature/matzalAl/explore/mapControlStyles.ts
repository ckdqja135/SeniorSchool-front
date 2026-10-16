/**
 * 지도 위에 떠 있는 컨트롤(검색바·카테고리 칩·모드 전환·확대/축소)의 공통 표현 규칙.
 *
 * 마우스를 얹기 전까지 투명도를 낮춰 지도를 넓게 보여준다.
 * - 호버가 없는 모바일에는 걸지 않으므로 `md:`(= useIsDesktop 과 같은 768px)로 제한한다.
 *   레이아웃이 아니라 표현만 바꾸는 효과라, 이 폴더의 JS 분기 관례 대신 CSS 로 둔다.
 *   JS 분기는 SSR 에서 항상 모바일로 먼저 그려져 첫 페인트가 깜빡인다.
 * - 키보드 사용자가 컨트롤을 놓치지 않도록 포커스가 들어와도 또렷해진다.
 */

const BASE = 'transition-opacity duration-200 motion-reduce:transition-none';

/** 혼자 떠 있는 컨트롤(모드 전환, 확대/축소). 자기 위에 마우스가 올라오면 또렷해진다 */
export const MAP_CONTROL_DIM = `${BASE} md:opacity-60 md:hover:opacity-100 md:focus-within:opacity-100`;

/**
 * 여러 줄이 한 덩어리로 같이 밝아져야 하는 컨트롤(상단바의 지역·검색·칩).
 * 부모에 `group` 을 달고 각 줄에 이걸 준다. 부모에 직접 opacity 를 주면 자식이
 * 그보다 진해질 수 없어서, 안내 문구만 예외로 빼낼 수 없다.
 */
export const MAP_CONTROL_DIM_GROUP = `${BASE} md:opacity-60 md:group-hover:opacity-100 md:group-focus-within:opacity-100`;
