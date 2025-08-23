declare global {
  interface Window {
    kakao: any;
  }
}

export interface KakaoMap {
  setCenter: (latlng: any) => void;
  setLevel: (level: number) => void;
  getLevel: () => number;
}

export interface KakaoLatLng {
  getLat: () => number;
  getLng: () => number;
}

export interface KakaoMarker {
  setMap: (map: KakaoMap | null) => void;
  setPosition: (latlng: KakaoLatLng) => void;
}

export interface KakaoInfoWindow {
  open: (map: KakaoMap, marker: KakaoMarker) => void;
  close: () => void;
  setContent: (content: string) => void;
}
