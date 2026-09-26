/**
 * `/restaurant/nearby` 응답 → 화면용 모델(`ExploreRestaurant`) 어댑터.
 *
 * 백엔드(Backend/service/restaurantService.js getNearbyRestaurants) 기준 사실:
 * - restaurantLatX = 위도, restaurantLatY = 경도 (이름과 반대로 느껴지지만 실제 값이 그렇다: 37.x / 126.x)
 * - distance = km 단위 Haversine, radius 파라미터도 km
 * - restaurantIdx 는 BIGINT → JSON 에서 문자열("174")로 온다
 * - averageRating 은 후기 평점이 없으면 null, ratingCount 는 0
 * - restaurantMenu 는 배열([{name, price}]) 또는 null (모델 getter 가 JSON 파싱)
 * - restaurantImage 는 외부 절대 URL 또는 서버 상대 경로 또는 null
 *
 * 여기서는 좌표 범위 검증(한반도 범위 밖이면 제외), 업종 → 칩 카테고리 정규화,
 * 이미지 URL 보정, 메뉴 파싱만 하고 **없는 값은 채우지 않는다**.
 */
import type {
  ExploreCuisine,
  ExploreMenuItem,
  ExploreRestaurant,
  LatLng,
  PopularReview,
} from '@/types/MatzalAl/explore';

/** 한반도 대략 범위. 이 밖의 좌표는 잘못 입력된 데이터로 보고 지도에 올리지 않는다 */
const KOREA_BOUNDS = { minLat: 33, maxLat: 39.5, minLng: 124, maxLng: 132.5 };

/**
 * 업종 문자열 → 칩 카테고리 매핑 규칙.
 * 실제 데이터의 업종은 '스시/초밥', '해장국/감자탕/국밥'처럼 세분화돼 있어 키워드 포함 여부로 판단한다.
 * 순서가 중요: 앞에 있는 규칙이 먼저 매칭된다 (예: '카페' 가 '한식' 키워드보다 먼저).
 */
const CUISINE_RULES: { cuisine: ExploreCuisine; keywords: string[] }[] = [
  {
    cuisine: '카페',
    keywords: ['카페', '커피', '디저트', '베이커리', '빵', '티하우스', '전통차', '케이크', '아이스크림', '와플', '도넛', '브런치', '떡/다과', '주스'],
  },
  {
    cuisine: '일식',
    keywords: ['일식', '스시', '초밥', '우동', '소바', '돈가스', '카레', '이자카야', '사케', '라멘', '라면', '덮밥', '오마카세', '샤브샤브', '텐동', '규동', '야키토리'],
  },
  {
    cuisine: '중식',
    keywords: ['중식', '중국', '중화', '마라', '딤섬', '짬뽕', '짜장', '양꼬치', '훠궈', '홍콩', '대만'],
  },
  {
    cuisine: '양식',
    keywords: ['양식', '스테이크', '프렌치', '이태리', '이탈리', '파스타', '피자', '햄버거', '버거', '스페인', '멕시', '아메리칸', '그릴', '펍', '바베큐', '독일', '그리스', '터키', '중동'],
  },
  {
    cuisine: '한식',
    keywords: ['한식', '한정식', '국밥', '찌개', '찜', '갈비', '족발', '보쌈', '냉면', '칼국수', '수제비', '국수', '설렁탕', '곰탕', '삼계탕', '백숙', '전골', '수육', '해장국', '감자탕', '만두', '닭', '생선구이', '조림', '장어', '꼼장어', '회', '횟집', '참치', '낙지', '문어', '주꾸미', '해물', '순대', '분식', '떡볶이', '김밥', '김치', '곱창', '막창', '대창', '삼겹살', '고기', '구이', '죽', '쌈', '두부', '비빔밥', '한우', '치킨', '오리', '게', '대게', '조개', '굴', '아구', '복', '추어', '보리밥', '정육', '포차', '주점', '술집', '호프', '맥주', '막걸리', '전', '빈대떡'],
  },
];

