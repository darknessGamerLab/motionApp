/**
 * eventBus — Uygulama geneli hafif pub/sub (publish-subscribe) sistemi.
 *
 * Neden buna ihtiyaç var?
 * -----------------------
 * useFeed, useProfile, NotificationsScreen gibi birbirinden bağımsız
 * state yöneticileri takip/beğeni gibi olayları birbirinden haberdar olamıyor.
 * Sayfalar arası veri tutarsızlığının (follow=true feed'de / false profile'da) kökü bu.
 *
 * Kullanım:
 *   // emit (tetikle)
 *   eventBus.emit('follow:changed', { userId: 'abc', isFollowing: true });
 *
 *   // subscribe (dinle)
 *   useEffect(() => {
 *     const unsub = eventBus.on('follow:changed', ({ userId, isFollowing }) => {
 *       setFollowing(prev => prev.map(u => u.id === userId ? { ...u, isFollowing } : u));
 *     });
 *     return unsub; // cleanup
 *   }, []);
 *
 * Tasarım Kararları:
 * - Sıfır dependency (React veya Expo gerektirmiyor)
 * - Module-level singleton — uygulama yaşam döngüsü boyunca tek instance
 * - TypeScript ile tam tip güvenliği
 * - Listener sızıntısına karşı otomatik cleanup (return unsub pattern)
 */

// ─── Event Tipi Haritası ─────────────────────────────────────────────────────
export type AppEvents = {
    /** Kullanıcı takip edildi veya takipten çıktı */
    'follow:changed': { userId: string; isFollowing: boolean };

    /** Video beğenildi veya beğeni kaldırıldı (Kendi aksiyonumuz) */
    'video:liked': { videoId: string; isLiked: boolean; likes: number };

    /** Dışarıdan gelen realtime beğeni sayısı güncellemesi */
    'video:like_count_changed': { videoId: string; delta: number };

    /** Video kaydedildi veya kaydı silindi */
    'video:saved': { videoId: string; isSaved: boolean };

    /** Video silindi */
    'video:deleted': { videoId: string };

    /** Yorum sayısı güncellendi (Kendi aksiyonumuz) */
    'video:commented': { videoId: string; comments: number };

    /** Dışarıdan gelen realtime yorum sayısı güncellemesi */
    'video:comment_count_changed': { videoId: string; delta: number };

    /** Video paylaşıldı — shares_count güncellendi */
    'video:shared': { videoId: string; shares: number };

    /** Bildirimler okundu — badge sıfırlanmalı */
    'notifications:read': { count: number };

    /** Profil güncellendi (avatar, isim vb.) */
    'profile:updated': { userId: string };
};

type EventName = keyof AppEvents;
type Listener<E extends EventName> = (payload: AppEvents[E]) => void;

// ─── EventBus Sınıfı ─────────────────────────────────────────────────────────
class EventBus {
    private listeners = new Map<EventName, Set<Listener<any>>>();

    /**
     * Olaya listener ekle.
     * @returns Listener'ı kaldıran unsub fonksiyonu (useEffect cleanup için kullan)
     */
    on<E extends EventName>(event: E, listener: Listener<E>): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(listener);

        return () => {
            this.listeners.get(event)?.delete(listener);
        };
    }

    /**
     * Olay tetikle — tüm dinleyicilere payload iletilir.
     */
    emit<E extends EventName>(event: E, payload: AppEvents[E]): void {
        this.listeners.get(event)?.forEach(listener => {
            try {
                listener(payload);
            } catch (e) {
                // Bir listener hata verse bile diğerleri çalışmaya devam eder
                if (__DEV__) console.warn(`[EventBus] Listener error for "${event}":`, e);
            }
        });
    }

    /**
     * Belirli bir olayın tüm listener'larını sil (genellikle test için).
     */
    off(event: EventName): void {
        this.listeners.delete(event);
    }

    /**
     * Tüm listener'ları temizle (logout vb. tam sıfırlama için).
     */
    clear(): void {
        this.listeners.clear();
    }
}

// Singleton — uygulama boyunca tek instance
export const eventBus = new EventBus();
