import CustomCropper from '@/components/CustomCropper';
import { CustomAlert as Alert } from '@/components/GlobalAlert';
import Colors from '@/constants/Colors';
import { TALENTS, getTalentById } from '@/constants/Talents';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
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
  const { authState, setUserData, updateProfile } = useAuth();

  const [fullName, setFullName] = useState(userProfile.fullName);
  const [bio, setBio] = useState(userProfile.bio || '');
  const [avatarUri, setAvatarUri] = useState(userProfile.avatarUri);
  // Her zaman tam 3 slotlu array — eksik slotlar boş string ile doldurulur
  const normalizeAvatars = (arr: string[]) => {
    const result = [...arr];
    while (result.length < 3) result.push('');
    return result.slice(0, 3); // Maksimum 3
  };

  const [avatars, setAvatars] = useState(() => normalizeAvatars(userProfile.avatars));

  const dbTalents = (authState.userData?.talents || []).filter(Boolean);
  const initialTalents: string[] = dbTalents.length > 0 ? dbTalents : (userProfile.talents || []);
  const [selectedTalents, setSelectedTalents] = useState<string[]>(initialTalents);
  const [saving, setSaving] = useState(false);

  // Custom Cropper State
  const [cropperVisible, setCropperVisible] = useState(false);
  const [cropperImage, setCropperImage] = useState<string | null>(null);
  const [cropperIndex, setCropperIndex] = useState(0);

  const pickImage = async (index: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false, // Kendi CustomCropper'ımızı kullanacağız
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setCropperIndex(index);
      setCropperImage(result.assets[0].uri);
      setCropperVisible(true);
    }
  };

  const handleCropComplete = (croppedUri: string) => {
    const newAvatars = [...avatars];
    newAvatars[cropperIndex] = croppedUri;
    setAvatars(newAvatars);
    if (cropperIndex === 0) setAvatarUri(croppedUri);
    setCropperVisible(false);
    setCropperImage(null);
  };

  const toggleTalent = (talentId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      const skills = selectedTalents.map(id => getTalentById(id)?.name || '').filter(Boolean);

      let finalAvatarUrl = avatarUri;
      let finalAvatars = [...avatars];

      // ✅ SUPABASE'E KAYDET (bu eksikti!)
      if (authState.user) {

        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        const uploadUrlBase = `${process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mhgxrzejobmkuwylyelx.supabase.co'}/storage/v1/object/avatars/${authState.user.id}`;

        // Upload new avatars in the array
        for (let i = 0; i < finalAvatars.length; i++) {
          const uri = finalAvatars[i];
          if (uri && !uri.startsWith('http')) {
            try {
              const formData = new FormData();
              const uniqueName = `avatar_${i}_${Date.now()}.jpg`;
              formData.append('file', {
                uri: uri,
                name: uniqueName,
                type: 'image/jpeg',
              } as any);

              const response = await fetch(`${uploadUrlBase}/${uniqueName}`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session?.access_token}`,
                },
                body: formData as any,
              });

              if (response.ok) {
                const resData: any = await response.json();
                const pUrlNode = await (supabase as any).storage.from('avatars').getPublicUrl(resData.Key?.split('/').slice(1).join('/') || `${authState.user.id}/${uniqueName}`);
                finalAvatars[i] = pUrlNode.data?.publicUrl || uri;

                // If it's the first avatar (index 0), update finalAvatarUrl
                if (i === 0) {
                  finalAvatarUrl = pUrlNode.data?.publicUrl || uri;
                }
              } else {
                console.error(`Avatar ${i} upload response not OK:`, await response.text());
              }
            } catch (uploadError) {
              console.error(`Avatar ${i} upload error:`, uploadError);
            }
          }
        }

        // Boş slotları temizle (sadece gerçek URL'leri kaydet)
        const cleanAvatars = finalAvatars.filter(u => u && u.length > 0);

        const { error } = await updateProfile({
          full_name: fullName.trim(),
          bio: bio.trim() || null,
          talents: selectedTalents,
          avatar_url: finalAvatarUrl,
          avatars: cleanAvatars,
        } as any);
        if (error) {
          Alert.alert('Hata', error);
          setSaving(false);
          return;
        }
      }

      // Local state güncelle
      setUserData({ fullName: fullName.trim(), talents: selectedTalents, avatar_url: finalAvatarUrl } as any);

      // Boş slotları parent'a gönderme
      const cleanAvatarsFinal = finalAvatars.filter(u => u && u.length > 0);
      onSave({ fullName: fullName.trim(), bio: bio.trim(), avatarUri: finalAvatarUrl, avatars: cleanAvatarsFinal, skills, talents: selectedTalents });
      onClose();
    } catch (e) {
      Alert.alert('Hata', 'Profil kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerBtn} onPress={onClose}>
          <Ionicons name="close" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Profili Düzenle</Text>
        <TouchableOpacity
          style={[s.saveBtn, saving && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.saveBtnText}>Kaydet</Text>
          }
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar Section */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Profil Fotoğrafları</Text>
            <Text style={s.sectionSub}>3 fotoğraf ekleyebilirsiniz</Text>
            <View style={s.avatarsRow}>
              {[0, 1, 2].map((index) => (
                <TouchableOpacity key={index} style={s.avatarContainer} onPress={() => pickImage(index)}>
                  {avatars[index] ? (
                    <Image source={{ uri: avatars[index] }} style={s.avatar} contentFit="cover" transition={200} />
                  ) : (
                    <View style={s.avatarPlaceholder}>
                      <Ionicons name="camera-outline" size={22} color={Colors.textMuted} />
                    </View>
                  )}
                  <View style={s.editBadge}>
                    <Ionicons name="pencil" size={10} color="#fff" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Full Name */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Ad Soyad</Text>
            <View style={s.inputRow}>
              <Ionicons name="person-outline" size={16} color={Colors.textMuted} style={s.inputIcon} />
              <TextInput
                style={s.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Adınız Soyadınız"
                placeholderTextColor={Colors.textMuted}
                maxLength={50}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Bio */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Hakkımda</Text>
            <View style={[s.inputRow, { alignItems: 'flex-start', paddingTop: 12 }]}>
              <Ionicons name="chatbubble-outline" size={16} color={Colors.textMuted} style={[s.inputIcon, { marginTop: 2 }]} />
              <TextInput
                style={[s.input, { minHeight: 70, flex: 1 }]}
                value={bio}
                onChangeText={setBio}
                placeholder="Kendinizden bahsedin..."
                placeholderTextColor={Colors.textMuted}
                multiline
                maxLength={150}
                textAlignVertical="top"
              />
            </View>
            <Text style={s.charCount}>{bio.length}/150</Text>
          </View>

          {/* Talents */}
          <View style={s.section}>
            <View style={s.rowBetween}>
              <Text style={s.sectionTitle}>Yetenekler</Text>
              <Text style={s.sectionSub}>{selectedTalents.length}/3</Text>
            </View>
            <Text style={s.sectionSub}>En fazla 3 yetenek seçin</Text>
            <View style={s.talentsGrid}>
              {TALENTS.map((talent) => {
                const isSelected = selectedTalents.includes(talent.id);
                return (
                  <TouchableOpacity
                    key={talent.id}
                    style={[s.chip, isSelected && s.chipSelected]}
                    onPress={() => toggleTalent(talent.id)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={talent.icon as any}
                      size={14}
                      color={isSelected ? '#fff' : Colors.textSecondary}
                    />
                    <Text style={[s.chipText, isSelected && s.chipTextSelected]}>
                      {talent.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={{ height: 48 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Özel Dairesel Kırpma Aracı */}
      <CustomCropper
        visible={cropperVisible}
        imageUri={cropperImage}
        onClose={() => setCropperVisible(false)}
        onCrop={handleCropComplete}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    height: 54, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  scroll: { flex: 1 },
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  sectionSub: { fontSize: 12, color: Colors.textMuted, marginBottom: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  avatarsRow: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  avatarContainer: { position: 'relative' },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: Colors.border },
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
  },
  editBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.background,
  },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, minHeight: 50,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: Colors.text, paddingVertical: 12 },
  charCount: { color: Colors.textDim, fontSize: 11, textAlign: 'right', marginTop: 6 },

  talentsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.border,
  },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  chipTextSelected: { color: '#fff' },
});
