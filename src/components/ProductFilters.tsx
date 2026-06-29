"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface FilterProps {
  // Price
  minPrice: number;
  maxPrice: number;
  priceRange: [number, number];
  onPriceChange: (range: [number, number]) => void;
  
  // Fabric
  availableFabrics: string[];
  selectedFabrics: string[];
  onFabricChange: (fabrics: string[]) => void;
  
  // Color
  availableColors: { name: string; hex: string }[];
  selectedColors: string[];
  onColorChange: (colors: string[]) => void;
  
  // Stock
  showOutOfStock: boolean;
  onStockChange: (show: boolean) => void;
  
  // Clear all
  onClearAll: () => void;
  
  // Active filter count
  activeFilterCount: number;
}

export default function ProductFilters({
  minPrice,
  maxPrice,
  priceRange,
  onPriceChange,
  availableFabrics,
  selectedFabrics,
  onFabricChange,
  availableColors,
  selectedColors,
  onColorChange,
  showOutOfStock,
  onStockChange,
  onClearAll,
  activeFilterCount
}: FilterProps) {
  const [expandedSections, setExpandedSections] = useState({
    price: true,
    fabric: true,
    color: true,
    stock: true
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleFabricToggle = (fabric: string) => {
    if (selectedFabrics.includes(fabric)) {
      onFabricChange(selectedFabrics.filter(f => f !== fabric));
    } else {
      onFabricChange([...selectedFabrics, fabric]);
    }
  };

  const handleColorToggle = (colorName: string) => {
    if (selectedColors.includes(colorName)) {
      onColorChange(selectedColors.filter(c => c !== colorName));
    } else {
      onColorChange([...selectedColors, colorName]);
    }
  };

  return (
    <aside className="w-full md:w-72 flex-shrink-0 bg-white border-r border-gray-200 h-full overflow-y-auto overflow-x-hidden">
      {/* Filter Header */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          {activeFilterCount > 0 && (
            <button
              onClick={onClearAll}
              className="text-sm text-[#9A7B4F] hover:text-[#1A1A1A] font-medium flex items-center gap-1"
            >
              Clear All
              <span className="bg-[#F0EBDD] text-[#7A2E2E] text-xs rounded-full px-2 py-0.5">
                {activeFilterCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Sections */}
      <div className="divide-y divide-gray-200">
        
        {/* Price Range Filter */}
        <div className="p-4">
          <button
            onClick={() => toggleSection('price')}
            className="w-full flex items-center justify-between mb-3"
          >
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Price Range
            </h3>
            {expandedSections.price ? (
              <ChevronUp size={16} className="text-gray-500" />
            ) : (
              <ChevronDown size={16} className="text-gray-500" />
            )}
          </button>
          
          {expandedSections.price && (
            <div className="space-y-4">
              {/* Price Range Slider */}
              <div className="px-1">
                <input
                  type="range"
                  min={minPrice}
                  max={maxPrice}
                  value={priceRange[1]}
                  onChange={(e) => onPriceChange([priceRange[0], parseInt(e.target.value)])}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900"
                />
              </div>
              
              {/* Price Display */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex flex-col">
                  <span className="text-gray-500 text-xs">Min</span>
                  <span className="font-medium text-gray-900">₹{priceRange[0].toLocaleString()}</span>
                </div>
                <div className="text-gray-400">—</div>
                <div className="flex flex-col text-right">
                  <span className="text-gray-500 text-xs">Max</span>
                  <span className="font-medium text-gray-900">₹{priceRange[1].toLocaleString()}</span>
                </div>
              </div>
              
              {/* Quick Price Filters */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Under ₹2,000', max: 2000 },
                  { label: '₹2,000 - ₹3,000', min: 2000, max: 3000 },
                  { label: 'Above ₹3,000', min: 3000 }
                ].map((range) => (
                  <button
                    key={range.label}
                    onClick={() => onPriceChange([range.min || minPrice, range.max || maxPrice])}
                    className="text-xs px-3 py-1.5 border border-gray-300 rounded-full hover:border-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fabric Type Filter */}
        {availableFabrics.length > 0 && (
          <div className="p-4">
            <button
              onClick={() => toggleSection('fabric')}
              className="w-full flex items-center justify-between mb-3"
            >
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Fabric Type
              </h3>
              {expandedSections.fabric ? (
                <ChevronUp size={16} className="text-gray-500" />
              ) : (
                <ChevronDown size={16} className="text-gray-500" />
              )}
            </button>
            
            {expandedSections.fabric && (
              <div className="space-y-2">
                {availableFabrics.map((fabric) => (
                  <label
                    key={fabric}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFabrics.includes(fabric)}
                      onChange={() => handleFabricToggle(fabric)}
                      className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                      {fabric}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Color Filter */}
        {availableColors.length > 0 && (
          <div className="p-4">
            <button
              onClick={() => toggleSection('color')}
              className="w-full flex items-center justify-between mb-3"
            >
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Color
              </h3>
              {expandedSections.color ? (
                <ChevronUp size={16} className="text-gray-500" />
              ) : (
                <ChevronDown size={16} className="text-gray-500" />
              )}
            </button>
            
            {expandedSections.color && (
              <div className="space-y-2">
                {availableColors.map((color) => (
                  <label
                    key={color.name}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={selectedColors.includes(color.name)}
                      onChange={() => handleColorToggle(color.name)}
                      className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className="w-5 h-5 rounded-full border border-gray-300"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">
                        {color.name}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stock Availability Filter */}
        <div className="p-4">
          <button
            onClick={() => toggleSection('stock')}
            className="w-full flex items-center justify-between mb-3"
          >
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Availability
            </h3>
            {expandedSections.stock ? (
              <ChevronUp size={16} className="text-gray-500" />
            ) : (
              <ChevronDown size={16} className="text-gray-500" />
            )}
          </button>
          
          {expandedSections.stock && (
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={!showOutOfStock}
                onChange={(e) => onStockChange(!e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">
                Hide Out of Stock
              </span>
            </label>
          )}
        </div>
      </div>
    </aside>
  );
}
