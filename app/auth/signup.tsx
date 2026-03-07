import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const { signup, signInWithGoogle, checkUsernameAvailable } = useAuth();
  const otpInputRef = useRef<TextInput>(null);

  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [error, setError] = useState('');
  const [usernameState, setUsernameState] = useState<'idle' | 'checking' | 'ok' | 'taken' | 'invalid'>('idle');

  // Password strength: 0=none, 1=weak, 2=medium, 3=strong
  const passwordStrength = (() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password) || /[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score++;
    return score;
  })();
  const strengthLabel = ['', 'Zayıf', 'Orta', 'Güçlü'][passwordStrength];
  const strengthColor = ['', Colors.error, '#F5A623', Colors.success][passwordStrength];

  const checkUsername = async (val: string) => {
    const v = val.replace(/\s/g, '').toLowerCase();
    setUsername(v);
    setError('');
    if (!v) { setUsernameState('idle'); return; }
    if (!/^[a-z0-9_]+$/.test(v)) { setUsernameState('invalid'); return; }
    if (v.length < 3) { setUsernameState('idle'); return; }
    setUsernameState('checking');
    const ok = await checkUsernameAvailable(v);
    setUsernameState(ok ? 'ok' : 'taken');
  };

  const usernameColor =
    usernameState === 'ok' ? Colors.success :
      usernameState === 'taken' || usernameState === 'invalid' ? Colors.error : Colors.border;

  const handleSignup = async () => {
    if (!fullName.trim() || !username.trim() || !email.trim() || !password) {
      setError('Tüm alanları doldurun'); return;
    }
    if (usernameState === 'taken') { setError('Bu kullanıcı adı alınmış'); return; }
    if (usernameState === 'invalid') { setError('Geçersiz kullanıcı adı'); return; }
    if (password.length < 8) { setError('Şifre en az 8 karakter olmalı'); return; }
    if (password !== confirmPass) { setError('Şifreler eşleşmiyor'); return; }

    setError(''); setLoading(true);
    const res = await signup(email.trim().toLowerCase(), password, 'individual', {
      username: username.toLowerCase(),
      fullName: fullName.trim(),
    });
    setLoading(false);

    if (res.error) { setError(res.error); return; }
    // Kayıt başarılı → email doğrulama adımına geç
    setStep('verify');
  };

  const handleGoogle = async () => {
    setGLoading(true);
    const res = await signInWithGoogle();
    if (res.error) setError(res.error);
    setGLoading(false);
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      setError('6 haneli kodu giriniz');
      return;
    }
    setVerifyLoading(true);
    setError('');

    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: verificationCode,
      type: 'signup'
    });

    setVerifyLoading(false);

    if (error) {
      setError(error.message || 'Kod hatalı veya süresi dolmuş');
    } else {
      router.replace('/');
    }
  };

  // ── Email Verify Step ──────────────────────────────────────────────
  if (step === 'verify') {
    return (
      <View style={[s.root, s.verifyWrap, { paddingTop: insets.top }]}>
        <View style={s.verifyCard}>
          <View style={[s.logoCircle, { backgroundColor: Colors.success + '20', marginBottom: 20 }]}>
            <Ionicons name="mail-outline" size={32} color={Colors.success} />
          </View>
          <Text style={s.verifyTitle}>E-postanı Doğrula</Text>
          <Text style={s.verifyBody}>
            <Text style={{ fontWeight: '600' }}>{email}</Text> adresine 6 haneli bir doğrulama kodu gönderdik.{'\n\n'}
            Lütfen kodu aşağıya girin.
          </Text>

          <TouchableOpacity activeOpacity={1} onPress={() => otpInputRef.current?.focus()} style={s.otpContainer}>
            {Array.from({ length: 6 }).map((_, idx) => (
              <View key={idx} style={[s.otpBox, verificationCode.length === idx && s.otpBoxActive]}>
                <Text style={s.otpText}>{verificationCode[idx] || ''}</Text>
              </View>
            ))}
            <TextInput
              ref={otpInputRef}
              style={s.hiddenOtpInput}
              value={verificationCode}
              onChangeText={t => { setVerificationCode(t.replace(/[^0-9]/g, '')); setError(''); }}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
          </TouchableOpacity>

          {!!error && (
            <View style={[s.errorBox, { marginTop: 12, alignSelf: 'stretch' }]}>
              <Ionicons name="alert-circle-outline" size={14} color={Colors.error} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.primaryBtn, { marginTop: 24, alignSelf: 'stretch' }, verifyLoading && s.btnDisabled]}
            onPress={handleVerify}
            disabled={verifyLoading}
          >
            {verifyLoading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.primaryBtnText}>Doğrula</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={[s.guestBtn, { marginTop: 16 }]} onPress={() => setStep('form')}>
            <Text style={s.guestText}>Geri dön ve bilgileri düzelt</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Signup Form ────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={s.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={s.logoCircle}>
            <Text style={s.logoText}>M</Text>
          </View>
          <Text style={s.title}>Hesap Oluştur</Text>
          <Text style={s.subtitle}>Yeteneğini dünyayla paylaşmaya başla</Text>
        </View>

        <View style={s.form}>
          {/* Full name */}
          <View style={s.inputWrap}>
            <Ionicons name="person-outline" size={18} color={Colors.textMuted} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="Ad Soyad"
              placeholderTextColor={Colors.textMuted}
              value={fullName}
              onChangeText={t => { setFullName(t); setError(''); }}
              autoCapitalize="words"
            />
          </View>

          {/* Username */}
          <View style={[s.inputWrap, { borderColor: usernameColor }]}>
            <Ionicons name="at-outline" size={18} color={Colors.textMuted} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="kullaniciadi"
              placeholderTextColor={Colors.textMuted}
              value={username}
              onChangeText={checkUsername}
              autoCapitalize="none"
            />
            {usernameState === 'checking' && <ActivityIndicator size="small" color={Colors.textMuted} />}
            {usernameState === 'ok' && <Ionicons name="checkmark-circle" size={18} color={Colors.success} />}
            {(usernameState === 'taken' || usernameState === 'invalid') && (
              <Ionicons name="close-circle" size={18} color={Colors.error} />
            )}
          </View>
          {usernameState === 'taken' && <Text style={s.fieldError}>Bu kullanıcı adı alınmış</Text>}
          {usernameState === 'invalid' && <Text style={s.fieldError}>Sadece harf, rakam ve _ kullanılabilir</Text>}

          {/* Email */}
          <View style={s.inputWrap}>
            <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="E-posta"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={t => { setEmail(t); setError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password */}
          <View style={s.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={s.inputIcon} />
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="Şifre (min 8 karakter)"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={t => { setPassword(t); setError(''); }}
              secureTextEntry={!showPass}
            />
            <TouchableOpacity onPress={() => setShowPass(v => !v)} style={s.eyeBtn}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Password strength indicator */}
          {password.length > 0 && (
            <View style={s.strengthWrap}>
              <View style={s.strengthBars}>
                {[1, 2, 3].map(i => (
                  <View
                    key={i}
                    style={[
                      s.strengthBar,
                      { backgroundColor: i <= passwordStrength ? strengthColor : Colors.border }
                    ]}
                  />
                ))}
              </View>
              <Text style={[s.strengthLabel, { color: strengthColor }]}>{strengthLabel}</Text>
            </View>
          )}

          {/* Confirm password */}
          <View style={[s.inputWrap, confirmPass && password !== confirmPass ? { borderColor: Colors.error } : {}]}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={s.inputIcon} />
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="Şifreyi Onayla"
              placeholderTextColor={Colors.textMuted}
              value={confirmPass}
              onChangeText={t => { setConfirmPass(t); setError(''); }}
              secureTextEntry={!showPass}
            />
            {confirmPass.length > 0 && (
              <Ionicons
                name={password === confirmPass ? 'checkmark-circle' : 'close-circle'}
                size={18}
                color={password === confirmPass ? Colors.success : Colors.error}
              />
            )}
          </View>

          {!!error && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={14} color={Colors.error} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.primaryBtn, loading && s.btnDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.primaryBtnText}>Kayıt Ol</Text>
            }
          </TouchableOpacity>

          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>veya</Text>
            <View style={s.dividerLine} />
          </View>

          <TouchableOpacity
            style={[s.googleBtn, gLoading && s.btnDisabled]}
            onPress={handleGoogle}
            disabled={gLoading}
            activeOpacity={0.85}
          >
            {gLoading ? (
              <ActivityIndicator color={Colors.text} size="small" />
            ) : (
              <>
                <Text style={s.googleIcon}>G</Text>
                <Text style={s.googleText}>Google ile Devam Et</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>Zaten hesabın var mı?</Text>
          <TouchableOpacity onPress={() => router.replace('/auth/login')}>
            <Text style={s.footerLink}> Giriş Yap</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.guestBtn} onPress={() => router.replace('/')}>
          <Text style={s.guestText}>Şimdi değil, keşfet</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  inner: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 40 },

  // Verify step
  verifyWrap: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  verifyCard: { alignItems: 'center', maxWidth: 340 },
  verifyTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: 12 },
  verifyBody: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  // OTP
  otpContainer: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 24, position: 'relative' },
  otpBox: {
    width: 44, height: 52,
    borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center'
  },
  otpBoxActive: { borderColor: Colors.primary },
  otpText: { fontSize: 20, fontWeight: '700', color: Colors.text },
  hiddenOtpInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    fontSize: 1 // For android compat
  },

  // Header
  header: { alignItems: 'center', paddingTop: 40, paddingBottom: 36 },
  backBtn: { position: 'absolute', left: 0, top: 40, padding: 4 },
  logoCircle: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  logoText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginTop: 4 },

  // Form
  form: { gap: 12 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: Colors.text },
  eyeBtn: { padding: 4 },
  fieldError: { color: Colors.error, fontSize: 12, marginTop: -6, marginLeft: 4 },

  strengthWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -4 },
  strengthBars: { flexDirection: 'row', gap: 4, flex: 1 },
  strengthBar: { flex: 1, height: 3, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '600', minWidth: 36, textAlign: 'right' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.error + '12',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
  },
  errorText: { color: Colors.error, fontSize: 13, flex: 1 },

  primaryBtn: {
    height: 52, borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  dividerText: { color: Colors.textMuted, fontSize: 13 },

  googleBtn: {
    height: 52, borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  googleIcon: { fontSize: 18, fontWeight: '800', color: '#4285F4' },
  googleText: { fontSize: 15, fontWeight: '600', color: Colors.text },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  footerText: { color: Colors.textSecondary, fontSize: 14 },
  footerLink: { color: Colors.primary, fontSize: 14, fontWeight: '600' },

  guestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 12 },
  guestText: { color: Colors.textMuted, fontSize: 13 },
});
