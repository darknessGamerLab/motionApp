import { CustomAlert } from '@/components/GlobalAlert';
import { TALENTS, getTalentById } from '@/constants/Talents';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as VideoThumbnails from 'expo-video-thumbnails';
import React, { useMemo, useState } from 'react';
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
const CHROME_COLOR = '#FFFFFF';
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

      const fileExt = videoUri.split('.').pop()?.split('?')[0] || 'mp4';
      const fileName = `${authState.user.id}/${Date.now()}.${fileExt}`;

      // FormData ile multipart upload (binary okumak yerine dosya sisteminden aktarır)
      const formData = new FormData();
      formData.append('file', {
        uri: videoUri,
        name: `video.${fileExt}`,
        type: `video/${fileExt}` as any,
      } as any);

      const session = (await supabase.auth.getSession()).data.session;
      const uploadResp = await fetch(
        `https://mhgxrzejobmkuwylyelx.supabase.co/storage/v1/object/videos/${fileName}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: formData as any,
        }
      );

      if (!uploadResp.ok) {
        const errText = await uploadResp.text();
        throw new Error(`Upload failed: ${uploadResp.status} - ${errText}`);
      }

      // Public URL al
      const { data: urlData } = supabase.storage.from('videos').getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      // 1. Generate thumbnail
      let thumbnailUrl = '';
      try {
        const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(videoUri, { time: 1000 });

        // 2. Upload thumbnail
        const thumbExt = 'jpg';
        const thumbName = `${authState.user.id}/thumb_${Date.now()}.${thumbExt}`;
        const thumbFormData = new FormData();
        thumbFormData.append('file', {
          uri: thumbUri,
          name: `thumb.${thumbExt}`,
          type: 'image/jpeg',
        } as any);

        const thumbResp = await fetch(
          `https://mhgxrzejobmkuwylyelx.supabase.co/storage/v1/object/thumbnails/${thumbName}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session?.access_token}`,
            },
            body: thumbFormData as any,
          }
        );

        if (thumbResp.ok) {
          const { data: tUrlData } = supabase.storage.from('thumbnails').getPublicUrl(thumbName);
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
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#000" />
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
          contentContainerStyle={styles.scrollContent}
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
              placeholderTextColor="#666"
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
                        color={isSelected ? '#fff' : '#888'}
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
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0', // Changed for better contrast on light background
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000', // Changed for visibility on light background
  },
  publishButton: {
    backgroundColor: '#DC143C',
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
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
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
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000', // Changed for visibility on light background
    marginBottom: 10,
  },
  descriptionInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    color: '#000', // Changed for visibility on light background
    fontSize: 14,
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  charCount: {
    color: '#666',
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
  },
  selectedTopicContainer: {
    marginBottom: 14,
  },
  selectedTopic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DC143C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  selectedTopicText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
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
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  talentTagSelected: {
    backgroundColor: 'rgba(220, 20, 60, 0.15)',
    borderColor: '#DC143C',
  },
  talentIcon: {
    marginRight: 2,
  },
  talentTagText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '500',
  },
  talentTagTextSelected: {
    color: '#DC143C',
    fontWeight: '600',
  },
  emptyTalentsContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyTalentsText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  emptyTalentsSubtext: {
    color: '#6b7280',
    fontSize: 12,
  },
});
