const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const FALLBACK_SAREE_IMAGE = "/assets/collection/saree1.jpeg";

/**
 * Resolve a backend image URL so it works in both development and production.
 * - Relative paths are prefixed with NEXT_PUBLIC_API_URL.
 * - Absolute URLs are returned as-is.
 * - Empty/missing values fall back to a local placeholder image.
 */
export function resolveImageUrl(imageUrl: string | undefined | null): string {
  if (!imageUrl) return FALLBACK_SAREE_IMAGE;

  const trimmed = imageUrl.trim();
  if (!trimmed) return FALLBACK_SAREE_IMAGE;

  // Already absolute — use directly.
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  // Relative path — prepend the configured API origin.
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${API_URL.replace(/\/$/, "")}${normalized}`;
}

/**
 * Handle a failed image load by replacing the source with the local fallback.
 */
export function handleImageError(event: React.SyntheticEvent<HTMLImageElement>): void {
  const target = event.currentTarget;
  if (target.src !== FALLBACK_SAREE_IMAGE) {
    target.src = FALLBACK_SAREE_IMAGE;
  }
}
