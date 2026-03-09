/**
 * useVideoPlayer — VideoPlayerModal açma/kapama state'ini kapsayan hook.
 *
 * Sorun:
 *   MeScreen, UserProfileScreen ve InspirationScreen'de aynı 3 state
 *   (videoPlayerVisible, videoPlayerVideos, videoPlayerStartIndex) tekrarlanıyordu.
 *
 * Çözüm:
 *   Bu hook her üç state'i tek yerden yönetir ve `open(videos, index)` çağrısı
 *   ile modal açılır, `close()` ile kapatılır.
 *
 * Kullanım:
 *   const player = useVideoPlayer();
 *   <VideoPlayerModal visible={player.visible} videos={player.videos} startIndex={player.startIndex} onClose={player.close} />
 *   <TouchableOpacity onPress={() => player.open(videoList, pressedIndex)} />
 */

import { VideoItem } from '@/types/video';
import { useCallback, useState } from 'react';

export interface VideoPlayerState {
    visible: boolean;
    videos: VideoItem[];
    startIndex: number;
    open: (videos: VideoItem[], index: number) => void;
    close: () => void;
}

export function useVideoPlayer(): VideoPlayerState {
    const [visible, setVisible] = useState(false);
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [startIndex, setStartIndex] = useState(0);

    const open = useCallback((list: VideoItem[], idx: number) => {
        setVideos(list);
        setStartIndex(idx);
        setVisible(true);
    }, []);

    const close = useCallback(() => {
        setVisible(false);
    }, []);

    return { visible, videos, startIndex, open, close };
}
