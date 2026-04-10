import { useEffect, useState } from 'react';

/**
 * useDebounce hook
 * 
 * Verilen değeri belirtilen süre (ms) kadar bekletir.
 * Kullanıcı yazmayı bıraktığında (süre dolduğunda) güncel değeri döndürür.
 * Bu sayede her harfte API isteği atılmasının önüne geçilir.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // delay süresi kadar bir timer başlat
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Eğer delay dolmadan value tekrar değişirse (kullanıcı yazmaya devam ediyorsa)
    // önceki timer'ı iptal et ve yenisini başlat.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
