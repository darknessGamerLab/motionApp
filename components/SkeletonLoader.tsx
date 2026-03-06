/**
 * SkeletonLoader — Yükleme durumu için placeholder animasyonları
 * 
 * Kullanım:
 *   <SkeletonLoader width={200} height={16} borderRadius={8} />
 *   <SkeletonLoader.Avatar size={44} />
 *   <SkeletonLoader.Text lines={3} />
 *   <SkeletonLoader.VideoCard />
 *   <SkeletonLoader.NotifRow />
 */

import Colors from '@/constants/Colors';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View, ViewStyle } from 'react-native';

const { width: SW } = Dimensions.get('window');

interface SkeletonProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
}

// Temel shimmer animasyonu
function SkeletonBox({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
    const shimmer = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
            ])
        );
        anim.start();
        return () => anim.stop();
    }, [shimmer]);

    const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });

    return (
        <Animated.View
            style={[
                { width: width as any, height, borderRadius, backgroundColor: Colors.border, opacity },
                style,
            ]}
        />
    );
}

// Avatar iskelet
function SkeletonAvatar({ size = 44 }: { size?: number }) {
    return <SkeletonBox width={size} height={size} borderRadius={size / 2} />;
}

// Çoklu satır metin iskeleti
function SkeletonText({ lines = 2, gap = 8 }: { lines?: number; gap?: number }) {
    const widths = [0.8, 0.6, 0.75, 0.5, 0.9];
    return (
        <View style={{ gap }}>
            {Array.from({ length: lines }).map((_, i) => (
                <SkeletonBox key={i} width={`${(widths[i % widths.length]) * 100}%`} height={14} borderRadius={7} />
            ))}
        </View>
    );
}

// Bildirim satırı iskeleti
function SkeletonNotifRow() {
    return (
        <View style={sk.notifRow}>
            <SkeletonAvatar size={46} />
            <View style={{ flex: 1, gap: 8 }}>
                <SkeletonBox width="70%" height={13} />
                <SkeletonBox width="45%" height={11} />
            </View>
            <SkeletonBox width={68} height={30} borderRadius={8} />
        </View>
    );
}

// Video kartı iskeleti (tam ekran feed için)
function SkeletonVideoCard({ height }: { height: number }) {
    return (
        <View style={[sk.videoCard, { height }]}>
            {/* Sol alt - kullanıcı ve açıklama */}
            <View style={sk.videoLeft}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <SkeletonAvatar size={38} />
                    <View style={{ gap: 6 }}>
                        <SkeletonBox width={100} height={13} />
                        <SkeletonBox width={70} height={11} />
                    </View>
                </View>
                <SkeletonBox width={180} height={12} style={{ marginBottom: 6 }} />
                <SkeletonBox width={130} height={12} />
            </View>
            {/* Sağ - aksiyon butonları */}
            <View style={sk.videoRight}>
                {[1, 2, 3, 4].map(i => (
                    <View key={i} style={{ alignItems: 'center', gap: 4 }}>
                        <SkeletonBox width={34} height={34} borderRadius={17} />
                        <SkeletonBox width={28} height={11} />
                    </View>
                ))}
            </View>
        </View>
    );
}

// Grid tile iskeleti (profil video grid'i için)
function SkeletonGridTile({ size }: { size: number }) {
    return <SkeletonBox width={size} height={size * 1.3} borderRadius={2} />;
}

// Profil header iskeleti
function SkeletonProfileHeader() {
    return (
        <View style={sk.profileHeader}>
            {/* Avatar */}
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
                <SkeletonAvatar size={90} />
            </View>
            {/* İsim */}
            <View style={{ alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <SkeletonBox width={140} height={18} borderRadius={9} />
                <SkeletonBox width={200} height={13} borderRadius={6} />
            </View>
            {/* Yetenekler */}
            <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center', marginBottom: 16 }}>
                <SkeletonBox width={60} height={14} borderRadius={7} />
                <SkeletonBox width={50} height={14} borderRadius={7} />
                <SkeletonBox width={70} height={14} borderRadius={7} />
            </View>
            {/* Stats */}
            <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'center', marginBottom: 16 }}>
                {[0, 1, 2].map(i => (
                    <View key={i} style={{ alignItems: 'center', gap: 6 }}>
                        <SkeletonBox width={40} height={18} borderRadius={9} />
                        <SkeletonBox width={55} height={11} borderRadius={5} />
                    </View>
                ))}
            </View>
            {/* Butonlar */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
                <SkeletonBox width="60%" height={38} borderRadius={8} />
                <SkeletonBox width="35%" height={38} borderRadius={8} />
            </View>
        </View>
    );
}

// ─── Export ────────────────────────────────────────────────────────────────────

export const SkeletonLoader = Object.assign(SkeletonBox, {
    Avatar: SkeletonAvatar,
    Text: SkeletonText,
    NotifRow: SkeletonNotifRow,
    VideoCard: SkeletonVideoCard,
    GridTile: SkeletonGridTile,
    ProfileHeader: SkeletonProfileHeader,
});

const sk = StyleSheet.create({
    notifRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
    },
    videoCard: {
        justifyContent: 'flex-end',
        padding: 20,
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    videoLeft: { flex: 1 },
    videoRight: { gap: 20, alignItems: 'center', paddingLeft: 12 },
    profileHeader: { paddingHorizontal: 20, paddingTop: 16, alignItems: 'center' },
});
