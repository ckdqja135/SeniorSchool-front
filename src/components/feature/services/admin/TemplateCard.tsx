'use client';

import React from 'react';

interface TemplateCardProps {
  type: 'basic' | 'company' | 'restaurant';
  label: string;
  description: string;
  examples: string;
  features: string[];
  selected: boolean;
  onSelect: () => void;
}

/** Mini wireframe preview for each template type */
const TemplatePreview: React.FC<{ type: 'basic' | 'company' | 'restaurant' }> = ({ type }) => {
  const common = (
    <>
      {/* Header bar */}
      <div className="h-2.5 w-16 bg-gray-300 rounded-sm mb-1.5" />
      {/* 2-col field grid */}
      <div className="grid grid-cols-2 gap-1 mb-1.5">
        <div className="h-2 bg-gray-200 rounded-sm" />
        <div className="h-2 bg-gray-200 rounded-sm" />
        <div className="h-2 bg-gray-200 rounded-sm" />
        <div className="h-2 bg-gray-200 rounded-sm" />
      </div>
      {/* Map placeholder */}
      <div className="h-6 bg-gray-100 rounded-sm border border-dashed border-gray-300 flex items-center justify-center">
        <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
    </>
  );

  if (type === 'basic') {
    return (
      <div className="p-2.5 bg-white rounded-lg border border-gray-100 mb-4">
        <div className="transform scale-100 origin-top-left">
          {common}
          {/* URL button */}
          <div className="mt-1.5 h-2 w-12 bg-blue-200 rounded-sm" />
        </div>
      </div>
    );
  }

  if (type === 'company') {
    return (
      <div className="p-2.5 bg-white rounded-lg border border-gray-100 mb-4">
        <div className="transform scale-100 origin-top-left">
          {common}
          {/* Financial stat cards */}
          <div className="mt-1.5 grid grid-cols-3 gap-1">
            <div className="h-5 bg-purple-100 rounded-sm flex flex-col items-center justify-center">
              <div className="h-1 w-4 bg-purple-300 rounded-sm mb-0.5" />
              <div className="h-1.5 w-3 bg-purple-400 rounded-sm" />
            </div>
            <div className="h-5 bg-purple-100 rounded-sm flex flex-col items-center justify-center">
              <div className="h-1 w-4 bg-purple-300 rounded-sm mb-0.5" />
              <div className="h-1.5 w-3 bg-purple-400 rounded-sm" />
            </div>
            <div className="h-5 bg-purple-100 rounded-sm flex flex-col items-center justify-center">
              <div className="h-1 w-4 bg-purple-300 rounded-sm mb-0.5" />
              <div className="h-1.5 w-3 bg-purple-400 rounded-sm" />
            </div>
          </div>
          <div className="mt-1 grid grid-cols-3 gap-1">
            <div className="h-5 bg-purple-50 rounded-sm flex flex-col items-center justify-center">
              <div className="h-1 w-4 bg-purple-200 rounded-sm mb-0.5" />
              <div className="h-1.5 w-3 bg-purple-300 rounded-sm" />
            </div>
            <div className="h-5 bg-purple-50 rounded-sm flex flex-col items-center justify-center">
              <div className="h-1 w-4 bg-purple-200 rounded-sm mb-0.5" />
              <div className="h-1.5 w-3 bg-purple-300 rounded-sm" />
            </div>
            <div className="h-5 bg-purple-50 rounded-sm flex flex-col items-center justify-center">
              <div className="h-1 w-4 bg-purple-200 rounded-sm mb-0.5" />
              <div className="h-1.5 w-3 bg-purple-300 rounded-sm" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // restaurant
  return (
    <div className="p-2.5 bg-white rounded-lg border border-gray-100 mb-4">
      <div className="transform scale-100 origin-top-left">
        {/* Image banner */}
        <div className="h-8 bg-orange-50 rounded-sm border border-dashed border-orange-200 flex items-center justify-center mb-1.5">
          <svg className="w-4 h-4 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        {/* Star rating */}
        <div className="flex items-center gap-0.5 mb-1.5">
          {[...Array(5)].map((_, i) => (
            <svg key={i} className={`w-2.5 h-2.5 ${i < 4 ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
          <span className="text-[8px] text-gray-400 ml-0.5">4.2</span>
        </div>
        {/* Food type badge + fields */}
        <div className="flex items-center gap-1 mb-1">
          <div className="h-2 w-8 bg-orange-200 rounded-full" />
          <div className="h-2 w-6 bg-gray-200 rounded-sm" />
        </div>
        {/* 2-col fields */}
        <div className="grid grid-cols-2 gap-1 mb-1.5">
          <div className="h-2 bg-gray-200 rounded-sm" />
          <div className="h-2 bg-gray-200 rounded-sm" />
        </div>
        {/* Map */}
        <div className="h-5 bg-gray-100 rounded-sm border border-dashed border-gray-300 flex items-center justify-center">
          <svg className="w-2.5 h-2.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
        </div>
      </div>
    </div>
  );
};

const TemplateCard: React.FC<TemplateCardProps> = ({
  type,
  label,
  description,
  examples,
  features,
  selected,
  onSelect,
}) => {
  const colorMap = {
    basic: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-700', ring: 'ring-blue-500' },
    company: { bg: 'bg-purple-50', border: 'border-purple-500', text: 'text-purple-700', ring: 'ring-purple-500' },
    restaurant: { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-700', ring: 'ring-orange-500' },
  };

  const colors = colorMap[type];

  return (
    <div
      onClick={onSelect}
      className={`relative cursor-pointer rounded-xl border-2 p-6 transition-all duration-200 hover:shadow-lg ${
        selected
          ? `${colors.border} ${colors.bg} ring-2 ${colors.ring}`
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {selected && (
        <div className={`absolute top-3 right-3 w-6 h-6 rounded-full ${colors.border.replace('border', 'bg')} flex items-center justify-center`}>
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      <h3 className={`text-lg font-bold mb-2 ${selected ? colors.text : 'text-gray-900'}`}>
        {label}
      </h3>
      <p className="text-sm text-gray-600 mb-3">{description}</p>

      {/* Mini wireframe preview */}
      <TemplatePreview type={type} />

      <div className="space-y-1 mb-4">
        {features.map((feature, idx) => (
          <div key={idx} className="flex items-center text-xs text-gray-500">
            <svg className="w-3 h-3 mr-1.5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {feature}
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-400">예시: {examples}</p>
      </div>
    </div>
  );
};

export default TemplateCard;
