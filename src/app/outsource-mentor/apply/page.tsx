'use client';

import OutsourceVendorForm from '@/components/outsource/OutsourceVendorForm';
import { useRouter } from 'next/navigation';

export default function VendorApplyPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-4xl mx-auto px-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center text-gray-600 hover:text-gray-800 transition-colors mb-6"
                >
                    <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15 19l-7-7 7-7"
                        />
                    </svg>
                    뒤로가기
                </button>
            </div>
            <OutsourceVendorForm mode="create" />
        </div>
    );
}

