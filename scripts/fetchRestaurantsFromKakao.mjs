// Usage:
// 1) Set env vars:
//    - KAKAO_REST_API_KEY=... (필수)
//    - ORI_ADMIN_ACCESS_TOKEN=... (선택, 업로드 시 필요)
// 2) Run:
//    node scripts/fetchRestaurantsFromKakao.mjs --count=50 [--upload]

const API_BASE_URL = "https://api.reviewhub.life";

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { count: 50, upload: false };
  for (const a of args) {
    if (a.startsWith("--count=")) out.count = parseInt(a.split("=")[1], 10) || 50;
    if (a === "--upload") out.upload = true;
  }
  return out;
}

function mapToRestaurant(doc) {
  // Kakao Local fields: place_name, address_name(지번), road_address_name(도로명), x(lon), y(lat), place_url, category_name
  const addr = doc.road_address_name || doc.address_name || "";
  const lotAddr = doc.address_name || "";
  // restaurantLocation: 서울시 구 단위로 요약
  const location = addr ? addr.split(" ").slice(0, 2).join(" ") : "서울특별시";
  const type = (doc.category_name || "").split(" > ")[1] || (doc.category_name || "음식점");
  return {
    restaurantName: doc.place_name || "",
    restaurantLocation: location,
    restaurantType: type,
    restaurantEstablished: "",
    restaurantOwner: "",
    restaurantLatX: doc.y ? Number(doc.y) : 0,
    restaurantLatY: doc.x ? Number(doc.x) : 0,
    restaurantURL: doc.place_url || "",
    restaurantLotAddr: lotAddr,
    restaurantAddr: addr,
    restaurantMapIMG: "",
  };
}

async function fetchByKeywordRadius(key, targetCount) {
  const headers = { Authorization: `KakaoAK ${key}` };
  const results = [];
  const seen = new Set();
  const x = 126.9780; // lon (서울시청)
  const y = 37.5665;  // lat
  const radius = 20000; // 최대 20km
  let page = 1;
  while (results.length < targetCount && page <= 45) {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent("식당")}&x=${x}&y=${y}&radius=${radius}&page=${page}&size=15`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      let body = ""; try { body = await res.text(); } catch {}
      throw new Error(`Kakao API error ${res.status}: ${body}`);
    }
    const data = await res.json();
    const docs = data.documents || [];
    for (const d of docs) {
      const id = String(d.id);
      if (seen.has(id)) continue;
      seen.add(id);
      results.push(mapToRestaurant(d));
      if (results.length >= targetCount) break;
    }
    if (data.meta && data.meta.is_end) break;
    page += 1;
  }
  return results;
}

async function fetchByCategoryRect(key, targetCount) {
  const headers = { Authorization: `KakaoAK ${key}` };
  const results = [];
  const seen = new Set();
  // 서울시 전체 사각형(대략): x1(left lon), y1(bottom lat), x2(right lon), y2(top lat)
  const rect = {
    left: 126.734086,
    bottom: 37.413294,
    right: 127.269311,
    top: 37.715133,
  };
  let page = 1;
  while (results.length < targetCount && page <= 45) {
    const url = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=FD6&rect=${rect.left},${rect.bottom},${rect.right},${rect.top}&page=${page}&size=15`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      let body = ""; try { body = await res.text(); } catch {}
      throw new Error(`Kakao API error ${res.status}: ${body}`);
    }
    const data = await res.json();
    const docs = data.documents || [];
    for (const d of docs) {
      const id = String(d.id);
      if (seen.has(id)) continue;
      seen.add(id);
      results.push(mapToRestaurant(d));
      if (results.length >= targetCount) break;
    }
    if (data.meta && data.meta.is_end) break;
    page += 1;
  }
  return results;
}

async function fetchKakao({ targetCount = 50 }) {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) throw new Error("KAKAO_REST_API_KEY env is required");
  // 1) 카테고리+사각형으로 광범위 수집 → 부족하면 2) 키워드+반경으로 보강
  const list1 = await fetchByCategoryRect(key, targetCount);
  if (list1.length >= targetCount) return list1.slice(0, targetCount);
  const list2 = await fetchByKeywordRadius(key, targetCount - list1.length);
  return [...list1, ...list2].slice(0, targetCount);
}

async function uploadAll(list) {
  const token = process.env.ORI_ADMIN_ACCESS_TOKEN;
  if (!token) throw new Error("ORI_ADMIN_ACCESS_TOKEN env is required for upload");
  for (const r of list) {
    const res = await fetch(`${API_BASE_URL}/admin/restaurant/createRestaurant`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(r),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upload failed: ${res.status} ${text}`);
    }
  }
}

(async () => {
  try {
    const { count, upload } = parseArgs();
    const list = await fetchKakao({ targetCount: count });
    if (upload) {
      await uploadAll(list);
      console.log(`Uploaded ${list.length} restaurants successfully.`);
    } else {
      console.log(JSON.stringify(list, null, 2));
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();


