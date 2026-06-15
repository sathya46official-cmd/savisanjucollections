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
        {/* Native Color Picker */}
        <div className="relative shrink-0">
          <input
            type="color"
            value={hexCode}
            onChange={handleColorChange}
            className="w-16 h-16 rounded-lg border-2 border-gray-300 cursor-pointer overflow-hidden p-0"
            style={{
              padding: 0,
              background: 'none',
            }}
            aria-label="Pick a colour"
          />
        </div>

        {/* Hex Code Input */}
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={hexCode}
            onChange={handleHexInput}
            placeholder="#000000"
            maxLength={7}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none bg-white font-mono uppercase"
          />
          {error && (
            <p className="text-red-600 text-xs mt-1">{error}</p>
          )}
        </div>

        {/* Color Preview */}
        <div
          className="w-16 h-16 rounded-lg border-2 border-gray-300 shrink-0"
          style={{ backgroundColor: validateHexCode(hexCode) ? hexCode : "#ffffff" }}
          aria-hidden="true"
        />
      </div>

      <p className="text-xs text-gray-500">
        Choose a colour from the swatch or type a hex code like <code className="font-mono bg-gray-100 px-1 rounded">#FF5733</code>.
      </p>
    </div>
  );
}
