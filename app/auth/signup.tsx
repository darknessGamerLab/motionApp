import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
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
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type UserType = 'individual' | 'corporate';

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const { signup } = useAuth();
  
  const [userType, setUserType] = useState<UserType>('individual');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Mock taken usernames
  const TAKEN_USERNAMES = ['admin', 'johndoe', 'janedoe', 'test', 'user', 'ahmet', 'ayse', 'mehmet'];

  const checkUsername = (value: string) => {
    setUsername(value);
    setUsernameError('');
    
    if (!value.trim()) return;
    
    // Validate format
    if (!/^[a-z0-9_]+$/.test(value.toLowerCase())) {
      setUsernameError('Sadece harf, rakam ve alt çizgi kullanılabilir');
      return;
    }
    
    if (value.length < 3) {
      setUsernameError('En az 3 karakter olmalı');
      return;
    }

    // Check uniqueness (mock)
    setCheckingUsername(true);
    setTimeout(() => {
      if (TAKEN_USERNAMES.includes(value.toLowerCase())) {
        setUsernameError('Bu kullanıcı adı zaten alınmış');
      }
      setCheckingUsername(false);
    }, 300);
  };

  const handleSignup = () => {
    if (!email.trim() || !password.trim() || !username.trim() || !fullName.trim()) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    if (usernameError) {
      setError('Lütfen geçerli bir kullanıcı adı seçin');
      return;
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return;
    }

    setError('');
    setLoading(true);

    signup(email.trim(), userType, {
      username: username.trim().toLowerCase(),
      fullName: fullName.trim(),
    });
    
    setTimeout(() => {
      setLoading(false);
      router.replace('/auth/verifyCode');
    }, 300);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Hesap Oluştur</Text>
            <Text style={styles.subtitle}>Yeteneklerini keşfetmeye başla</Text>
          </View>

          {/* User Type Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, userType === 'individual' && styles.tabActive]}
              onPress={() => setUserType('individual')}
            >
              <Text style={[styles.tabText, userType === 'individual' && styles.tabTextActive]}>
                Bireysel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, userType === 'corporate' && styles.tabActive]}
              onPress={() => setUserType('corporate')}
            >
              <Text style={[styles.tabText, userType === 'corporate' && styles.tabTextActive]}>
                Kurumsal
              </Text>
            </TouchableOpacity>
            {/* Active indicator */}
            <View 
              style={[
                styles.tabIndicator, 
                { left: userType === 'individual' ? 0 : '50%' }
              ]} 
            />
          </View>

          <View style={styles.form}>
            {/* Full Name */}
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={userType === 'corporate' ? 'Şirket Adı' : 'Ad Soyad'}
                placeholderTextColor={Colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>

            {/* Username */}
            <View style={[styles.inputContainer, usernameError && styles.inputError]}>
              <Text style={styles.usernamePrefix}>@</Text>
              <TextInput
                style={styles.input}
                placeholder="Kullanıcı adı"
                placeholderTextColor={Colors.textMuted}
                value={username}
                onChangeText={checkUsername}
                autoCapitalize="none"
                autoComplete="username"
              />
              {checkingUsername && (
                <ActivityIndicator size="small" color={Colors.textMuted} />
              )}
              {!checkingUsername && username.length >= 3 && !usernameError && (
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              )}
            </View>
            {usernameError ? <Text style={styles.fieldError}>{usernameError}</Text> : null}

            {/* Email */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Şifre (min 6 karakter)"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password-new"
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Info Text */}
            <Text style={styles.infoText}>
              {userType === 'individual' 
                ? 'Yeteneklerini sergileyerek fırsatları yakala!'
                : 'Yetenekli bireyleri keşfet ve işe al!'}
            </Text>

            {/* Signup Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Devam Et</Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Zaten hesabınız var mı? </Text>
              <TouchableOpacity onPress={() => router.push('/auth/login')}>
                <Text style={styles.footerLink}>Giriş Yap</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
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
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    position: 'relative',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    zIndex: 1,
  },
  tabActive: {},
  tabText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: '50%',
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIcon: {
    marginRight: 12,
  },
  usernamePrefix: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  input: {
    flex: 1,
    height: 52,
    color: Colors.text,
    fontSize: 16,
  },
  inputError: {
    borderColor: Colors.error,
  },
  fieldError: {
    color: Colors.error,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  infoText: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
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
    fontWeight: '700',
  },
  footer: {
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
    fontWeight: '600',
  },
});
