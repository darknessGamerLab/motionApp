import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const CHROME_COLOR = '#0A0505';

interface SettingsScreenProps {
  onBackPress?: () => void;
  onEditProfile?: () => void;
}

interface SettingItemProps {
  icon: string;
  title: string;
  onPress?: () => void;
  danger?: boolean;
}

function SettingItem({ icon, title, onPress, danger }: SettingItemProps) {
  return (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.settingIcon, danger && styles.settingIconDanger]}>
        <Ionicons name={icon as any} size={22} color={danger ? '#FF3040' : '#fff'} />
      </View>
      <Text style={[styles.settingTitle, danger && styles.settingTitleDanger]}>{title}</Text>
      <Ionicons name="chevron-forward" size={20} color="#444" />
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ onBackPress, onEditProfile }: SettingsScreenProps) {
  const { logout, authState } = useAuth();
  
  const accountType = authState.userType === 'corporate' ? 'Kurumsal Hesap' : 'Bireysel Hesap';
  const accountIcon = authState.userType === 'corporate' ? 'business' : 'person';

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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ayarlar</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Account Type Badge */}
      <View style={styles.accountTypeBadge}>
        <Ionicons name={accountIcon as any} size={14} color="#DC143C" />
        <Text style={styles.accountTypeText}>{accountType}</Text>
      </View>

      <View style={styles.content}>
        <SettingItem
          icon="person-outline"
          title="Profili Düzenle"
          onPress={onEditProfile}
        />
        
        <View style={styles.divider} />
        
        <SettingItem
          icon="log-out-outline"
          title="Çıkış Yap"
          onPress={handleLogout}
          danger
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.versionText}>Versiyon 2.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: CHROME_COLOR,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  headerRight: {
    width: 40,
  },
  accountTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    marginHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(220, 20, 60, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(220, 20, 60, 0.2)',
  },
  accountTypeText: {
    color: '#DC143C',
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 14,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconDanger: {
    backgroundColor: 'rgba(255, 48, 64, 0.12)',
  },
  settingTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  settingTitleDanger: {
    color: '#FF3040',
  },
  divider: {
    height: 1,
    backgroundColor: '#1a1a1a',
    marginLeft: 64,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  versionText: {
    color: '#444',
    fontSize: 12,
  },
});
