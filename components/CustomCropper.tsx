import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    Modal,
    PanResponder,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width: W, height: H } = Dimensions.get('window');
const MASK_SIZE = W * 0.8;

interface CustomCropperProps {
    visible: boolean;
    imageUri: string | null;
    onClose: () => void;
    onCrop: (croppedUri: string) => void;
}

export default function CustomCropper({ visible, imageUri, onClose, onCrop }: CustomCropperProps) {
    const [loading, setLoading] = useState(false);
    const [imageSize, setImageSize] = useState({ width: W, height: W });

    // Pan, Pinch Animations
    const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
    const scale = useRef(new Animated.Value(1)).current;

    // Base vars to track the actual values
    const currentPan = useRef({ x: 0, y: 0 });
    const currentScale = useRef(1);

    // Setup listeners to track value smoothly
    useEffect(() => {
        const pX = pan.x.addListener((v) => { currentPan.current.x = v.value; });
        const pY = pan.y.addListener((v) => { currentPan.current.y = v.value; });
        const sL = scale.addListener((v) => { currentScale.current = v.value; });

        return () => {
            pan.x.removeListener(pX);
            pan.y.removeListener(pY);
            scale.removeListener(sL);
        };
    }, [pan, scale]);

    // Read image dimensions so we don't scale it absurdly
    useEffect(() => {
        if (imageUri) {
            Image.getSize(imageUri, (w, h) => {
                const ratio = w / h;
                if (ratio > 1) { // Landscape
                    setImageSize({ width: MASK_SIZE * ratio, height: MASK_SIZE });
                } else { // Portrait
                    setImageSize({ width: MASK_SIZE, height: MASK_SIZE / ratio });
                }
                // Reset position
                pan.setValue({ x: 0, y: 0 });
                scale.setValue(1);
                currentPan.current = { x: 0, y: 0 };
                currentScale.current = 1;
            });
        }
    }, [imageUri, pan, scale]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (e, gestureState) => {
                // Simple drag, ignoring pinch for now to keep movement perfectly stable
                if (e.nativeEvent.touches.length === 1) {
                    pan.setValue({
                        x: currentPan.current.x + gestureState.dx,
                        y: currentPan.current.y + gestureState.dy
                    });
                    // Reset delta so we don't accelerate
                    gestureState.dx = 0;
                    gestureState.dy = 0;
                }
            },
            onPanResponderRelease: () => {
                // Capping boundary could go here, but since it's a visual crop we tolerate some blank space
            }
        })
    ).current;

    // Manual zoom control
    const zoomIn = () => {
        const newS = Math.min(currentScale.current + 0.3, 3);
        Animated.spring(scale, { toValue: newS, useNativeDriver: true }).start();
    };
    const zoomOut = () => {
        const newS = Math.max(currentScale.current - 0.3, 1);
        Animated.spring(scale, { toValue: newS, useNativeDriver: true }).start();
    };

    const handleCrop = async () => {
        if (!imageUri) return;
        setLoading(true);

        try {
            Image.getSize(imageUri, async (origW, origH) => {
                // Ekrandaki resmin boyutları:
                const renderedW = imageSize.width * currentScale.current;
                const renderedH = imageSize.height * currentScale.current;

                // Ekrana göre oran:
                const ratioW = origW / renderedW;
                const ratioH = origH / renderedH;

                // Maske Sol Üst Merkezinin (0,0) rendered resme olan uzaklığı (offseti)
                // Eğer resim tam ortadaysa Pan x=0, y=0. Resim rendering alanı imageSize wxh. 
                // Maske boyutu MASK_SIZE.
                const maskLeftInScreen = (W - MASK_SIZE) / 2;
                const maskTopInScreen = (H - MASK_SIZE) / 2;

                const imgLeftInScreen = (W - renderedW) / 2 + currentPan.current.x;
                const imgTopInScreen = (H - renderedH) / 2 + currentPan.current.y;

                // Ne kadarlık kısmı kaydırılmış (Negative offset means the image moved left, so we capture further right)
                const captureX = maskLeftInScreen - imgLeftInScreen;
                const captureY = maskTopInScreen - imgTopInScreen;

                let originX = Math.round(captureX * ratioW);
                let originY = Math.round(captureY * ratioH);
                let cropW = Math.round(MASK_SIZE * ratioW);
                let cropH = Math.round(MASK_SIZE * ratioH);

                // Clamp to valid dimensions
                if (originX < 0) originX = 0;
                if (originY < 0) originY = 0;
                if (originX + cropW > origW) cropW = origW - originX;
                if (originY + cropH > origH) cropH = origH - originY;

                const manipResult = await ImageManipulator.manipulateAsync(
                    imageUri,
                    [
                        { crop: { originX, originY, width: cropW, height: cropH } },
                        { resize: { width: 500, height: 500 } }
                    ],
                    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
                );

                setLoading(false);
                onCrop(manipResult.uri);
            });
        } catch (e) {
            setLoading(false);
            onClose();
        }
    };

    if (!visible || !imageUri) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={s.container}>
                <View style={s.header}>
                    <TouchableOpacity onPress={onClose} style={s.headerBtn}>
                        <Ionicons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Fotoğrafı Ayarla</Text>
                    <TouchableOpacity onPress={handleCrop} style={s.headerBtn}>
                        {loading ? <ActivityIndicator color={Colors.primary} /> : <Ionicons name="checkmark" size={28} color={Colors.primary} />}
                    </TouchableOpacity>
                </View>

                <View style={s.workspace}>
                    {/* Animated Image Under Mask */}
                    <Animated.View
                        {...panResponder.panHandlers}
                        style={[
                            s.imageWrap,
                            { transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: scale }] }
                        ]}
                    >
                        <Image
                            source={{ uri: imageUri }}
                            style={{ width: imageSize.width, height: imageSize.height }}
                            resizeMode="cover"
                        />
                    </Animated.View>

                    {/* Mask Hole */}
                    <View style={s.maskContainer} pointerEvents="none">
                        <View style={s.maskHole} />
                    </View>
                </View>

                <View style={s.footer}>
                    <Text style={s.footerText}>Kaydırmak için sürükleyin</Text>
                    <View style={s.zoomControls}>
                        <TouchableOpacity onPress={zoomOut} style={s.zBtn}>
                            <Ionicons name="remove" size={24} color="#000" />
                        </TouchableOpacity>
                        <Text style={s.zText}>Zoom</Text>
                        <TouchableOpacity onPress={zoomIn} style={s.zBtn}>
                            <Ionicons name="add" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const BORDER_WIDTH = Math.max(W, H);

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111' },
    header: {
        paddingTop: 50, height: 100, flexDirection: 'row',
        alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, zIndex: 10,
    },
    headerBtn: { padding: 8 },
    headerTitle: { color: '#fff', fontSize: 18, fontFamily: 'Poppins_600SemiBold' },

    workspace: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
    },
    imageWrap: {
        position: 'absolute',
        alignItems: 'center', justifyContent: 'center',
    },
    maskContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center', justifyContent: 'center',
    },
    maskHole: {
        width: MASK_SIZE, height: MASK_SIZE,
        borderRadius: MASK_SIZE / 2,
        borderWidth: BORDER_WIDTH,
        borderColor: 'rgba(0,0,0,0.7)',
    },

    footer: {
        height: 140, alignItems: 'center',
        paddingTop: 10, paddingBottom: 40,
    },
    footerText: { color: '#fff', fontSize: 13, fontFamily: 'Poppins_400Regular', marginBottom: 15 },
    zoomControls: {
        flexDirection: 'row', alignItems: 'center', gap: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 30, paddingHorizontal: 16, paddingVertical: 8,
    },
    zBtn: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff',
        alignItems: 'center', justifyContent: 'center'
    },
    zText: { color: '#fff', fontSize: 14, fontFamily: 'Poppins_600SemiBold' }
});
