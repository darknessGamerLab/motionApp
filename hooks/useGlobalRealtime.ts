import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { eventBus } from '@/lib/eventBus';
import { useAuth } from '@/contexts/AuthContext';

/**
 * useGlobalRealtime — Minimal Realtime Subscription Hook
 *
 * Sadece görünürlüğe etki etmeyecek hafiflikteki Realtime eventlerini dinler.
 * Örneğin `likes` ve `comments` tablosundaki INSERT/DELETE eventleri,
 * anlık bir UI geri bildirimi vermek için EventBus üzerinden dağıtılır.
 */
export function useGlobalRealtime() {
  const { authState } = useAuth();
  const userId = authState.user?.id;

  useEffect(() => {
    // Sadece kullanıcı giriş yaptıysa ya da globalde her türlü açıksa:
    // Biz burada authenticated/anonymous fark etmeksizin Realtime açabiliriz.
    // Ancak session bazlı security policies nedeniyle genelde oturumlu istenir.
    // Şimdilik global açıyoruz.

    const channel = supabase.channel('global-interactions');

    // Likes INSERT (Başka biri beğendiğinde +1)
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'likes' },
      (payload) => {
        // Eğer bu eylemi biz yaptıysak local (optimistic) state zaten devrede.
        // O yüzden kendi aksiyonumuzu görmezden geliyoruz.
        if (payload.new.user_id === userId) return;
        eventBus.emit('video:like_count_changed', { videoId: payload.new.video_id, delta: 1 });
      }
    );

    // Likes DELETE (Başka biri beğeniyi çektiğinde -1)
    channel.on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'likes' },
      (payload) => {
        // DELETE işlemi old record üzerinden gelir
        if (payload.old.user_id === userId) return;
        eventBus.emit('video:like_count_changed', { videoId: payload.old.video_id, delta: -1 });
      }
    );

    // Comments INSERT (+1)
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'comments' },
      (payload) => {
        if (payload.new.user_id === userId) return;
        eventBus.emit('video:comment_count_changed', { videoId: payload.new.video_id, delta: 1 });
      }
    );

    // Comments DELETE (-1)
    channel.on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'comments' },
      (payload) => {
        // Eğer silinen kendi yorumu ise lokal sildiğimiz için yok say
        if (payload.old.user_id === userId) return;
        eventBus.emit('video:comment_count_changed', { videoId: payload.old.video_id, delta: -1 });
      }
    );

    // Subscribe to channel
    channel.subscribe((status, err) => {
      if (__DEV__) {
        console.log('[Realtime] Subscription status:', status);
        if (err) console.error('[Realtime] Subscription error:', err);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
