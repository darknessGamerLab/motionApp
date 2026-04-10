import { DarkPalette as Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
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

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim()) { setError('E-posta adresinizi girin'); return; }
    if (!password) { setError('Şifrenizi girin'); return; }
    setError(''); setLoading(true);
    const res = await login(email.trim().toLowerCase(), password);
    if (res.error) setError(res.error);
    setLoading(false);
  };

  const handleGoogle = async () => {
    setGLoading(true);
    const res = await signInWithGoogle();
    if (res.error) setError(res.error);
    setGLoading(false);
  };

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
        {/* Logo */}
        <View style={s.logoWrap}>
          <Text style={s.appName}>Spotlights</Text>
          <Text style={s.tagline}>Yeteneğini dünyayla paylaş</Text>
        </View>

        {/* Form */}
        <View style={s.form}>
          <View style={s.inputWrap}>
            <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="E-posta"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={t => { setEmail(t); setError(''); }}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
            />
          </View>

          <View style={s.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={s.inputIcon} />
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="Şifre"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={t => { setPassword(t); setError(''); }}
              secureTextEntry={!showPass}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPass(v => !v)} style={s.eyeBtn}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {!!error && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={14} color={Colors.error} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={s.forgotBtn}
            onPress={() => router.push('/auth/forgotPassword')}
          >
            <Text style={s.forgotText}>Şifremi unuttum</Text>
          </TouchableOpacity>

          {/* Primary button */}
          <TouchableOpacity
            style={[s.primaryBtn, loading && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.primaryBtnText}>Giriş Yap</Text>
            }
          </TouchableOpacity>

          {/* Divider */}
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>veya</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Google */}
          <TouchableOpacity
            style={[s.googleBtn, gLoading && s.btnDisabled]}
            onPress={handleGoogle}
            disabled={gLoading}
            activeOpacity={0.85}
          >
            {gLoading ? (
              <ActivityIndicator color="#000000" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="google" size={20} color="#4285F4" />
                <Text style={s.googleText}>Google ile Devam Et</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>Hesabın yok mu?</Text>
          <TouchableOpacity onPress={() => router.replace('/auth/signup')}>
            <Text style={s.footerLink}> Kayıt Ol</Text>
          </TouchableOpacity>
        </View>

        {/* Guest */}
        <TouchableOpacity style={s.guestBtn} onPress={() => router.replace('/')}>
          <Text style={s.guestText}>Şimdi değil, keşfet</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  inner: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24 },

  // Logo
  logoWrap: { alignItems: 'center', paddingTop: 48, paddingBottom: 36 },
  appName: { fontSize: 26, fontFamily: 'Poppins_700Bold', color: '#FFFFFF', letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: '#A0A0A0', marginTop: 4, fontFamily: 'Poppins_400Regular' },

  // Form
  form: { gap: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 10,
    paddingHorizontal: 12, height: 46,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: Colors.text, fontFamily: 'Poppins_400Regular' },
  eyeBtn: { padding: 4 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.error + '12',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
  },
  errorText: { color: Colors.error, fontSize: 13, flex: 1, fontFamily: 'Poppins_500Medium' },

  forgotBtn: { alignSelf: 'flex-end' },
  forgotText: { color: Colors.primary, fontSize: 13, fontFamily: 'Poppins_500Medium' },

  primaryBtn: {
    height: 52, borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  dividerText: { color: Colors.textMuted, fontSize: 13, fontFamily: 'Poppins_400Regular' },

  googleBtn: {
    height: 46, borderRadius: 10,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  googleText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: '#000000' },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { color: Colors.textSecondary, fontSize: 14, fontFamily: 'Poppins_400Regular' },
  footerLink: { color: Colors.primary, fontSize: 14, fontFamily: 'Poppins_600SemiBold' },

  guestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, marginTop: 16,
  },
  guestText: { color: Colors.textMuted, fontSize: 13, fontFamily: 'Poppins_400Regular' },
});
