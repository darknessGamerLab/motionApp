import Colors from '@/constants/Colors';
import React, { useCallback, useEffect, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

let showGlobalAlert: (title: string, message?: string, buttons?: any[], options?: any) => void;

export const CustomAlert = {
    alert: (
        title: string,
        message?: string,
        buttons?: { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }[],
        options?: any
    ) => {
        if (showGlobalAlert) {
            showGlobalAlert(title, message, buttons, options);
        } else {
            console.warn('GlobalAlert is not mounted!');
        }
    }
};

export const GlobalAlert = () => {
    const [visible, setVisible] = useState(false);
    const [config, setConfig] = useState<any>(null);
    const [opacity] = useState(new Animated.Value(0));

    useEffect(() => {
        showGlobalAlert = (title, message, buttons, options) => {
            let defaultBtns = buttons;
            if (!defaultBtns || defaultBtns.length === 0) {
                defaultBtns = [{ text: 'Tamam' }];
            }
            setConfig({ title, message, buttons: defaultBtns, options });
            setVisible(true);
            Animated.timing(opacity, {
                toValue: 1,
                duration: 250,
                // bouncy feel
                useNativeDriver: true,
            }).start();
        };
    }, [opacity]);

    const close = useCallback((onPress?: () => void) => {
        Animated.timing(opacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            setVisible(false);
            setConfig(null);
            if (onPress) onPress();
        });
    }, [opacity]);

    if (!visible || !config) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={() => {
                if (config.options?.cancelable) close();
            }}
        >
            <View style={styles.overlay}>
                {/* Arkaplan dokunuşla kapatma (cancelable ise) */}
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={() => {
                        if (config.options?.cancelable) close();
                    }}
                />

                <Animated.View style={[styles.alertBox, {
                    opacity,
                    transform: [{
                        scale: opacity.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.95, 1], // modern pop effect
                        })
                    }]
                }]}>
                    {/* İkon veya görsel alan eklenebilir ama şu an için sadece metin */}
                    <Text style={styles.title}>{config.title}</Text>
                    {config.message && <Text style={styles.message}>{config.message}</Text>}

                    <View style={[
                        styles.buttonContainer,
                        { flexDirection: config.buttons?.length === 2 ? 'row' : 'column' }
                    ]}>
                        {config.buttons?.map((btn: any, index: number) => {
                            const isDestructive = btn.style === 'destructive';
                            const isCancel = btn.style === 'cancel';

                            return (
                                <TouchableOpacity
                                    key={index}
                                    activeOpacity={0.85}
                                    style={[
                                        styles.button,
                                        config.buttons.length === 2 ? { flex: 1 } : {},
                                        isCancel ? styles.buttonCancel : styles.buttonPrimary,
                                        isDestructive && styles.buttonDestructive,
                                    ]}
                                    onPress={() => close(btn.onPress)}
                                >
                                    <Text style={[
                                        styles.buttonText,
                                        isCancel ? styles.textCancel : styles.textPrimary
                                    ]}>
                                        {btn.text || 'Tamam'}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        paddingHorizontal: 24,
    },
    alertBox: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: Colors.surface,
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.3,
    },
    message: {
        fontSize: 15,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    buttonContainer: {
        marginTop: 24,
        gap: 12,
        width: '100%',
    },
    button: {
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    buttonPrimary: {
        backgroundColor: Colors.primary,
    },
    buttonDestructive: {
        backgroundColor: Colors.error,
    },
    buttonCancel: {
        backgroundColor: Colors.surfaceAlt,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    textPrimary: {
        color: '#fff',
    },
    textCancel: {
        color: Colors.text,
    },
});
