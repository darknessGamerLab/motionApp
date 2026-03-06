/**
 * transitions — Merkezi animasyon ve geçiş utility'leri
 * 
 * Uygulama genelinde tutarlı animasyonlar için tek kaynak.
 * Yeni animasyon ihtiyacı olduğunda buraya ekle — kodun geri kalanını değiştirme.
 */

import { Animated, Easing } from 'react-native';

// ─── Easing Presets ──────────────────────────────────────────────────────────
export const EASE = {
    smooth: Easing.bezier(0.25, 0.1, 0.25, 1),     // iOS benzeri
    spring: Easing.out(Easing.back(1.4)),            // Zıplatmalı çıkış
    snappy: Easing.out(Easing.cubic),                // Hızlı, temiz
    gentle: Easing.inOut(Easing.sin),               // Yavaş, yumuşak
    enter: Easing.out(Easing.exp),                   // Modal girişi
    exit: Easing.in(Easing.quad),                    // Modal çıkışı
};

// ─── Durations ───────────────────────────────────────────────────────────────
export const DURATION = {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 450,
    lazy: 600,
};

// ─── Fade ──────────────────────────────────────────────────────────────────
export function fadeIn(anim: Animated.Value, duration = DURATION.normal, delay = 0) {
    return Animated.timing(anim, {
        toValue: 1,
        duration,
        delay,
        easing: EASE.smooth,
        useNativeDriver: true,
    });
}

export function fadeOut(anim: Animated.Value, duration = DURATION.fast, delay = 0) {
    return Animated.timing(anim, {
        toValue: 0,
        duration,
        delay,
        easing: EASE.exit,
        useNativeDriver: true,
    });
}

// ─── Slide ──────────────────────────────────────────────────────────────────
export function slideUp(anim: Animated.Value, fromY: number, duration = DURATION.slow) {
    anim.setValue(fromY);
    return Animated.spring(anim, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
    });
}

export function slideDown(anim: Animated.Value, toY: number, duration = DURATION.normal) {
    return Animated.timing(anim, {
        toValue: toY,
        duration,
        easing: EASE.exit,
        useNativeDriver: true,
    });
}

// ─── Scale ──────────────────────────────────────────────────────────────────
export function scaleIn(anim: Animated.Value, from = 0.85, duration = DURATION.normal) {
    anim.setValue(from);
    return Animated.spring(anim, {
        toValue: 1,
        tension: 120,
        friction: 10,
        useNativeDriver: true,
    });
}

export function bounce(anim: Animated.Value) {
    return Animated.sequence([
        Animated.spring(anim, { toValue: 1.15, tension: 200, friction: 5, useNativeDriver: true }),
        Animated.spring(anim, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
    ]);
}

// ─── Stagger (liste elemanları için) ─────────────────────────────────────────
export function staggerFadeIn(anims: Animated.Value[], staggerMs = 60, duration = DURATION.normal) {
    return Animated.stagger(
        staggerMs,
        anims.map(anim =>
            Animated.timing(anim, {
                toValue: 1,
                duration,
                easing: EASE.smooth,
                useNativeDriver: true,
            })
        )
    );
}

// ─── Tab Indicator ───────────────────────────────────────────────────────────
export function animateTabIndicator(
    anim: Animated.Value,
    toValue: number,
    duration = DURATION.normal
) {
    return Animated.timing(anim, {
        toValue,
        duration,
        easing: EASE.snappy,
        useNativeDriver: true,
    });
}

// ─── Content Slide (tab içeriği için) ────────────────────────────────────────
export function animateTabContent(
    anim: Animated.Value,
    toValue: number,
    duration = DURATION.normal + 30
) {
    return Animated.timing(anim, {
        toValue,
        duration,
        easing: EASE.snappy,
        useNativeDriver: true,
    });
}

// ─── Parallel helper ─────────────────────────────────────────────────────────
export function animateTabSwitch(
    indicator: Animated.Value,
    content: Animated.Value,
    tabIndex: number,
    toValue: number,
) {
    return Animated.parallel([
        animateTabIndicator(indicator, tabIndex),
        animateTabContent(content, toValue),
    ]);
}
