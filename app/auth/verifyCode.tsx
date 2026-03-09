import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VerifyCodeScreen() {
  const insets = useSafeAreaInsets();

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleCodeChange = (value: string, index: number) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const codeString = code.join('');

    if (codeString.length !== 6) {
      setError('Lütfen 6 haneli kodu girin');
      return;
    }

    setError('');
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      router.replace('/auth/selectTalent');
    }, 500);
  };

  const handleResend = () => {
    if (resendTimer > 0) return;

    setError('');
    setCode(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();

    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-outline" size={40} color={Colors.primary} />
          </View>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Doğrulama Kodu</Text>
          <Text style={styles.subtitle}>
            Email adresinize gönderilen 6 haneli kodu girin
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={[
                  styles.codeInput,
                  code[index] && styles.codeInputFilled,
                  error && styles.codeInputError
                ]}
                value={digit}
                onChangeText={(value) => handleCodeChange(value, index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                autoFocus={index === 0}
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Doğrula</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResend}
            disabled={resendTimer > 0}
          >
            <Text style={[styles.resendText, resendTimer > 0 && styles.resendTextDisabled]}>
              {resendTimer > 0
                ? `Tekrar gönder (${resendTimer}s)`
                : 'Kodu tekrar gönder'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryDark + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: Colors.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Poppins_400Regular',
  },
  form: {
    width: '100%',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 10,
  },
  codeInput: {
    width: 48,
    height: 56,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    color: Colors.text,
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
  },
  codeInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryDark + '10',
  },
  codeInputError: {
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Poppins_500Medium',
  },
  button: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  resendButton: {
    marginTop: 20,
    alignItems: 'center',
    padding: 12,
  },
  resendText: {
    color: Colors.primary,
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  resendTextDisabled: {
    color: Colors.textMuted,
  },
});
