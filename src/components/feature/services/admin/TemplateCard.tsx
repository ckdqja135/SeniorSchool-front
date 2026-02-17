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
      <p className="text-sm text-gray-600 mb-4">{description}</p>

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
