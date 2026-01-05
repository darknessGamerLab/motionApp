import { useAuth } from '@/contexts/AuthContext';
import { TALENTS, getTalentById } from '@/constants/Talents';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import React, { useState, useRef, useMemo } from 'react';
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

const CHROME_COLOR = '#0A0505';

interface AddVideoDetailsScreenProps {
  videoUri: string;
  onBack: () => void;
  onPublish: (description: string, tags: string[]) => void;
}

export default function AddVideoDetailsScreen({ 
  videoUri, 
  onBack, 
  onPublish,
}: AddVideoDetailsScreenProps) {
  const videoRef = useRef<Video>(null);
  const { authState } = useAuth();
  
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

  const handlePublish = () => {
    // Topic zorunlu kontrolü
    if (!selectedTopic) {
      Alert.alert('Konu Seçimi Zorunlu', 'Lütfen videonuz için bir konu seçin.');
      return;
    }
    
    setIsPublishing(true);
    // Topic'i talent ID olarak gönder, CreateScreen'de name'e çevrilecek
    const topicTag = [selectedTopic];
    setTimeout(() => {
      onPublish(description, topicTag);
      setIsPublishing(false);
    }, 1000);
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
            <Ionicons name="arrow-back" size={24} color="#fff" />
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
            <Video
              ref={videoRef}
              source={{ uri: videoUri }}
              style={styles.videoPreview}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isLooping
              isMuted
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
    backgroundColor: '#000',
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
    backgroundColor: CHROME_COLOR,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
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
    color: '#fff',
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
  },
  previewContainer: {
    aspectRatio: 9 / 16,
    maxHeight: 260,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111',
    position: 'relative',
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
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  descriptionInput: {
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 14,
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#222',
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
    backgroundColor: '#111',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#222',
  },
  talentTagSelected: {
    backgroundColor: 'rgba(220, 20, 60, 0.15)',
    borderColor: '#DC143C',
  },
  talentIcon: {
    marginRight: 2,
  },
  talentTagText: {
    color: '#888',
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
    color: '#666',
    fontSize: 12,
  },
});
