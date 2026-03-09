import { CustomAlert as Alert } from '@/components/GlobalAlert';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SettingsScreenProps {
  onBackPress?: () => void;
  onEditProfile?: () => void;
}

interface SettingItemProps {
  icon: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  danger?: boolean;
  badge?: string;
}

function SettingItem({ icon, iconBg, title, subtitle, onPress, danger, badge }: SettingItemProps) {
  return (
    <TouchableOpacity style={styles.settingItem} onPress={onPress} activeOpacity={0.6}>
      <View style={[styles.settingIcon, danger && styles.settingIconDanger, iconBg ? { backgroundColor: iconBg } : null]}>
        <Ionicons name={icon as any} size={20} color={danger ? Colors.error : '#fff'} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingTitle, danger && styles.settingTitleDanger]}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color={Colors.textDim} />
    </TouchableOpacity>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

// Corporate Upgrade Modal
function CorporateUpgradeModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { submitCorporateApplication } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!companyName.trim() || !taxOffice.trim() || !taxNumber.trim() || !phone.trim()) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }
    if (!/^\d{10}$/.test(taxNumber.trim())) {
      setError('Vergi numarası 10 haneli olmalıdır');
      return;
    }
    setError('');
    setLoading(true);
    const result = await submitCorporateApplication({
      companyName: companyName.trim(),
      taxOffice: taxOffice.trim(),
      taxNumber: taxNumber.trim(),
      phone: phone.trim(),
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSubmitted(true);
    }
  };

  const handleClose = () => {
    setCompanyName('');
    setTaxOffice('');
    setTaxNumber('');
    setPhone('');
    setError('');
    setSubmitted(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={modalStyles.container}>
          {/* Header */}
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Kurumsal Hesap Başvurusu</Text>
            <TouchableOpacity onPress={handleClose} style={modalStyles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {submitted ? (
            <View style={modalStyles.successContainer}>
              <View style={modalStyles.successIcon}>
                <Ionicons name="checkmark-circle" size={72} color={Colors.success} />
              </View>
              <Text style={modalStyles.successTitle}>Başvurunuz Alındı!</Text>
              <Text style={modalStyles.successText}>
                Kurumsal hesap başvurunuz incelemeye alındı. Sonuç e-posta adresinize iletilecektir.{'\n\n'}
                Onay süreci genellikle 1-3 iş günü sürmektedir.
              </Text>
              <TouchableOpacity style={modalStyles.closeButton} onPress={handleClose}>
                <Text style={modalStyles.closeButtonText}>Tamam</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={modalStyles.scrollContent}>
              <View style={modalStyles.infoBox}>
                <Ionicons name="information-circle-outline" size={18} color={Colors.info} />
                <Text style={modalStyles.infoText}>
                  Başvurunuz incelendikten sonra hesabınız kurumsal hesaba dönüştürülecek ve e-posta ile bilgilendirileceksiniz.
                </Text>
              </View>

              <Text style={modalStyles.sectionLabel}>Şirket Bilgileri</Text>

              <View style={modalStyles.inputContainer}>
                <Ionicons name="business-outline" size={20} color={Colors.textMuted} style={modalStyles.inputIcon} />
                <TextInput
                  style={modalStyles.input}
                  placeholder="Şirket Adı"
                  placeholderTextColor={Colors.textMuted}
                  value={companyName}
                  onChangeText={setCompanyName}
                  autoCapitalize="words"
                />
              </View>

              <View style={modalStyles.inputContainer}>
                <Ionicons name="home-outline" size={20} color={Colors.textMuted} style={modalStyles.inputIcon} />
                <TextInput
                  style={modalStyles.input}
                  placeholder="Vergi Dairesi"
                  placeholderTextColor={Colors.textMuted}
                  value={taxOffice}
                  onChangeText={setTaxOffice}
                  autoCapitalize="words"
                />
              </View>

              <View style={modalStyles.inputContainer}>
                <Ionicons name="receipt-outline" size={20} color={Colors.textMuted} style={modalStyles.inputIcon} />
                <TextInput
                  style={modalStyles.input}
                  placeholder="Vergi Numarası (10 hane)"
                  placeholderTextColor={Colors.textMuted}
                  value={taxNumber}
                  onChangeText={setTaxNumber}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>

              <View style={modalStyles.inputContainer}>
                <Ionicons name="call-outline" size={20} color={Colors.textMuted} style={modalStyles.inputIcon} />
                <TextInput
                  style={modalStyles.input}
                  placeholder="Telefon Numarası"
                  placeholderTextColor={Colors.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>

              {error ? <Text style={modalStyles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[modalStyles.submitBtn, loading && modalStyles.btnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={modalStyles.submitBtnText}>Başvuru Gönder</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function SettingsScreen({ onBackPress, onEditProfile }: SettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const { logout, authState, refreshProfile } = useAuth();
  const [showCorporateModal, setShowCorporateModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [])
  );

  const isCorporate = authState.userType === 'corporate';

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabından çıkış yapmak istediğine emin misin?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Çıkış Yap', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ayarlar</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Account Type Badge */}
      <View style={[styles.accountBadge, isCorporate && styles.accountBadgeCorporate]}>
        <Ionicons
          name={isCorporate ? 'business' : 'person'}
          size={14}
          color={isCorporate ? '#7C3AED' : Colors.primary}
        />
        <Text style={[styles.accountBadgeText, isCorporate && styles.accountBadgeTextCorporate]}>
          {isCorporate ? 'Kurumsal Hesap' : 'Bireysel Hesap'}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hesap Grubu */}
        <Text style={styles.sectionLabel}>Hesap</Text>
        <View style={styles.group}>
          <SettingItem
            icon="person-outline"
            iconBg="#3B82F6"
            title="Profili Düzenle"
            subtitle="Ad, biyografi, fotoğraf"
            onPress={onEditProfile}
          />
          {!isCorporate && (
            <>
              <Separator />
              <SettingItem
                icon="business-outline"
                iconBg="#7C3AED"
                title="Kurumsal Hesaba Geç"
                subtitle="Şirket olarak başvurun"
                badge="YENİ"
                onPress={() => setShowCorporateModal(true)}
              />
            </>
          )}
        </View>

        {/* Uygulama Grubu */}
        <Text style={styles.sectionLabel}>Uygulama</Text>
        <View style={styles.group}>
          <SettingItem
            icon="notifications-outline"
            iconBg="#F59E0B"
            title="Bildirimler"
            subtitle="Sistem bildirim ayarları"
            onPress={() => {
              // Opens device notification settings (iOS & Android)
              const { Linking } = require('react-native');
              Linking.openSettings().catch(() => {
                Alert.alert('Bildirimler', 'Ayarlar açılamadı. Lütfen cihaz ayarlarınızdan bildirimleri yönetin.');
              });
            }}
          />
          <Separator />
          <SettingItem
            icon="shield-checkmark-outline"
            iconBg="#10B981"
            title="Gizlilik"
            subtitle="Hesap gizliliği ayarları"
            onPress={() => Alert.alert(
              'Gizlilik',
              'Hesabınız varsayılan olarak herkese açıktır.\n\nVerileriniz hakkında daha fazla bilgi için motionapp.com/privacy adresini ziyaret edebilirsiniz.\n\nHesabınızı ve tüm verilerinizi silmek için destek@motionapp.com ile iletişime geçin.',
              [{ text: 'Tamam' }]
            )}
          />
        </View>

        {/* Oturum Grubu */}
        <Text style={styles.sectionLabel}>Oturum</Text>
        <View style={styles.group}>
          <SettingItem
            icon="log-out-outline"
            title="Çıkış Yap"
            onPress={handleLogout}
            danger
          />
        </View>

        <Text style={styles.versionText}>Versiyon {Constants.expoConfig?.version ?? '—'}</Text>
      </ScrollView>

      <CorporateUpgradeModal
        visible={showCorporateModal}
        onClose={() => setShowCorporateModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    color: Colors.text,
  },
  headerRight: {
    width: 40,
  },
  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    margin: 16,
    paddingVertical: 10,
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '25',
  },
  accountBadgeCorporate: {
    backgroundColor: '#7C3AED10',
    borderColor: '#7C3AED25',
  },
  accountBadgeText: {
    color: Colors.primary,
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  accountBadgeTextCorporate: {
    color: '#7C3AED',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  group: {
    marginHorizontal: 16,
    backgroundColor: Colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 14,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconDanger: {
    backgroundColor: Colors.error + '15',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: Colors.text,
  },
  settingTitleDanger: {
    color: Colors.error,
  },
  settingSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  badge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 64,
  },
  versionText: {
    color: Colors.textDim,
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    marginTop: 24,
  },
});

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: Colors.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: Colors.card,
  },
  scrollContent: {
    padding: 20,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.info + '12',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.info,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 19,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.textMuted,
    marginBottom: 12,
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
  input: {
    flex: 1,
    height: 54,
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    marginBottom: 16,
    textAlign: 'center',
    backgroundColor: '#FFF0F0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  // Success
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  successText: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  closeButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 14,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
});
