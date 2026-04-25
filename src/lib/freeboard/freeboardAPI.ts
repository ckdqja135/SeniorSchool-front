const API_BASE = process.env.NEXT_PUBLIC_BASE_URL;

if (!API_BASE) {
  throw new Error('NEXT_PUBLIC_BASE_URL environment variable is not set');
}

function api(path: string): string {
  return `${API_BASE}${path}`;
}

// In-flight de-duplication (JSON-level) to avoid duplicate concurrent requests/body reuse
const inFlightJson: Map<string, Promise<any>> = new Map();

async function fetchJson(url: string, options: RequestInit = {}): Promise<any> {
  const key = `${options.method || 'GET'} ${url} ${options.body ? JSON.stringify(options.body) : ''}`;
  const existing = inFlightJson.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const res = await fetch(url, { next: { revalidate: 60 }, ...options });
    if (!res.ok) {
      let message = '요청에 실패했습니다.';
      try {
        const text = await res.text();
        message = text || message;
      } catch {}
      throw new Error(message);
    }
    return res.json();
  })().finally(() => {
    inFlightJson.delete(key);
  });

  inFlightJson.set(key, promise);
  return promise;
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  sort?: 'latest' | 'popular' | 'oldest';
}

export async function fetchFreeboardList(params: ListParams = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.category) query.set('category', params.category);
  if (params.sort) query.set('sort', params.sort);

  return fetchJson(api(`/freeboard${query.toString() ? `?${query.toString()}` : ''}`));
}

export async function fetchFreeboardDetail(id: number | string) {
  return fetchJson(api(`/freeboard/${id}`));
}

export interface CreatePostBody {
  boardTitle: string;
  boardContent: string;
  category: string;
  boardID?: string;
  tags?: string[];
  boardPW: string;
}

export async function createFreeboardPost(body: CreatePostBody) {
  const res = await fetchJson(api('/freeboard'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ boards: [body] }),
  });
  return res;
}


export async function likeFreeboardPost(id: number | string, isLiked: boolean) {
  const payload = { isLiked: !!isLiked };
  return fetchJson(api(`/freeboard/${id}/like`), { 
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function hitFreeboardPost(id: number | string) {
  return fetchJson(api(`/freeboard/${id}/hit`), { method: 'POST' });
}

export interface CreateCommentBody {
  commentContent: string;
  commentParent?: number;
  commentPassword: string;
  commentWriter: string;
}

export async function createFreeboardComment(id: number | string, body: CreateCommentBody) {
  const res = await fetchJson(api(`/freeboard/${id}/comments`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res;
}

export async function likeFreeboardComment(commentId: number | string) {
  return fetchJson(api(`/freeboard/comments/${commentId}/like`), { method: 'POST' });
}

export interface UpdateCommentBody {
  commentContent: string;
  writerId: string;
  writerPw: string;
}

export async function updateFreeboardComment(commentId: number | string, body: UpdateCommentBody) {
  const res = await fetchJson(api(`/freeboard/comments/${commentId}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res;
}

export interface DeleteCommentBody {
  writerId: string;
  writerPw: string;
}

export async function deleteFreeboardComment(commentId: number | string, body: DeleteCommentBody) {
  const res = await fetchJson(api(`/freeboard/comments/${commentId}`), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res;
}

export interface UpdateBoardBody {
  boardTitle: string;
  boardContent: string;
  category: string;
  tags?: string[];
  boardID: string;
  boardPW: string;
}

export async function updateFreeboardPost(id: number | string, body: UpdateBoardBody) {
  const res = await fetchJson(api(`/freeboard/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res;
}

export interface DeleteBoardBody {
  boardID: string;
  boardPW: string;
}

export async function deleteFreeboardPost(id: number | string, body: DeleteBoardBody) {
  const res = await fetchJson(api(`/freeboard/${id}`), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res;
}

export async function fetchFreeboardStats() {
  return fetchJson(api('/freeboard/stats'));
}

export async function fetchFreeboardCategories() {
  const response = await fetchFreeboardStats();
  return response.data?.topCategories || [];
}

export async function fetchFreeboardTags() {
  const response = await fetchFreeboardStats();
  return response.data?.topTags || [];
}

export async function fetchRecentFreeboardPosts() {
  return fetchJson(api('/freeboard/recent'));
}

export async function fetchBestPosts() {
  const response = await fetchJson(api('/best-posts'));
  
  // API 응답의 board_type을 boardType으로 변환
  if (response && response.data) {
    response.data = response.data.map((post: any) => ({
      ...post,
      boardType: post.board_type,
      weightedScore: post.weighted_score
    }));
  }
  
  return response;
}


