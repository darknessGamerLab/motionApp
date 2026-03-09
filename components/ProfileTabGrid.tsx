/**
 * ProfileTabGrid — Paylaşılan profil sekme + video grid bileşeni
 *
 * Sorun:
 *   MeScreen.tsx ve UserProfileScreen.tsx her ikisi de neredeyse
 *   aynı ~170 satır kod içeriyor:
 *     - activeTab state + 3 sekme (Videos / Liked / Saved)
 *     - tabIndicatorPosition + contentPosition Animated.Value
 *     - animateTabSwitch() çağrısı
 *     - FlatList ile 3×grid thumbnail render
 *     - Toplam ~340 satır tekrar
 *
 * Çözüm:
 *   Bu bileşen tek kaynak. Props ile video listeleri ve callback'lar verilir.
 *   FlashList kullanır (FlatList'ten daha hızlı) ve thumbnail transform zaten
 *   videoService.ts tarafından uygulanmıştır.
 *
 * Kullanım:
 *   <ProfileTabGrid
 *     videos={dbUserVideos}
 *     likedVideos={dbLikedVideos}
 *     savedVideos={dbSavedVideos}
 *     onVideoPress={(list, idx) => player.open(list, idx)}
 *     onVideoLongPress={(video) => handleDelete(video.id)}  // opsiyonel
 *   />
 */

import EmptyState from '@/components/EmptyState';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import Colors from '@/constants/Colors';
import { VideoItem } from '@/types/video';
import { animateTabSwitch } from '@/utils/transitions';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_GAP = 2;
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
const GRID_ITEM_HEIGHT = GRID_ITEM_WIDTH * 1.3;

type TabKey = 'videos' | 'liked' | 'saved';

interface ProfileTabGridProps {
    videos?: VideoItem[];
    likedVideos?: VideoItem[];
    savedVideos?: VideoItem[];
    loading?: boolean;
    /** Called when a grid tile is pressed */
    onVideoPress: (videos: VideoItem[], index: number) => void;
    /** Called on long press — used for own profile delete confirmation */
    onVideoLongPress?: (video: VideoItem) => void;
    /** Initial tab to show */
    initialTab?: TabKey;
    /** Controlled tab — if provided external controls the active tab */
    activeTab?: TabKey;
    onTabChange?: (tab: TabKey) => void;
}

// ─── Grid Item ────────────────────────────────────────────────────────
const GridItem = React.memo(({
    item,
    onPress,
    onLongPress,
}: {
    item: VideoItem;
    onPress: () => void;
    onLongPress?: () => void;
}) => (
    <TouchableOpacity
        style={gs.tile}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={500}
        activeOpacity={0.8}
    >
        <Image
            source={{ uri: item.thumbnail_url ?? '' }}
            style={gs.thumb}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
        />
        <View style={gs.overlay}>
            <Ionicons name="play" size={12} color="#fff" />
        </View>
    </TouchableOpacity>
));

// ─── Empty Grid ───────────────────────────────────────────────────────
const EMPTY_STATES: Record<TabKey, { icon: any; title: string; subtitle: string }> = {
    videos: { icon: 'film-outline', title: 'Henüz video yok', subtitle: 'İlk videonu paylaş!' },
    liked: { icon: 'heart-outline', title: 'Beğenilen video yok', subtitle: 'Beğendiğin videolar burada görünür.' },
    saved: { icon: 'bookmark-outline', title: 'Kaydedilen video yok', subtitle: 'Daha sonra izlemek için videoları kaydet.' },
};

