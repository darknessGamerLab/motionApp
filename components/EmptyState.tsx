/**
 * EmptyState — Tüm ekranlar için tutarlı boş durum bileşeni
 *
 * Kullanım:
 *   <EmptyState icon="film-outline" title="Henüz video yok" />
 *   <EmptyState icon="bookmark-outline" title="Kayıt yok" subtitle="..." ctaLabel="Yükle" onCtaPress={() => {}} />
 */

import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface EmptyStateProps {
    icon: string;
    title: string;
    subtitle?: string;
    ctaLabel?: string;
    onCtaPress?: () => void;
    /** Override to add extra space at top (e.g. for screens with headers) */
    topPadding?: number;
}

export default function EmptyState({
    icon,
    title,
    subtitle,
    ctaLabel,
    onCtaPress,
    topPadding = 60,
}: EmptyStateProps) {
    return (
        <View style={[s.container, { paddingTop: topPadding }]}>
            <View style={s.iconWrap}>
                <Ionicons name={icon as any} size={52} color={Colors.textDim} />
            </View>
            <Text style={s.title}>{title}</Text>
            {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
            {ctaLabel && onCtaPress ? (
                <TouchableOpacity style={s.cta} onPress={onCtaPress} activeOpacity={0.8}>
                    <Text style={s.ctaText}>{ctaLabel}</Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 40,
        gap: 10,
    },
    iconWrap: {
        marginBottom: 4,
        opacity: 0.65,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.text,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 13,
        color: Colors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
    },
    cta: {
        marginTop: 8,
        paddingHorizontal: 24,
        paddingVertical: 11,
        borderRadius: 22,
        backgroundColor: Colors.primary,
    },
    ctaText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
});
