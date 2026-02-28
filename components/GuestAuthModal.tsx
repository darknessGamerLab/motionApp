/**
 * GuestAuthModal — Giriş yapılmamış kullanıcıya native bottom sheet popup
 * Like, yorum, takip gibi aksiyonlarda gösterilir.
 */
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = 380;

interface GuestAuthModalProps {
    visible: boolean;
    onClose: () => void;
    /** Tetikleyen aksiyon: 'like' | 'comment' | 'save' | 'follow' | 'share' | 'create' */
    action?: 'like' | 'comment' | 'save' | 'follow' | 'create' | 'general';
}

const ACTION_COPY: Record<string, { icon: string; title: string; subtitle: string }> = {
    like: {
        icon: 'heart',
        title: 'Beğenmek için giriş yap',
        subtitle: 'Sevdiğin içerikleri beğen ve kaydet.',
    },
    comment: {
        icon: 'chatbubble',
        title: 'Yorum yapmak için giriş yap',
        subtitle: 'Yorumla, tartış, toplulukla etkileşime geç.',
    },
    save: {
        icon: 'bookmark',
        title: 'Kaydetmek için giriş yap',
        subtitle: 'Favori içeriklerini koleksiyonuna ekle.',
    },
    follow: {
        icon: 'person-add',
        title: 'Takip etmek için giriş yap',
        subtitle: 'İlgilendiğin kişilerin içeriklerini takip et.',
    },
    create: {
        icon: 'videocam',
        title: 'Video paylaşmak için giriş yap',
        subtitle: 'Yeteneğini dünyayla paylaş ve keşfedil.',
    },
    general: {
        icon: 'person-circle',
        title: 'Devam etmek için giriş yap',
        subtitle: 'Tüm özelliklere erişmek için ücretsiz hesap oluştur.',
    },
};

export default function GuestAuthModal({ visible, onClose, action = 'general' }: GuestAuthModalProps) {
    const slideAnim = useRef(new Animated.Value(SHEET_H)).current;
    const bgOpacity = useRef(new Animated.Value(0)).current;

    const copy = ACTION_COPY[action] ?? ACTION_COPY.general;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    tension: 65,
                    friction: 11,
                    useNativeDriver: true,
                }),
                Animated.timing(bgOpacity, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: SHEET_H,
                    duration: 220,
                    useNativeDriver: true,
                }),
                Animated.timing(bgOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const handleLogin = () => {
        onClose();
        setTimeout(() => router.push('/auth/login'), 300);
    };

    const handleSignup = () => {
        onClose();
        setTimeout(() => router.push('/auth/signup'), 300);
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            {/* Backdrop */}
            <TouchableWithoutFeedback onPress={onClose}>
                <Animated.View style={[styles.backdrop, { opacity: bgOpacity }]} />
            </TouchableWithoutFeedback>

            {/* Bottom Sheet */}
            <Animated.View
                style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
            >
                {/* Handle bar */}
                <View style={styles.handleBar} />

                {/* Icon */}
                <View style={styles.iconWrap}>
                    <View style={styles.iconCircle}>
                        <Ionicons name={copy.icon as any} size={36} color={Colors.primary} />
                    </View>
                </View>

                {/* Text */}
                <Text style={styles.title}>{copy.title}</Text>
                <Text style={styles.subtitle}>{copy.subtitle}</Text>

                {/* Buttons */}
                <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} activeOpacity={0.85}>
                    <Text style={styles.loginBtnText}>Giriş Yap</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.signupBtn} onPress={handleSignup} activeOpacity={0.85}>
                    <Text style={styles.signupBtnText}>Ücretsiz Kayıt Ol</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
                    <Text style={styles.cancelText}>Şimdi değil</Text>
                </TouchableOpacity>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: SHEET_H,
        backgroundColor: Colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingBottom: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 20,
    },
    handleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.border,
        marginTop: 12,
        marginBottom: 20,
    },
    iconWrap: {
        marginBottom: 16,
    },
    iconCircle: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: Colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 28,
        paddingHorizontal: 8,
    },
    loginBtn: {
        width: '100%',
        height: 52,
        borderRadius: 14,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    loginBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    signupBtn: {
        width: '100%',
        height: 52,
        borderRadius: 14,
        backgroundColor: Colors.background,
        borderWidth: 1.5,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    signupBtnText: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    cancelBtn: {
        padding: 8,
    },
    cancelText: {
        color: Colors.textMuted,
        fontSize: 14,
    },
});
