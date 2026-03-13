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

/**
 * PHASE 14: WebP Supabase Transformation helper.
 * Takes a raw Supabase public URL and converts it into a WebP transformed URL 
 * using Supabase's image Edge caching and resizing.
 * Transforms: /storage/v1/object/public/... 
 * Into: /storage/v1/render/image/public/...?width=200&format=webp
 */
export const getOptimizedImageUrl = (url?: string | null, width: number = 200, quality: number = 80): string | undefined => {
  if (!url) return undefined;
  
  // Sadece Supabase Storage object/public linkleri dönüştürülebilir.
  if (url.includes('supabase.co/storage/v1/object/public/')) {
    // /object/public/ kısmını /render/image/public/ ile değiştiriyoruz
    const renderUrl = url.replace('/object/public/', '/render/image/public/');
    
    // Zaten parametre varsa &'le, yoksa ?'le ekle
    const separator = renderUrl.includes('?') ? '&' : '?';
    return `${renderUrl}${separator}width=${width}&quality=${quality}&format=webp`;
  }
  
  // Supabase URL'i değilse (örn. ui-avatars.com veya local dosya), dokunma
  return url;
};
