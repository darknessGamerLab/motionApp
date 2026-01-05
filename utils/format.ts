/**
 * Format numbers for display (e.g., 1000 -> 1K, 1000000 -> 1M)
 */
export const formatNumber = (n: number): string => {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
};

/**
 * Alias for formatNumber (backward compatibility)
 */
export const formatViews = formatNumber;
export const fmt = formatNumber;

