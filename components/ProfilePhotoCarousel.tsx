import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { getOptimizedImageUrl } from '@/utils/format';
import React, { useCallback, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    Modal,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

interface ProfilePhotoCarouselProps {
    avatars: string[]; // Kullanıcının 1 ila 3 fotoğrafı
    size?: number;
    onEditPress?: () => void;
    isEditable?: boolean;
}

export default function ProfilePhotoCarousel({
    avatars = [], size = 90, onEditPress, isEditable = false,
}: ProfilePhotoCarouselProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [viewerVisible, setViewerVisible] = useState(false);

    // Viewer animasyonu
    const scaleAnim = useRef(new Animated.Value(0.5)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    const onScroll = useCallback((e: any) => {
        const x = e.nativeEvent.contentOffset.x;
        const i = Math.round(x / size);
        if (i !== activeIndex) {
            setActiveIndex(i);
            Haptics.selectionAsync(); // Kaydırıldığında soft titreşim
        }
    }, [size, activeIndex]);

    const openViewer = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setViewerVisible(true);
        Animated.parallel([
            Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 50, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();
    }, [scaleAnim, opacityAnim]);

    const closeViewer = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.parallel([
            Animated.timing(scaleAnim, { toValue: 0.8, duration: 200, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => setViewerVisible(false));
    }, [scaleAnim, opacityAnim]);

    return (
        <>
            <View style={[styles.container, { width: size, height: size }]}>
                {/* Avatarlar yatay kaydırma */}
                <FlatList
                    data={avatars}
                    keyExtractor={(item, index) => `${item}-${index}`}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={onScroll}
                    scrollEventThrottle={16}
                    bounces={true}
                    renderItem={({ item }) => (
                        <TouchableWithoutFeedback onLongPress={openViewer} delayLongPress={300}>
                            <View style={[styles.avatarWrap, { width: size, height: size }]}>
                                <Image
                                    source={{ uri: getOptimizedImageUrl(item, size * 2, 85) ?? item }}
                                    style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
                                    contentFit="cover"
                                    transition={200}
                                    cachePolicy="memory-disk"
                                />
                            </View>
                        </TouchableWithoutFeedback>
                    )}
                />

                {/* Gösterge Noktaları */}
                {avatars.length > 1 && (
                    <View style={styles.dots}>
                        {avatars.map((_, i) => (
                            <View key={i} style={[styles.dot, activeIndex === i && styles.dotActive]} />
                        ))}
                    </View>
                )}

                {/* Düzenle Butonu (MeScreen için) */}
                {isEditable && (
                    <TouchableOpacity
                        style={styles.editBtn}
                        onPress={onEditPress}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="camera" size={14} color="#fff" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Uzun Basınca Açılan Viewer (Arkaplan Bulanık/Siyah) */}
            <Modal visible={viewerVisible} transparent animationType="none" onRequestClose={closeViewer}>
                <Animated.View style={[styles.viewerOverlay, { opacity: opacityAnim }]}>
                    <TouchableWithoutFeedback onPress={closeViewer}>
                        <View style={StyleSheet.absoluteFill} />
                    </TouchableWithoutFeedback>

                    <Animated.Image
                        source={{ uri: getOptimizedImageUrl(avatars[activeIndex], W * 1.5, 90) ?? avatars[activeIndex] }}
                        style={[styles.viewerImage, { transform: [{ scale: scaleAnim }] }]}
                    // expo-image
                    />
                </Animated.View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        alignSelf: 'center',
        marginBottom: 16,
        position: 'relative',
    },
    avatarWrap: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        borderWidth: 2,
        borderColor: Colors.border,
        backgroundColor: Colors.surfaceAlt,
    },
    dots: {
        position: 'absolute',
        bottom: -15,
        flexDirection: 'row',
        alignSelf: 'center',
        gap: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.border,
    },
    dotActive: {
        backgroundColor: Colors.primary,
        width: 8,
    },
    editBtn: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: Colors.primary,
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.surface,
    },
    viewerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    viewerImage: {
        width: W * 0.85,
        height: W * 0.85,
        borderRadius: (W * 0.85) / 2,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.2)',
    },
});
