import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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

type Step = 'email' | 'otp' | 'newPassword' | 'success';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { resetPassword } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer(p => p <= 1 ? (clearInterval(id), 0) : p - 1), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  // --- Step 1: Email ---
  const handleEmailSubmit = async () => {
    if (!email.trim()) { setError('Lütfen e-posta adresinizi girin'); return; }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email.trim())) { setError('Geçerli bir e-posta adresi girin'); return; }

    setError('');
    setLoading(true);
    const result = await resetPassword(email.trim());
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setResendTimer(60);
      setStep('otp');
    }
  };

  // --- Step 2: OTP ---
  const handleOtpChange = (value: string, index: number) => {
    const v = value.slice(-1);
    const next = [...otp];
    next[index] = v;
    setOtp(next);
    setError('');
    if (v && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpVerify = () => {
    const code = otp.join('');
    if (code.length !== 6) { setError('Lütfen 6 haneli kodu girin'); return; }
    setError('');
    // In production: verify OTP with Supabase
    setStep('newPassword');
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setOtp(['', '', '', '', '', '']);
    setError('');
    setLoading(true);
    await resetPassword(email.trim());
    setLoading(false);
    setResendTimer(60);
    otpRefs.current[0]?.focus();
  };

  // --- Step 3: New Password ---
  const handlePasswordReset = () => {
    if (!newPassword.trim()) { setError('Yeni şifrenizi girin'); return; }
    if (newPassword.length < 6) { setError('Şifre en az 6 karakter olmalıdır'); return; }
    if (newPassword !== confirmPassword) { setError('Şifreler eşleşmiyor'); return; }
    setError('');
    // In production: update password via Supabase
    setStep('success');
  };

  // --- Progress indicator ---
  const stepIndex = step === 'email' ? 0 : step === 'otp' ? 1 : step === 'newPassword' ? 2 : 3;

  // --- Render ---
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
        {/* Header */}
        {step !== 'success' && (
          <TouchableOpacity style={styles.backButton} onPress={() => {
            if (step === 'email') router.back();
            else if (step === 'otp') setStep('email');
            else if (step === 'newPassword') setStep('otp');
          }}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
        )}

        {/* Progress Bar */}
        {step !== 'success' && (
          <View style={styles.progressRow}>
            {[0, 1, 2].map(i => (
              <View key={i} style={[styles.progressDot, i <= stepIndex - (step === 'newPassword' ? 1 : 0) && styles.progressDotActive]} />
            ))}
          </View>
        )}

        {/* ─── STEP 1: Email ─── */}
        {step === 'email' && (
          <>
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="mail-outline" size={40} color={Colors.primary} />
              </View>
            </View>
            <Text style={styles.title}>Şifremi Unuttum</Text>
            <Text style={styles.subtitle}>
              Kayıtlı e-posta adresinize 6 haneli doğrulama kodu göndereceğiz.
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="E-posta adresiniz"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={t => { setEmail(t); setError(''); }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                autoFocus
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleEmailSubmit}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Kod Gönder</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.footerRow} onPress={() => router.push('/auth/login')}>
              <Text style={styles.footerText}>Şifreni hatırladın mı? </Text>
              <Text style={styles.footerLink}>Giriş Yap</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ─── STEP 2: OTP ─── */}
        {step === 'otp' && (
          <>
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="keypad-outline" size={40} color={Colors.primary} />
              </View>
            </View>
            <Text style={styles.title}>Kodu Girin</Text>
            <Text style={styles.subtitle}>
              <Text style={{ fontWeight: '600', color: Colors.text }}>{email}</Text>
              {' '}adresine gönderilen 6 haneli kodu girin.
            </Text>

            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={ref => { otpRefs.current[index] = ref; }}
                  style={[
                    styles.otpInput,
                    otp[index] && styles.otpInputFilled,
                    error && styles.otpInputError,
                  ]}
                  value={digit}
                  onChangeText={v => handleOtpChange(v, index)}
                  onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  autoFocus={index === 0}
                />
              ))}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity style={styles.button} onPress={handleOtpVerify}>
              <Text style={styles.buttonText}>Doğrula</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendBtn}
              onPress={handleResend}
              disabled={resendTimer > 0}
            >
              <Text style={[styles.resendText, resendTimer > 0 && styles.resendTextDisabled]}>
                {resendTimer > 0 ? `Tekrar gönder (${resendTimer}s)` : 'Kodu tekrar gönder'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ─── STEP 3: New Password ─── */}
        {step === 'newPassword' && (
          <>
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="lock-open-outline" size={40} color={Colors.primary} />
              </View>
            </View>
            <Text style={styles.title}>Yeni Şifre</Text>
            <Text style={styles.subtitle}>Hesabınız için güçlü bir şifre belirleyin.</Text>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Yeni şifre (min. 6 karakter)"
                placeholderTextColor={Colors.textMuted}
                value={newPassword}
                onChangeText={t => { setNewPassword(t); setError(''); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Şifreyi onayla"
                placeholderTextColor={Colors.textMuted}
                value={confirmPassword}
                onChangeText={t => { setConfirmPassword(t); setError(''); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity style={styles.button} onPress={handlePasswordReset}>
              <Text style={styles.buttonText}>Şifremi Güncelle</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ─── SUCCESS ─── */}
        {step === 'success' && (
          <View style={styles.successContainer}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle" size={80} color={Colors.success} />
            </View>
            <Text style={styles.successTitle}>Şifre Güncellendi!</Text>
            <Text style={styles.successSubtitle}>
              Şifreniz başarıyla değiştirildi. Yeni şifrenizle giriş yapabilirsiniz.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.replace('/auth/login')}
            >
              <Text style={styles.buttonText}>Giriş Sayfasına Dön</Text>
            </TouchableOpacity>
          </View>
        )}
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
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 28,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    marginBottom: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  inputIcon: {
    marginRight: 12,
  },
  eyeBtn: {
    paddingLeft: 8,
  },
  input: {
    flex: 1,
    height: 54,
    color: Colors.text,
    fontSize: 16,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  otpInput: {
    width: 48,
    height: 58,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    color: Colors.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  otpInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  otpInputError: {
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
    backgroundColor: '#FFF0F0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  button: {
    backgroundColor: Colors.primary,
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  resendBtn: {
    marginTop: 20,
    alignItems: 'center',
    padding: 12,
  },
  resendText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  resendTextDisabled: {
    color: Colors.textMuted,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  // Success
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  successIconWrap: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
});
