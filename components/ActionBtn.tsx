/**
 * ActionBtn — reusable animated icon button for feed interactions.
 *
 * Extracted from HomeScreen.tsx to keep each concern in its own file.
 * Renders a bouncing icon with an optional count label.
 */

import { formatNumber } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';

interface ActionBtnProps {
    icon: string;
    filledIcon?: string;
    count?: number;
    color?: string;
    active?: boolean;
    onPress?: () => void;
}

const ActionBtn = memo(({
    icon,
    filledIcon,
    count,
    color,
    active,
    onPress,
}: ActionBtnProps) => {
    const scale = useRef(new Animated.Value(1)).current;
    const prevActive = useRef(active);

    const bounce = useCallback(() => {
        Animated.sequence([
            Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, speed: 30 }),
            Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }),
        ]).start();
    }, [scale]);

    useEffect(() => {
        if (prevActive.current === active) return;
        prevActive.current = active;
        bounce();
    }, [active, bounce]);

    const handlePress = useCallback(() => {
        bounce();
        onPress?.();
    }, [bounce, onPress]);

    return (
        <TouchableOpacity style={styles.actionBtn} onPress={handlePress} activeOpacity={0.75}>
            <Animated.View style={{ transform: [{ scale }] }}>
                <Ionicons
                    name={(active && filledIcon ? filledIcon : icon) as any}
                    size={30}
                    color={color || '#fff'}
                />
            </Animated.View>
            {count !== undefined && (
                <Text style={styles.actionCount}>{formatNumber(count)}</Text>
            )}
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    actionBtn: {
        alignItems: 'center',
        gap: 3,
        paddingVertical: 4,
    },
    actionCount: {
        color: '#fff',
        fontSize: 12,
        fontFamily: 'Poppins_600SemiBold',
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
});

export default ActionBtn;
