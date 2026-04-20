const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

if (!BASE_URL) {
  throw new Error('NEXT_PUBLIC_BASE_URL environment variable is not set');
}

export type RequestServiceKey = 'church' | 'restaurant' | 'outsource' | 'comp' | 'univ';
export type RequestStatus = 'pending' | 'completed' | 'rejected';

export interface RecentRequestItem {
  service: RequestServiceKey;
  serviceLabel: string;
  requestIdx: number;
  name: string;
  requestStatus: RequestStatus;
  requestDate: string;
  processedDate: string | null;
}

interface RecentRequestsResponse {
  status: number;
  data: RecentRequestItem[];
  totalCount: number;
}

export const fetchRecentRequests = async (limit = 15): Promise<RecentRequestItem[]> => {
  const url = `${BASE_URL}/requests/recent?limit=${limit}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`신청 현황을 불러오지 못했습니다. (status: ${res.status})`);
  }
  const json = (await res.json()) as RecentRequestsResponse;
  return json.data || [];
};