/** 원본 업종 문자열을 칩 카테고리로 정규화. 매칭 없으면 '기타' */
export function mapCuisine(typeLabel: string | null | undefined): ExploreCuisine {
  const label = (typeLabel || '').trim();
  if (!label) return '기타';
  for (const rule of CUISINE_RULES) {
    if (rule.keywords.some((k) => label.includes(k))) return rule.cuisine;
  }
  return '기타';
}

/** 이미지 경로 보정: 절대 URL 은 그대로, 상대 경로는 백엔드 URL 과 결합 (기존 page.tsx 규칙과 동일) */
export function resolveImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null;
  const trimmed = String(imagePath).trim();
  if (!trimmed) return null;
  if (/^(https?:)?\/\//.test(trimmed) || trimmed.startsWith('data:')) return trimmed;
  const backendURL = process.env.NEXT_PUBLIC_BASE_URL || '';
  return trimmed.startsWith('/') ? `${backendURL}${trimmed}` : `${backendURL}/${trimmed}`;
}

/** 메뉴 필드 파싱: 배열이면 그대로, JSON 문자열이면 파싱, 그 외는 빈 배열 */
export function parseMenu(raw: unknown): ExploreMenuItem[] {
  let list: unknown = raw;
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list
    .map((item): ExploreMenuItem | null => {
      if (!item || typeof item !== 'object') return null;
      const rec = item as Record<string, unknown>;
      const name = typeof rec.name === 'string' ? rec.name.trim() : '';
      if (!name) return null;
      const priceNum = Number(rec.price);
      return { name, price: Number.isFinite(priceNum) && priceNum > 0 ? priceNum : null };
    })
    .filter((m): m is ExploreMenuItem => m !== null);
}

/** 숫자 변환. 빈 문자열·null·NaN 은 null */
function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** 좌표가 한반도 범위 안인지 검증 */
export function isValidKoreaCoord(lat: number | null, lng: number | null): boolean {
  if (lat === null || lng === null) return false;
  return lat >= KOREA_BOUNDS.minLat && lat <= KOREA_BOUNDS.maxLat && lng >= KOREA_BOUNDS.minLng && lng <= KOREA_BOUNDS.maxLng;
}

/**
 * nearby 응답 1건 정규화. 좌표가 유효하지 않으면 null 을 돌려주고 호출부에서 제외한다.
 * 위/경도가 뒤바뀐 데이터(lat 126.x, lng 37.x)가 섞여 있어도 지도에 올리지 않기 위해 스왑 보정은 하지 않는다.
 */
export function adaptNearbyItem(item: unknown): ExploreRestaurant | null {
  if (!item || typeof item !== 'object') return null;
  const rec = item as Record<string, unknown>;
  const idxRaw = rec.restaurantIdx;
  const restaurantIdx = idxRaw === null || idxRaw === undefined ? null : String(idxRaw);
  const name = typeof rec.restaurantName === 'string' ? rec.restaurantName.trim() : '';
  if (!restaurantIdx || !name) return null;

  const lat = toNumberOrNull(rec.restaurantLatX);
  const lng = toNumberOrNull(rec.restaurantLatY);
  if (lat === null || lng === null || !isValidKoreaCoord(lat, lng)) return null;

  const typeLabel = typeof rec.restaurantType === 'string' && rec.restaurantType.trim() ? rec.restaurantType.trim() : '맛집';
  const averageRatingRaw = toNumberOrNull(rec.averageRating);
  const ratingCount = toNumberOrNull(rec.ratingCount) ?? 0;

  return {
    id: `api:${restaurantIdx}`,
    restaurantIdx,
    name,
    cuisine: mapCuisine(typeLabel),
    typeLabel,
    addr: typeof rec.restaurantAddr === 'string' && rec.restaurantAddr ? rec.restaurantAddr : null,
    imageUrl: resolveImageUrl(typeof rec.restaurantImage === 'string' ? rec.restaurantImage : null),
    menu: parseMenu(rec.restaurantMenu),
    // 평점이 0 이하이거나 후기 수가 0 이면 '평점 없음' 으로 취급 (가짜 평점 방지)
    averageRating:
      averageRatingRaw !== null && averageRatingRaw > 0 && ratingCount > 0
        ? Math.round(averageRatingRaw * 10) / 10
        : null,
    ratingCount,
    distanceKm: toNumberOrNull(rec.distance),
    source: 'api',
    coord: { lat, lng },
  };
}

