/**
 * 위치 권한이 없거나 거부됐을 때 수동으로 둘러볼 지역 프리셋.
 * `/restaurant/locations` 는 시/구별 식당 수만 주고 좌표가 없어서, 대표 지점 좌표를 여기서 고정한다.
 * 실제 카카오 지도 렌더러에서만 사용한다 (DEMO 는 가상 동네 단일 영역).
 */
import type { LatLng } from '@/types/MatzalAl/explore';

export interface RegionPreset {
  key: string;
  label: string;
  center: LatLng;
}

/** 기본 시작 위치: 서울광장 한가운데 (열린 광장이라 주변 건물·식당가가 한눈에 들어온다) */
export const DEFAULT_REGION: RegionPreset = {
  key: 'seoul-cityhall',
  label: '서울 중구 (시청)',
  center: { lat: 37.5657, lng: 126.9779 },
};

export const REGION_PRESETS: RegionPreset[] = [
  DEFAULT_REGION,
  { key: 'gangnam', label: '서울 강남역', center: { lat: 37.4979, lng: 127.0276 } },
  { key: 'hongdae', label: '서울 홍대입구', center: { lat: 37.5571, lng: 126.9245 } },
  { key: 'seongsu', label: '서울 성수동', center: { lat: 37.5445, lng: 127.0559 } },
  { key: 'jamsil', label: '서울 잠실', center: { lat: 37.5133, lng: 127.1001 } },
  { key: 'incheon', label: '인천 구월동', center: { lat: 37.4472, lng: 126.7318 } },
  { key: 'daejeon', label: '대전 둔산동', center: { lat: 36.3512, lng: 127.3785 } },
  { key: 'daegu', label: '대구 동성로', center: { lat: 35.8698, lng: 128.5946 } },
  { key: 'gwangju', label: '광주 충장로', center: { lat: 35.1479, lng: 126.9187 } },
  { key: 'busan', label: '부산 서면', center: { lat: 35.1578, lng: 129.0594 } },
  { key: 'jeju', label: '제주시', center: { lat: 33.4996, lng: 126.5312 } },
];
