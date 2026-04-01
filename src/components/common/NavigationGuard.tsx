"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface NavigationGuardContextValue {
  setDirty: (dirty: boolean, mode?: "add" | "edit") => void;
  requestNavigation: (href: string) => void;
}

const NavigationGuardContext = createContext<NavigationGuardContextValue>({
  setDirty: () => {},
  requestNavigation: () => {},
});

export const useNavigationGuard = () => useContext(NavigationGuardContext);

export const NavigationGuardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [isDirty, setIsDirty] = useState(false);
  const [dirtyMode, setDirtyMode] = useState<"add" | "edit">("add");
  const [showModal, setShowModal] = useState(false);
  const pendingHref = useRef<string | null>(null);

  const setDirty = useCallback((dirty: boolean, mode: "add" | "edit" = "add") => {
    setIsDirty(dirty);
    setDirtyMode(mode);
  }, []);

  const requestNavigation = useCallback((href: string) => {
    if (isDirty) {
      pendingHref.current = href;
      setShowModal(true);
    } else {
      router.push(href);
    }
  }, [isDirty, router]);

  const handleConfirm = () => {
    setIsDirty(false);
    setShowModal(false);
    if (pendingHref.current) {
      router.push(pendingHref.current);
      pendingHref.current = null;
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    pendingHref.current = null;
  };

  return (
    <NavigationGuardContext.Provider value={{ setDirty, requestNavigation }}>
      {children}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">
              {dirtyMode === "add" ? "추가 취소" : "수정 취소"}
            </h3>
            <p className="text-sm text-gray-500 text-center mb-5">
              {dirtyMode === "add" ? "현재 입력하신 부분이 취소됩니다." : "현재 수정이 취소됩니다."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2.5 bg-rose-600 text-white text-sm font-medium rounded-xl hover:bg-rose-700 transition-colors"
              >
                확인
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2.5 text-gray-600 text-sm font-medium bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </NavigationGuardContext.Provider>
  );
};
