import { useAuth } from '@/contexts/AuthContext';
import { TALENTS, getTalentById } from '@/constants/Talents';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import AsyncStorage from '@react-native-async-storage/async-storage';

interface EditProfileScreenProps {
  onClose: () => void;
  userProfile: {
    username: string;
    fullName: string;
    bio: string;
    avatarUri: string;
    avatars: string[];
    skills: string[];
    talents: string[];
  };
  onSave: (updatedProfile: any) => void;
}

export default function EditProfileScreen({ onClose, userProfile, onSave }: EditProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const { authState, setUserData } = useAuth();
  
  const [fullName, setFullName] = useState(userProfile.fullName);
  const [bio, setBio] = useState(userProfile.bio);
  const [avatarUri, setAvatarUri] = useState(userProfile.avatarUri);
  const [avatars, setAvatars] = useState(userProfile.avatars);
  // Başlangıç talents değerini doğru al
  const initialTalents = userProfile.talents || userProfile.skills?.map((s: string) => {
    const talent = TALENTS.find(t => t.name.toLowerCase() === s.toLowerCase());
    return talent?.id;
  }).filter(Boolean) || [];
  
  const [selectedTalents, setSelectedTalents] = useState<string[]>(initialTalents);
  const [saving, setSaving] = useState(false);
  const [canChangeTalents, setCanChangeTalents] = useState(true);
  const [daysUntilChange, setDaysUntilChange] = useState(0);

  useEffect(() => {
    checkTalentChangeEligibility();
  }, []);

  const checkTalentChangeEligibility = async () => {
    try {
      const lastChange = await AsyncStorage.getItem('lastTalentsChangeDate');
      if (lastChange) {
        const lastChangeDate = new Date(lastChange);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - lastChangeDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 90) {
          setCanChangeTalents(false);
          setDaysUntilChange(90 - diffDays);
        }
      }
    } catch (e) {
      console.log('Error checking talent change eligibility:', e);
    }
  };

  const pickImage = async (index: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const newAvatars = [...avatars];
      newAvatars[index] = result.assets[0].uri;
      setAvatars(newAvatars);
      if (index === 0) {
        setAvatarUri(result.assets[0].uri);
      }
    }
  };

  const toggleTalent = (talentId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (!canChangeTalents) {
      Alert.alert(
        'Yetenek Değişimi Kilitli',
        `Yeteneklerinizi ${daysUntilChange} gün sonra değiştirebilirsiniz.`
      );
      return;
    }

    if (selectedTalents.includes(talentId)) {
      setSelectedTalents(selectedTalents.filter(id => id !== talentId));
    } else {
      if (selectedTalents.length < 3) {
        setSelectedTalents([...selectedTalents, talentId]);
      } else {
        Alert.alert('Maksimum Yetenek', 'En fazla 3 yetenek seçebilirsiniz.');
      }
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Hata', 'Ad Soyad boş olamaz');
      return;
    }

    if (selectedTalents.length === 0) {
      Alert.alert('Hata', 'En az 1 yetenek seçmelisiniz');
      return;
    }

    setSaving(true);

    try {
      // Yetenekler değiştiyse tarihi kaydet
      const talentsChanged = JSON.stringify(selectedTalents.sort()) !== JSON.stringify((userProfile.talents || []).sort());
      if (talentsChanged && canChangeTalents) {
        await AsyncStorage.setItem('lastTalentsChangeDate', new Date().toISOString());
      }

      // Skills'i güncelle
      const skills = selectedTalents.map(id => {
        const talent = getTalentById(id);
        return talent?.name || '';
      }).filter(Boolean);

      // Auth context güncelle
      setUserData({
        fullName: fullName.trim(),
        talents: selectedTalents,
      });

      // Parent'a bildir
      onSave({
        fullName: fullName.trim(),
        bio: bio.trim(),
        avatarUri,
        avatars,
        skills,
        talents: selectedTalents,
      });

      onClose();
    } catch (e) {
      Alert.alert('Hata', 'Profil kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={onClose}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profili Düzenle</Text>
        <TouchableOpacity 
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Kaydet</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profil Fotoğrafları</Text>
            <Text style={styles.sectionSubtitle}>3 fotoğraf ekleyebilirsiniz</Text>
            <View style={styles.avatarsRow}>
              {[0, 1, 2].map((index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.avatarContainer}
                  onPress={() => pickImage(index)}
                >
                  {avatars[index] ? (
                    <Image source={{ uri: avatars[index] }} style={styles.avatar} contentFit="cover" transition={200} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="camera" size={24} color="#666" />
                    </View>
                  )}
                  <View style={styles.avatarEditBadge}>
                    <Ionicons name="pencil" size={12} color="#fff" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Name Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ad Soyad</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Adınız Soyadınız"
              placeholderTextColor="#666"
              maxLength={50}
            />
          </View>

          {/* Bio Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hakkımda</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Kendinizden bahsedin..."
              placeholderTextColor="#666"
              multiline
              maxLength={150}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{bio.length}/150</Text>
          </View>

          {/* Talents Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Yetenekler</Text>
              {!canChangeTalents && (
                <View style={styles.lockedBadge}>
                  <Ionicons name="lock-closed" size={12} color="#FF9500" />
                  <Text style={styles.lockedText}>{daysUntilChange} gün</Text>
                </View>
              )}
            </View>
            <Text style={styles.sectionSubtitle}>
              {canChangeTalents 
                ? '1-3 yetenek seçin (90 günde bir değiştirilebilir)' 
                : `Yeteneklerinizi ${daysUntilChange} gün sonra değiştirebilirsiniz`}
            </Text>
            
            <View style={styles.talentsGrid}>
              {TALENTS.map((talent) => {
                const isSelected = selectedTalents.includes(talent.id);
                return (
                  <TouchableOpacity
                    key={talent.id}
                    style={[
                      styles.talentChip,
                      isSelected && styles.talentChipSelected,
                      !canChangeTalents && styles.talentChipLocked,
                    ]}
                    onPress={() => toggleTalent(talent.id)}
                  >
                    <Ionicons 
                      name={talent.icon as any} 
                      size={16} 
                      color={isSelected ? '#fff' : '#888'} 
                    />
                    <Text style={[
                      styles.talentChipText,
                      isSelected && styles.talentChipTextSelected,
                    ]}>
                      {talent.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerBtn: {
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
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  avatarsRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#333',
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    color: '#666',
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  lockedText: {
    color: '#FF9500',
    fontSize: 11,
    fontWeight: '600',
  },
  talentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  talentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  talentChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  talentChipLocked: {
    opacity: 0.6,
  },
  talentChipText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
  },
  talentChipTextSelected: {
    color: '#fff',
  },
});

