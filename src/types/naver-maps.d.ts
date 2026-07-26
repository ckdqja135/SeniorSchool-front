declare namespace naver.maps {
  namespace Service {
    interface GeocodeResponse {
      v2: {
        status: {
          code: number;
          name: string;
          message: string;
        };
        meta: {
          totalCount: number;
          page: number;
          count: number;
        };
        addresses: GeocodeAddress[];
      };
    }

    interface GeocodeAddress {
      roadAddress: string;
      jibunAddress: string;
      englishAddress: string;
      x: string;
      y: string;
      addressElements: {
        code: string;
        longName: string;
        shortName: string;
        types: string[];
      }[];
    }

    interface GeocodeOptions {
      query: string;
      coordinate?: string;
      filter?: string;
      page?: number;
      count?: number;
    }

    type GeocodeCallback = (
      status: number,
      response: GeocodeResponse
    ) => void;

    function geocode(
      options: GeocodeOptions,
      callback: GeocodeCallback
    ): void;

    const Status: {
      OK: number;
      ERROR: number;
    };
  }
}
