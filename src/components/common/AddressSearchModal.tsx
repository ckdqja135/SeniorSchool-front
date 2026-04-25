"use client";

import React, { useState } from "react";

export interface AddressResult {
  roadAddress: string;
  jibunAddress: string;
  latitude: number;
  longitude: number;
  placeName?: string;
}

interface NaverLocalItem {
  title: string;
  roadAddress: string;
  address: string;
  mapx: string;
  mapy: string;
  category: string;
  telephone: string;
}

interface AddressSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (result: AddressResult) => void;
}

const stripHtml = (str: string) => str.replace(/<[^>]*>/g, "");

const AddressSearchModal: React.FC<AddressSearchModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [tab, setTab] = useState<"address" | "place">("place");
  const [query, setQuery] = useState("");
  const [addressResults, setAddressResults] = useState<naver.maps.Service.GeocodeAddress[]>([]);
  const [placeResults, setPlaceResults] = useState<NaverLocalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setSearched(true);

    try {
      if (tab === "address") {
        const response = await fetch(`/api/geocode?query=${encodeURIComponent(query.trim())}`);
        if (!response.ok) throw new Error("주소 검색에 실패했습니다.");
        const data = await response.json();
        setAddressResults(data.addresses || []);
        setPlaceResults([]);
      } else {
        const response = await fetch(`/api/local-search?query=${encodeURIComponent(query.trim())}`);
        if (!response.ok) throw new Error("장소 검색에 실패했습니다.");
        const data = await response.json();
        setPlaceResults(data.items || []);
        setAddressResults([]);
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("검색 중 오류가 발생했습니다. 다시 시도해주세요.");
      setAddressResults([]);
      setPlaceResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAddress = (addr: naver.maps.Service.GeocodeAddress) => {
    onSelect({
      roadAddress: addr.roadAddress || "",
      jibunAddress: addr.jibunAddress || "",
      latitude: parseFloat(addr.y),
      longitude: parseFloat(addr.x),
    });
    handleClose();
  };

  const handleSelectPlace = (item: NaverLocalItem) => {
    const longitude = parseInt(item.mapx) / 1e7;
    const latitude = parseInt(item.mapy) / 1e7;
    const placeName = stripHtml(item.title);
    const roadAddress = (item.roadAddress || item.address || "").replace(placeName, "").trim();
    const jibunAddress = (item.address || "").replace(placeName, "").trim();
    onSelect({
      roadAddress,
      jibunAddress,
      latitude,
      longitude,
      placeName,
    });
    handleClose();
  };

  const handleClose = () => {
    setQuery("");
    setAddressResults([]);
    setPlaceResults([]);
    setError("");
    setSearched(false);
    onClose();
  };

  const handleTabChange = (newTab: "address" | "place") => {
    setTab(newTab);
    setQuery("");
    setAddressResults([]);
    setPlaceResults([]);
    setError("");
    setSearched(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">검색</h3>
            <p className="text-xs text-gray-400 mt-0.5">장소명 또는 주소로 검색하세요</p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 검색 입력 */}
        <div className="p-5 pb-3">
          <div className="flex gap-2">
            <select
              value={tab}
              onChange={(e) => handleTabChange(e.target.value as "address" | "place")}
              className="shrink-0 px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all cursor-pointer"
            >
              <option value="place">장소명 검색</option>
              <option value="address">주소 검색</option>
            </select>
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={tab === "place" ? "학교명, 식당명, 회사명 등 검색..." : "도로명, 지번, 건물명 검색..."}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                autoFocus
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? "검색중..." : "검색"}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-rose-500">{error}</p>}
        </div>

        {/* 검색 결과 */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <p className="text-sm text-gray-400">검색 중...</p>
            </div>
          ) : tab === "place" && placeResults.length > 0 ? (
            <div className="space-y-2">
              {placeResults.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPlace(item)}
                  className="w-full text-left p-3.5 border border-gray-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/50 transition-all"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900">{stripHtml(item.title)}</span>
                    {item.category && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-indigo-100 text-indigo-700 rounded">
                        {item.category.split(">").pop()?.trim()}
                      </span>
                    )}
                  </div>
                  {item.roadAddress && (
                    <div className="flex items-start gap-2 mt-1">
                      <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded">도로명</span>
                      <span className="text-xs text-gray-500">{item.roadAddress}</span>
                    </div>
                  )}
                  {item.telephone && (
                    <p className="text-xs text-gray-400 mt-1">{item.telephone}</p>
                  )}
                </button>
              ))}
            </div>
          ) : tab === "address" && addressResults.length > 0 ? (
            <div className="space-y-2">
              {addressResults.map((addr, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectAddress(addr)}
                  className="w-full text-left p-3.5 border border-gray-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group"
                >
                  {addr.roadAddress && (
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-indigo-100 text-indigo-700 rounded">도로명</span>
                      <span className="text-sm text-gray-900">{addr.roadAddress}</span>
                    </div>
                  )}
                  {addr.jibunAddress && (
                    <div className="flex items-start gap-2 mt-1.5">
                      <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded">지번</span>
                      <span className="text-sm text-gray-500">{addr.jibunAddress}</span>
                    </div>
                  )}
                  <div className="mt-1.5 text-xs text-gray-400">
                    위도: {addr.y}, 경도: {addr.x}
                  </div>
                </button>
              ))}
            </div>
          ) : searched ? (
            <div className="flex flex-col items-center justify-center py-10">
              <svg className="w-10 h-10 text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-400">검색 결과가 없습니다.</p>
              <p className="text-xs text-gray-300 mt-1">다른 키워드로 검색해보세요.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10">
              <svg className="w-10 h-10 text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm text-gray-400">
                {tab === "place" ? "학교명, 식당명 등으로 검색해보세요." : "주소를 검색해주세요."}
              </p>
              <p className="text-xs text-gray-300 mt-1">
                {tab === "place" ? "장소명을 선택하면 주소와 좌표가 자동으로 입력됩니다." : "도로명, 지번, 건물명으로 검색할 수 있습니다."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddressSearchModal;
