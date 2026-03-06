/**
 * utils/validate.ts — Uygulama geneli doğrulama yardımcıları
 *
 * UUID regex eskiden her dosyada ayrı ayrı tanımlanıyordu.
 * Buraya toplayarak tek kaynak (single source of truth) sağlanır.
 */

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Verilen string'in geçerli bir UUID v4 olup olmadığını kontrol eder */
export function isValidUUID(id: string | null | undefined): id is string {
    if (!id) return false;
    return UUID_REGEX.test(id);
}

/** E-posta formatı kontrolü */
export function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Minimum uzunluk kontrolü */
export function hasMinLength(value: string, min: number): boolean {
    return value.trim().length >= min;
}
