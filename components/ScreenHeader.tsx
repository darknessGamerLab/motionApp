/**
 * ScreenHeader — Uygulama genelinde paylaşılan ekran başlığı
 *
 * Sorun: SettingsScreen, UserProfileScreen, EditProfileScreen, NotificationsScreen
 * ve MeScreen'de 5 farklı header implementasyonu var — hepsi aynı renk, yükseklik
 * ve layout'u kullanıyor ama her biri YENİDEN yazılmış.
 *
 * Çözüm: Bu bileşen tek kaynak noktası. Props ile sol/sağ aksiyon ve başlık verilir.
 *
 * Kullanım:
 *   <ScreenHeader
 *     title="Ayarlar"
 *     leftAction={{ icon: 'arrow-back', onPress: () => router.back() }}
 *     rightAction={{ label: 'Kaydet', onPress: handleSave, loading: saving }}
 *   />
 *
 *   // sadece geri butonu:
 *   <ScreenHeader title="Bildirimler" onBack={onBackPress} />
 *
 *   // 3 nokta menüsü:
 *   <ScreenHeader title="Profil" onBack={onBackPress} rightAction={{ icon: 'ellipsis-horizontal', onPress: openMenu }} />
 */

import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
    ActivityIndicator,
    StyleProp,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface HeaderAction {
    /** Ionicons icon name — renders an icon button */
    icon?: keyof typeof Ionicons.glyphMap;
    /** Text label — renders a text button (used for Save, Done etc.) */
    label?: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    color?: string;
}

interface ScreenHeaderProps {
    title?: string;
    /** Shorthand for a back arrow on the left — equivalent to leftAction={{ icon: 'arrow-back', onPress }} */
    onBack?: () => void;
    leftAction?: HeaderAction;
    rightAction?: HeaderAction;
    /** Override container style e.g. to add border or background */
    style?: StyleProp<ViewStyle>;
    /** Include safe-area top inset (set false when parent already handles insets) */
    withInset?: boolean;
}

function ActionButton({ action, side }: { action: HeaderAction; side: 'left' | 'right' }) {
    const isText = !!action.label;
    return (
        <TouchableOpacity
            style={[s.actionBtn, side === 'right' && s.actionBtnRight]}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                action.onPress();
            }}
            disabled={action.disabled || action.loading}
            activeOpacity={0.7}
        >
            {action.loading ? (
                <ActivityIndicator size="small" color={action.color ?? Colors.primary} />
            ) : isText ? (
                <Text
                    style={[
                        s.actionLabel,
                        { color: action.color ?? Colors.primary },
                        action.disabled && s.actionLabelDisabled,
                    ]}
                >
                    {action.label}
                </Text>
            ) : (
                <Ionicons
                    name={action.icon!}
                    size={24}
                    color={action.color ?? Colors.text}
                />
            )}
        </TouchableOpacity>
    );
}

export default function ScreenHeader({
    title,
    onBack,
    leftAction,
    rightAction,
    style,
    withInset = false,
}: ScreenHeaderProps) {
    const insets = useSafeAreaInsets();
    const paddingTop = withInset ? insets.top : 0;

    // Shorthand onBack → leftAction
    const left: HeaderAction | undefined = leftAction ?? (onBack
        ? { icon: 'arrow-back', onPress: onBack }
        : undefined);

    return (
        <View style={[s.container, { paddingTop }, style]}>
            {/* Left slot */}
            <View style={s.slot}>
                {left && <ActionButton action={left} side="left" />}
            </View>

            {/* Center title */}
            <View style={s.center}>
                {title ? (
                    <Text style={s.title} numberOfLines={1}>{title}</Text>
                ) : null}
            </View>

            {/* Right slot */}
            <View style={[s.slot, s.slotRight]}>
                {rightAction && <ActionButton action={rightAction} side="right" />}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.border,
        paddingHorizontal: 4,
    },
    slot: {
        width: 52,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    slotRight: {
        alignItems: 'flex-end',
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        color: Colors.text,
        letterSpacing: -0.2,
    },
    actionBtn: {
        padding: 12,
        marginLeft: -4,
    },
    actionBtnRight: {
        marginLeft: 0,
        marginRight: -4,
    },
    actionLabel: {
        fontSize: 15,
        fontFamily: 'Poppins_600SemiBold',
    },
    actionLabelDisabled: {
        opacity: 0.45,
    },
});
