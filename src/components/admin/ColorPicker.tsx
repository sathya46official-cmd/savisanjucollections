"use client";

import { useState, useEffect } from "react";

interface ColorPickerProps {
  value: string;
  onChange: (hexCode: string) => void;
  label?: string;
}

export default function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [hexCode, setHexCode] = useState(value || "#000000");
  const [error, setError] = useState("");

  useEffect(() => {
    if (value) {
      // Sync controlled prop value into local input state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHexCode(value);
    }
  }, [value]);

  const validateHexCode = (hex: string): boolean => {
    return /^#[0-9A-Fa-f]{6}$/.test(hex);
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setHexCode(newColor);
    setError("");
    onChange(newColor);
  };

  const handleHexInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newHex = e.target.value;
    
    // Add # if missing
    if (!newHex.startsWith("#")) {
      newHex = "#" + newHex;
    }

    setHexCode(newHex);

    if (validateHexCode(newHex)) {
      setError("");
      onChange(newHex);
    } else if (newHex.length === 7) {
      setError("Invalid hex code format. Must be #RRGGBB");
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      <div className="flex gap-3 items-start">
        {/* Color Picker */}
        <div className="relative">
          <input
            type="color"
            value={hexCode}
            onChange={handleColorChange}
            className="w-16 h-16 rounded-lg border-2 border-gray-200 cursor-pointer"
            style={{ padding: "4px" }}
          />
        </div>

        {/* Hex Code Input */}
        <div className="flex-1">
          <input
            type="text"
            value={hexCode}
            onChange={handleHexInput}
            placeholder="#000000"
            maxLength={7}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
          />
          {error && (
            <p className="text-red-500 text-xs mt-1">{error}</p>
          )}
        </div>

        {/* Color Preview */}
        <div
          className="w-16 h-16 rounded-lg border-2 border-gray-200"
          style={{ backgroundColor: validateHexCode(hexCode) ? hexCode : "#ffffff" }}
        />
      </div>

      <p className="text-xs text-gray-500">
        Select a color or enter a hex code (e.g., #FF5733)
      </p>
    </div>
  );
}
