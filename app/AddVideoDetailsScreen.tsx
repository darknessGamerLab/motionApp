import { CustomAlert } from '@/components/GlobalAlert';
import Colors from '@/constants/Colors';
import { TALENTS, getTalentById } from '@/constants/Talents';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase, STORAGE_URL, THUMBNAILS_BUCKET, VIDEOS_BUCKET } from '@/lib/supabase';
// Local anon JWT (HS256) - for storage uploads when session token unavailable
const LOCAL_ANON_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as VideoThumbnails from 'expo-video-thumbnails';
import React, { useEffect, useMemo, useState } from 'react';
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
import { mergeTopInset } from '@/utils/safeInsets';
interface AddVideoDetailsScreenProps {
  videoUri: string;
  onBack: () => void;
  onPublish: (videoUrl: string, description: string, tags: string[]) => void;
}

export default function AddVideoDetailsScreen({
  videoUri,
  onBack,
  onPublish,
}: AddVideoDetailsScreenProps) {
  const { authState } = useAuth();
  const insets = useSafeAreaInsets();
  const topInset = mergeTopInset(insets);
  const { syncAndroidSystemChrome } = useTheme();

  useEffect(() => {
    syncAndroidSystemChrome();
  }, [syncAndroidSystemChrome]);

  const videoPlayer = useVideoPlayer(videoUri, player => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  // Kullanıcının talents'larını al
  const userTalents = useMemo(() => {
    const talentIds = authState.userData?.talents || [];
    return talentIds.map(id => getTalentById(id)).filter(Boolean) as typeof TALENTS;
  }, [authState.userData?.talents]);

  const [description, setDescription] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const handleTopicSelect = (talentId: string) => {
    setSelectedTopic(selectedTopic === talentId ? null : talentId);
  };

  const handlePublish = async () => {
    // Topic zorunlu kontrolü
    if (!selectedTopic) {
      CustomAlert.alert('Konu Seçimi Zorunlu', 'Lütfen videonuz için bir konu seçin.');
      return;
    }
    if (!authState.user) {
      CustomAlert.alert('Giriş Gerekli', 'Video yayınlamak için oturum açmalısınız.');
      return;
    }

    setIsPublishing(true);

    try {
      const topicTag = [selectedTopic];
      const topicTalent = getTalentById(selectedTopic);
      const category = topicTalent?.name?.toLowerCase() || '';
      const topicLabel = topicTalent ? `#${category}` : undefined;

      // Video Compressor
      let compressedUri = videoUri;
      try {
         console.log('Video sıkıştırma başlatılıyor...');
         compressedUri = await require('react-native-compressor').Video.compress(
            videoUri,
            {
               compressionMethod: 'auto',
               minimumFileSizeForCompress: 2, // Sadece 2MB üzerindeyse sıkıştır
            }
         );
         console.log('Video sıkıştırma tamamlandı:', compressedUri);
      } catch (compressErr) {
         console.error('Video compression failed, using original:', compressErr);
         compressedUri = videoUri; // Fallback
      }

      let rawExt = compressedUri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'mp4';
      let mimeType = `video/${rawExt}`;
      if (rawExt === 'mov') {
        mimeType = 'video/mp4'; // Bypassing "video/mov" error by masquerading as mp4 since Supabase allows it
        rawExt = 'mp4';
      }

      const fileName = `${authState.user.id}/${Date.now()}.${rawExt}`;

      // React Native'de en güvenilir upload yöntemi: FormData + fetch
      const session = (await supabase.auth.getSession()).data.session;
      const authToken = session?.access_token ?? LOCAL_ANON_JWT;

      const videoForm = new FormData();
      videoForm.append('file', { uri: compressedUri, name: `video.${rawExt}`, type: mimeType } as any);

      const videoResp = await fetch(`${STORAGE_URL.replace('/object/public', '/object')}/${VIDEOS_BUCKET}/${fileName}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}`, 'x-upsert': 'true' },
        body: videoForm as any,
      });
      if (!videoResp.ok) {
        const errText = await videoResp.text();
        throw new Error(`Upload failed: ${errText}`);
      }

      // Public URL al
      const { data: urlData } = supabase.storage.from(VIDEOS_BUCKET).getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      // 1. Generate thumbnail
      let thumbnailUrl = '';
      try {
        const { uri: rawThumbUri } = await VideoThumbnails.getThumbnailAsync(videoUri, { time: 1000 });
        
        // Convert to webp
        const { uri: thumbUri } = await require('expo-image-manipulator').manipulateAsync(
          rawThumbUri,
          [],
          { compress: 0.8, format: require('expo-image-manipulator').SaveFormat.WEBP }
        );

        // 2. Upload thumbnail via blob
        const thumbExt = 'webp';
        const thumbName = `${authState.user.id}/thumb_${Date.now()}.${thumbExt}`;

        const thumbForm = new FormData();
        thumbForm.append('file', { uri: thumbUri, name: `thumb.${thumbExt}`, type: 'image/webp' } as any);

        const thumbResp = await fetch(`${STORAGE_URL.replace('/object/public', '/object')}/${THUMBNAILS_BUCKET}/${thumbName}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}`, 'x-upsert': 'true' },
          body: thumbForm as any,
        });
        if (thumbResp.ok) {
          const { data: tUrlData } = supabase.storage.from(THUMBNAILS_BUCKET).getPublicUrl(thumbName);
          thumbnailUrl = tUrlData.publicUrl;
        }
      } catch (e) {
        console.log('Thumbnail generation/upload error:', e);
      }

      // 3. Veritabanına kaydet
      const { data: inserted, error: dbError } = await (supabase as any)
        .from('videos')
        .insert({
          user_id: authState.user.id,
          video_url: publicUrl,
          thumbnail_url: thumbnailUrl || publicUrl, // Fallback
          description: description || '',
          topic: topicLabel,
          category: category,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      onPublish(publicUrl, description, topicTag);

    } catch (err: any) {
      console.error('[Publish Error]', err);
      CustomAlert.alert('Hata', 'Video yüklenirken sorun oluştu: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Video Detayları</Text>
          <TouchableOpacity
            style={[styles.publishButton, isPublishing && styles.publishButtonDisabled]}
            onPress={handlePublish}
            disabled={isPublishing}
          >
            {isPublishing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.publishButtonText}>Yayınla</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(40, insets.bottom + 24) }]}
        >
          {/* Video Preview */}
          <View style={styles.previewContainer}>
            <VideoView
              style={styles.videoPreview}
              player={videoPlayer}
              contentFit="cover"
              nativeControls={false}
            />
            <TouchableOpacity style={styles.retakeButton} onPress={onBack}>
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={styles.retakeButtonText}>Tekrar Çek</Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Açıklama</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Videon hakkında bir şeyler yaz..."
              placeholderTextColor={Colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={200}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{description.length}/200</Text>
          </View>

          {/* Topic Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Video Konusu</Text>
            <Text style={styles.sectionSubtitle}>Yeteneklerinden birini seç</Text>

            {/* Selected Topic */}
            {selectedTopic && (
              <View style={styles.selectedTopicContainer}>
                <TouchableOpacity style={styles.selectedTopic} onPress={() => setSelectedTopic(null)}>
                  <Text style={styles.selectedTopicText}>#{getTalentById(selectedTopic)?.name.toLowerCase()}</Text>
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            {/* User Talents */}
            {userTalents.length > 0 ? (
              <View style={styles.talentsContainer}>
                {userTalents.map(talent => {
                  const isSelected = selectedTopic === talent.id;
                  return (
                    <TouchableOpacity
                      key={talent.id}
                      style={[styles.talentTag, isSelected && styles.talentTagSelected]}
                      onPress={() => handleTopicSelect(talent.id)}
                    >
                      <Ionicons
                        name={talent.icon as any}
                        size={18}
                        color={isSelected ? '#fff' : Colors.textMuted}
                        style={styles.talentIcon}
                      />
                      <Text style={[styles.talentTagText, isSelected && styles.talentTagTextSelected]}>
                        {talent.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyTalentsContainer}>
                <Text style={styles.emptyTalentsText}>Henüz yetenek seçmediniz</Text>
                <Text style={styles.emptyTalentsSubtext}>Profil ayarlarından yetenek ekleyebilirsiniz</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.tabScreenBackground,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerButton: {
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
  publishButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  publishButtonDisabled: {
    opacity: 0.6,
  },
  publishButtonText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.tabScreenBackground,
  },
  scrollContent: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
    width: '100%',
  },
  previewContainer: {
    aspectRatio: 9 / 16,
    maxHeight: 300,
    width: 140,
    alignSelf: 'center',
    marginVertical: 20,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
    // Gölge: önizlemenin çevresinde hafif derinlik
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  videoPreview: {
    flex: 1,
  },
  retakeButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: Colors.text,
    marginBottom: 10,
  },
  descriptionInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    padding: 14,
    color: Colors.text,
    fontSize: 14,
    minHeight: 90,
    borderWidth: 1,
    borderColor: Colors.border,
    fontFamily: 'Poppins_400Regular',
  },
  charCount: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'right',
    marginTop: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Poppins_400Regular',
    marginBottom: 12,
  },
  selectedTopicContainer: {
    marginBottom: 14,
  },
  selectedTopic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  selectedTopicText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  talentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  talentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  talentTagSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  talentIcon: {
    marginRight: 2,
  },
  talentTagText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
  },
  talentTagTextSelected: {
    color: Colors.primary,
    fontFamily: 'Poppins_600SemiBold',
  },
  emptyTalentsContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyTalentsText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    marginBottom: 4,
  },
  emptyTalentsSubtext: {
    color: Colors.textDim,
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
  },
});
