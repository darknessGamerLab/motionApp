/**
 * ErrorBoundary — Uygulama genelinde render hatalarını yakalar.
 *
 * Kullanım:
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 *
 * Bir child component'inde render hatası olursa beyaz ekran yerine
 * anlaşılır bir hata mesajı ve yeniden deneme butonu gösterir.
 */

import Colors from '@/constants/Colors';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, errorMessage: '' };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, errorMessage: error.message };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        // Production'da Sentry / Crashlytics buraya bağlanır
        console.error('[ErrorBoundary] Render hatası:', error, info.componentStack);
    }

    handleRetry = () => {
        this.setState({ hasError: false, errorMessage: '' });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <View style={s.container}>
                    <Text style={s.emoji}>🔧</Text>
                    <Text style={s.title}>Bir şeyler ters gitti</Text>
                    <Text style={s.subtitle}>
                        Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.
                    </Text>
                    {__DEV__ && (
                        <Text style={s.devError} numberOfLines={4}>
                            {this.state.errorMessage}
                        </Text>
                    )}
                    <TouchableOpacity style={s.btn} onPress={this.handleRetry} activeOpacity={0.8}>
                        <Text style={s.btnText}>Yeniden Dene</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    emoji: { fontSize: 48, marginBottom: 16 },
    title: {
        fontSize: 20,
        fontFamily: 'Poppins_700Bold',
        color: Colors.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    devError: {
        fontSize: 11,
        color: Colors.error,
        backgroundColor: Colors.error + '10',
        borderRadius: 8,
        padding: 12,
        marginBottom: 24,
        fontFamily: 'Poppins_400Regular', // or keep monospace for coding errors? User asked for *all* text
        width: '100%',
    },
    btn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
    },
    btnText: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold' },
});
