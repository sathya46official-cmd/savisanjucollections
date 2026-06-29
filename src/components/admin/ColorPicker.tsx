"use client";

import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import { SAREE_COLORS, isValidHex, findColorByHex } from "@/lib/colors";

interface ColorPickerProps {
  /** Current hex value (#RRGGBB). */
  value: string;
  /** Current colour name (used to highlight the active swatch). */
  colorName?: string;
  /**
   * Fires whenever the colour changes. Provides BOTH the hex and a
   * suggested colour name so the caller can keep them in sync.
   */
  onChange: (hex: string, name: string) => void;
  label?: string;
}

/**
 * Swatch-first colour picker.
 *
 * The admin clicks a named swatch and we set the colour name + hex together —
 * no need to know hex codes. A collapsible "Custom colour" panel keeps the
 * native picker available for one-off shades.
 */
export default function ColorPicker({ value, colorName, onChange, label }: ColorPickerProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customHex, setCustomHex] = useState(value || "#9B1C2E");
  const [customName, setCustomName] = useState("");
  const [error, setError] = useState("");

  // A swatch is active when its name matches (preferred) or its hex matches.
  const activeName = colorName?.trim().toLowerCase();
  const isActive = (sName: string, sHex: string) => {
    if (activeName) return sName.toLowerCase() === activeName;
    return sHex.toLowerCase() === (value || "").toLowerCase();
  };

  const selectPreset = (name: string, hex: string) => {
    setError("");
    onChange(hex, name);
  };

  const applyCustom = () => {
    if (!isValidHex(customHex)) {
      setError("Enter a valid hex like #C71585");
      return;
    }
    // If the custom hex matches a known palette colour, reuse its name for
    // catalogue consistency; otherwise require a name from the admin.
    const known = findColorByHex(customHex);
    const finalName = (customName.trim() || known?.name || "").trim();
    if (!finalName) {
      setError("Please give this colour a name (e.g. Peach).");
      return;
    }
    setError("");
    onChange(customHex, finalName);
    setShowCustom(false);
  };

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}

      {/* Selected colour summary */}
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div
          className="h-9 w-9 shrink-0 rounded-full border border-gray-300"
          style={{ backgroundColor: isValidHex(value) ? value : "#ffffff" }}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">
            {colorName?.trim() || "No colour selected"}
          </p>
          <p className="font-mono text-xs uppercase text-gray-500">{value || "—"}</p>
        </div>
      </div>

      {/* Curated swatch grid */}
      <div
        className="grid grid-cols-6 gap-2 sm:grid-cols-8"
        role="listbox"
        aria-label="Saree colours"
      >
        {SAREE_COLORS.map((c) => {
          const active = isActive(c.name, c.hex);
          return (
            <button
              key={c.name}
              type="button"
              title={c.name}
              aria-label={c.name}
              aria-selected={active}
              role="option"
              onClick={() => selectPreset(c.name, c.hex)}
              className={`relative aspect-square rounded-full border transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#9A7B4F] ${
                active ? "border-[#1A1A1A] ring-2 ring-[#9A7B4F] ring-offset-1" : "border-gray-300"
              }`}
              style={{ backgroundColor: c.hex }}
            >
              {active && (
                <Check
                  size={14}
                  strokeWidth={3}
                  className="absolute inset-0 m-auto text-white mix-blend-difference"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Custom colour toggle */}
      <button
        type="button"
        onClick={() => setShowCustom((s) => !s)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9A7B4F] hover:text-[#1A1A1A]"
      >
        <Pencil size={13} />
        {showCustom ? "Hide custom colour" : "Use a custom colour"}
      </button>

      {showCustom && (
        <div className="space-y-3 rounded-lg border border-gray-200 p-3">
          <div className="flex items-end gap-3">
            <div className="shrink-0">
              <label className="mb-1 block text-xs text-gray-500">Shade</label>
              <input
                type="color"
                value={isValidHex(customHex) ? customHex : "#000000"}
                onChange={(e) => setCustomHex(e.target.value)}
                className="h-11 w-14 cursor-pointer rounded-lg border border-gray-300 p-0"
                aria-label="Pick a custom shade"
              />
            </div>
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-xs text-gray-500">Colour name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Peach"
                maxLength={40}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-[#9A7B4F]"
              />
            </div>
            <button
              type="button"
              onClick={applyCustom}
              className="shrink-0 rounded-lg bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#333]"
            >
              Apply
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Pick a shade and give it a simple name. We store the colour code for you.
          </p>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