// ─── Main Component ───────────────────────────────────────────────────
export default function ProfileTabGrid({
    videos = [],
    likedVideos = [],
    savedVideos = [],
    loading = false,
    onVideoPress,
    onVideoLongPress,
    initialTab = 'videos',
    activeTab: controlledTab,
    onTabChange,
}: ProfileTabGridProps) {
    const [internalTab, setInternalTab] = useState<TabKey>(initialTab);
    const activeTab = controlledTab ?? internalTab;

    const tabIndicatorPosition = useRef(new Animated.Value(0)).current;
    const contentPosition = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const tabIdx = activeTab === 'videos' ? 0 : activeTab === 'liked' ? 1 : 2;
        animateTabSwitch(
            tabIndicatorPosition,
            contentPosition,
            tabIdx,
            -tabIdx * SCREEN_WIDTH,
        ).start();
    }, [activeTab]);

    const setTab = useCallback((tab: TabKey) => {
        if (!controlledTab) setInternalTab(tab);
        onTabChange?.(tab);
    }, [controlledTab, onTabChange]);

    const displayVideos =
        activeTab === 'videos' ? videos :
            activeTab === 'liked' ? likedVideos :
                savedVideos;

    const renderItem = useCallback(({ item, index }: { item: VideoItem; index: number }) => (
        <GridItem
            item={item}
            onPress={() => onVideoPress(displayVideos, index)}
            onLongPress={onVideoLongPress ? () => onVideoLongPress(item) : undefined}
        />
    ), [displayVideos, onVideoPress, onVideoLongPress]);

    // ── Skeleton loading ─────────────────────────────────────────────────
    if (loading && videos.length === 0) {
        return (
            <View style={s.container}>
                <TabBar activeTab={activeTab} onTabChange={setTab} indicator={tabIndicatorPosition} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, padding: GRID_GAP }}>
                    {Array.from({ length: 9 }).map((_, i) => (
                        <SkeletonLoader key={i} width={GRID_ITEM_WIDTH} height={GRID_ITEM_HEIGHT} borderRadius={2} />
                    ))}
                </View>
            </View>
        );
    }

    return (
        <View style={s.container}>
            <TabBar activeTab={activeTab} onTabChange={setTab} indicator={tabIndicatorPosition} />
            <Animated.View style={[
                s.grid,
                { transform: [{ translateX: contentPosition }] },
            ]}>
                {/* ─── Videos page ─────────────────────────────────── */}
                <View style={s.page}>
                    {videos.length > 0 ? (
                        <FlatList
                            data={videos}
                            renderItem={renderItem}
                            keyExtractor={(item: VideoItem) => item.id}
                            numColumns={GRID_COLUMNS}
                            scrollEnabled={false}
                            contentContainerStyle={{ padding: GRID_GAP / 2 }}
                        />
                    ) : (
                        <EmptyState {...EMPTY_STATES.videos} />
                    )}
                </View>

                {/* ─── Liked page ──────────────────────────────────── */}
                <View style={s.page}>
                    {likedVideos.length > 0 ? (
                        <FlatList
                            data={likedVideos}
                            renderItem={renderItem}
                            keyExtractor={(item: VideoItem) => item.id}
                            numColumns={GRID_COLUMNS}
                            scrollEnabled={false}
                            contentContainerStyle={{ padding: GRID_GAP / 2 }}
                        />
                    ) : (
                        <EmptyState {...EMPTY_STATES.liked} />
                    )}
                </View>

                {/* ─── Saved page ───────────────────────────────────── */}
                <View style={s.page}>
                    {savedVideos.length > 0 ? (
                        <FlatList
                            data={savedVideos}
                            renderItem={renderItem}
                            keyExtractor={(item: VideoItem) => item.id}
                            numColumns={GRID_COLUMNS}
                            scrollEnabled={false}
                            contentContainerStyle={{ padding: GRID_GAP / 2 }}
                        />
                    ) : (
                        <EmptyState {...EMPTY_STATES.saved} />
                    )}
                </View>
            </Animated.View>
        </View>
    );
}

// ─── TabBar ──────────────────────────────────────────────────────────
function TabBar({
    activeTab,
    onTabChange,
    indicator,
}: {
    activeTab: TabKey;
    onTabChange: (tab: TabKey) => void;
    indicator: Animated.Value;
}) {
    const TABS: { key: TabKey; icon: any; label: string }[] = [
        { key: 'videos', icon: 'grid-outline', label: 'Videolar' },
        { key: 'liked', icon: 'heart-outline', label: 'Beğenilen' },
        { key: 'saved', icon: 'bookmark-outline', label: 'Kaydedilen' },
    ];

    const indicatorLeft = indicator.interpolate({
        inputRange: [0, 1, 2],
        outputRange: [0, SCREEN_WIDTH / 3, (SCREEN_WIDTH / 3) * 2],
    });

    return (
        <View style={tb.container}>
            {TABS.map(({ key, icon, label }) => (
                <TouchableOpacity
                    key={key}
                    style={tb.tab}
                    onPress={() => onTabChange(key)}
                    activeOpacity={0.75}
                >
                    <Ionicons
                        name={icon}
                        size={22}
                        color={activeTab === key ? Colors.primary : Colors.textMuted}
                    />
                    <Text style={[tb.label, activeTab === key && tb.labelActive]}>
                        {label}
                    </Text>
                </TouchableOpacity>
            ))}
            <Animated.View style={[tb.indicator, { left: indicatorLeft }]} />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────
const s = StyleSheet.create({
    container: { flex: 1 },
    grid: {
        flexDirection: 'row',
        width: SCREEN_WIDTH * 3,
    },
    page: { width: SCREEN_WIDTH },
});

const gs = StyleSheet.create({
    tile: {
        width: GRID_ITEM_WIDTH,
        height: GRID_ITEM_HEIGHT,
        backgroundColor: Colors.surfaceAlt,
        margin: GRID_GAP / 2,
    },
    thumb: { width: '100%', height: '100%' },
    overlay: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
});

const tb = StyleSheet.create({
    container: {
        flexDirection: 'row',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.border,
        position: 'relative',
        marginTop: 2,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        gap: 3,
    },
    label: {
        fontSize: 10,
        fontFamily: 'Poppins_400Regular',
        color: Colors.textMuted,
    },
    labelActive: {
        color: Colors.primary,
        fontFamily: 'Poppins_600SemiBold',
    },
    indicator: {
        position: 'absolute',
        bottom: -1,
        width: SCREEN_WIDTH / 3,
        height: 2,
        backgroundColor: Colors.primary,
        borderRadius: 1,
    },
});