/** nearby 응답 전체 정규화. 배열/`{data: []}` 두 형태 모두 허용, 중복 idx 제거 */
export function adaptNearbyResponse(raw: unknown): ExploreRestaurant[] {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)
      ? (raw as { data: unknown[] }).data
      : [];
  const seen = new Set<string>();
  const result: ExploreRestaurant[] = [];
  for (const item of list) {
    const adapted = adaptNearbyItem(item);
    if (!adapted || seen.has(adapted.id)) continue;
    seen.add(adapted.id);
    result.push(adapted);
  }
  return result;
}

/** Haversine 거리(km). 백엔드와 같은 지구 반지름(6371km) 사용 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** 거리 표시 문자열: 1km 미만은 m, 이상은 소수 1자리 km */
export function formatDistance(km: number | null | undefined): string | null {
  if (km === null || km === undefined || !Number.isFinite(km)) return null;
  if (km < 1) return `${Math.max(1, Math.round(km * 1000))}m`;
  return `${km.toFixed(1)}km`;
}

/**
 * 화면에 표시할 거리(km).
 * 사용자 위치가 있으면 사용자 기준으로 재계산하고, 없으면 API 가 준 조회 중심 기준 거리를 쓴다.
 * DEMO 데이터는 목업 거리(distanceKm)를 그대로 사용한다.
 */
export function displayDistanceKm(r: ExploreRestaurant, userLocation: LatLng | null): number | null {
  if (r.source === 'api' && r.coord && userLocation) return haversineKm(userLocation, r.coord);
  return r.distanceKm;
}

/** 기존 상세 페이지 이동 규칙(page.tsx handleSuggestionClick 등)과 동일한 URL 생성 */
export function buildRestaurantDetailHref(r: ExploreRestaurant): string | null {
  if (r.source !== 'api' || !r.restaurantIdx) return null;
  const params = new URLSearchParams();
  params.append('restaurantIdx', r.restaurantIdx);
  if (r.addr) params.append('restaurantAddr', r.addr);
  return `/matzal-al-mentor/${encodeURIComponent(r.name)}?${params.toString()}`;
}

/**
 * `/restaurant/board/top-viewed` 응답 1건 → 인기 후기 항목.
 * 식당명은 include 된 `restaurant.restaurantName` 우선, 평면 `restaurantName` 도 허용.
 */
export function adaptPopularReview(item: unknown): PopularReview | null {
  if (!item || typeof item !== 'object') return null;
  const rec = item as Record<string, unknown>;
  const boardIdx = toNumberOrNull(rec.boardIdx);
  if (boardIdx === null) return null;
  const nested = rec.restaurant && typeof rec.restaurant === 'object' ? (rec.restaurant as Record<string, unknown>) : null;
  const nameRaw = nested?.restaurantName ?? rec.restaurantName;
  const idxRaw = rec.restaurantIdx;
  return {
    boardIdx,
    title: typeof rec.boardTitle === 'string' && rec.boardTitle.trim() ? rec.boardTitle.trim() : '제목 없음',
    restaurantIdx: idxRaw === null || idxRaw === undefined || idxRaw === '' ? null : String(idxRaw),
    restaurantName: typeof nameRaw === 'string' && nameRaw.trim() ? nameRaw.trim() : null,
    likeCount: toNumberOrNull(rec.boardLike) ?? 0,
    hitCount: toNumberOrNull(rec.boardHits) ?? 0,
  };
}
