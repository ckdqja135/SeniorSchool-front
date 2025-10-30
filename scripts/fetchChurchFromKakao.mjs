// Usage:
// 1) Set env vars:
//    - KAKAO_REST_API_KEY=... (필수)
//    - ORI_ADMIN_ACCESS_TOKEN=... (선택, 업로드 시 필요)
// 2) Run:
//    node scripts/fetchChurchFromKakao.mjs --keyword="여의도순복음교회" [--count=1] [--upload]

const API_BASE_URL = "https://api.reviewhub.life";

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { keyword: "", count: 1, upload: false };
  for (const a of args) {
    if (a.startsWith("--keyword=")) out.keyword = a.split("=")[1] || "";
    if (a.startsWith("--count=")) out.count = parseInt(a.split("=")[1], 10) || 1;
    if (a === "--upload") out.upload = true;
  }
  return out;
}

function mapToChurch(doc) {
  const addr = doc.road_address_name || doc.address_name || "";
  const lotAddr = doc.address_name || "";
  const location = addr ? addr.split(" ").slice(0, 2).join(" ") : "서울특별시";
  return {
    churchName: doc.place_name || "",
    churchLocation: location,
    churchType: "",
    churchEstablished: "",
    churchPastor: "",
    churchLatX: doc.y ? Number(doc.y) : 0,
    churchLatY: doc.x ? Number(doc.x) : 0,
    churchURL: doc.place_url || "",
    churchLotAddr: lotAddr,
    churchAddr: addr,
    churchMapIMG: "",
    churchStatus: 1,
  };
}

async function searchChurches(keyword, targetCount, key) {
  if (!keyword) throw new Error("--keyword is required");
  const headers = { Authorization: `KakaoAK ${key}` };
  const results = [];
  let page = 1;
  while (results.length < targetCount && page <= 45) {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(keyword)}&page=${page}&size=15`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      let body = ""; try { body = await res.text(); } catch {}
      throw new Error(`Kakao API error ${res.status}: ${body}`);
    }
    const data = await res.json();
    const docs = data.documents || [];
    for (const d of docs) {
      results.push(mapToChurch(d));
      if (results.length >= targetCount) break;
    }
    if (data.meta && data.meta.is_end) break;
    page += 1;
  }
  return results.slice(0, targetCount);
}

async function uploadAll(list) {
  const token = process.env.ORI_ADMIN_ACCESS_TOKEN;
  if (!token) throw new Error("ORI_ADMIN_ACCESS_TOKEN env is required for upload");
  for (const c of list) {
    const res = await fetch(`${API_BASE_URL}/admin/church/createChurch`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(c),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upload failed: ${res.status} ${text}`);
    }
  }
}

(async () => {
  try {
    const { keyword, count, upload } = parseArgs();
    const key = process.env.KAKAO_REST_API_KEY;
    if (!key) throw new Error("KAKAO_REST_API_KEY env is required");
    const list = await searchChurches(keyword, count, key);
    if (upload) {
      await uploadAll(list);
      console.log(`Uploaded ${list.length} churches successfully.`);
    } else {
      console.log(JSON.stringify(list, null, 2));
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();


