/**
 * 카카오맵 JS SDK 단일 로더.
 *
 * 기존 page.tsx 의 '지도' 탭이 같은 스크립트를 `window.kakaoMapLoading` 플래그로 로드하므로
 * 여기서도 같은 플래그·같은 src 를 사용해 두 탭이 SDK 를 중복 주입하지 않게 한다.
 * (카카오 SDK 는 스크립트를 두 번 넣으면 경고와 함께 동작이 불안정해진다.)
 *
 * 카카오맵 JS SDK 지원 범위(입체 탐색 설계 근거):
 * - 2D 타일 지도(ROADMAP), 스카이뷰(SKYVIEW, 위성 사진), 하이브리드(HYBRID, 위성 + 라벨)
 * - 3D 건물·틸트·회전은 지원하지 않는다 → '입체' 표현은 별도 시뮬레이션 렌더러가 담당
 */

const SDK_SRC = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false&libraries=services,clusterer`;

/** 이미 로딩 중이면 같은 프로미스를 재사용 */
let loadingPromise: Promise<void> | null = null;

/** SDK 가 완전히 준비됐는지 (Map 생성자까지 존재) */
export function isKakaoMapReady(): boolean {
  return typeof window !== 'undefined' && !!window.kakao?.maps?.Map;
}

/**
 * SDK 로드. 성공 시 resolve, 앱키 누락·네트워크 오류·타임아웃 시 reject.
 * 호출부는 reject 를 '지도를 불러오지 못했어요' UI 로 바꿔 보여준다.
 */
export function loadKakaoMapSdk(): Promise<void> {
  if (isKakaoMapReady()) return Promise.resolve();
  if (loadingPromise) return loadingPromise;
  if (typeof window === 'undefined') return Promise.reject(new Error('브라우저 환경이 아닙니다.'));
  if (!process.env.NEXT_PUBLIC_KAKAO_MAP_KEY) {
    return Promise.reject(new Error('카카오맵 앱 키(NEXT_PUBLIC_KAKAO_MAP_KEY)가 설정되지 않았습니다.'));
  }

  loadingPromise = new Promise<void>((resolve, reject) => {
    const w = window as unknown as { kakaoMapLoading?: boolean };

    // 기존 탭이 이미 스크립트를 주입한 경우: 준비될 때까지 폴링 (최대 15초)
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://dapi.kakao.com/v2/maps/sdk.js"]',
    );
    if (w.kakaoMapLoading || existing) {
      const started = Date.now();
      const timer = window.setInterval(() => {
        if (isKakaoMapReady()) {
          window.clearInterval(timer);
          resolve();
        } else if (Date.now() - started > 15000) {
          window.clearInterval(timer);
          loadingPromise = null;
          reject(new Error('카카오맵 SDK 로딩이 지연되고 있습니다.'));
        }
      }, 200);
      return;
    }

    const script = document.createElement('script');
    script.src = SDK_SRC;
    script.async = true;
    w.kakaoMapLoading = true;
    script.onload = () => {
      if (!window.kakao?.maps?.load) {
        w.kakaoMapLoading = false;
        loadingPromise = null;
        reject(new Error('카카오맵 SDK 초기화에 실패했습니다.'));
        return;
      }
      window.kakao.maps.load(() => {
        w.kakaoMapLoading = false;
        resolve();
      });
    };
    script.onerror = () => {
      w.kakaoMapLoading = false;
      loadingPromise = null;
      script.remove();
      reject(new Error('카카오맵 SDK 를 불러오지 못했습니다. 네트워크 상태를 확인해주세요.'));
    };
    document.head.appendChild(script);
  });

  return loadingPromise;
}
