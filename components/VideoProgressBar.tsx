/**
 * VideoProgressBar — thin progress indicator at the top of the video card.
 *
 * Extracted from HomeScreen.tsx VideoCard component.
 * Receives `progress` (0–1) from the player's timeUpdate listener.
 */

import Colors from '@/constants/Colors';
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

interface VideoProgressBarProps {
    progress: number; // 0 – 1
}

const VideoProgressBar = memo(({ progress }: VideoProgressBarProps) => (
    <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(progress * 100, 100)}%` }]} />
    </View>
));

const styles = StyleSheet.create({
    track: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    fill: {
        height: 2,
        backgroundColor: Colors.primary,
    },
});

export default VideoProgressBar;
