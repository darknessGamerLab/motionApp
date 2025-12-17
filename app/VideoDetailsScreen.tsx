import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface VideoDetailsScreenProps {
  videoUri: string;
  onClose: () => void;
  onPublish: (data: { videoUri: string; caption: string; category: string }) => void;
}

const CATEGORIES = ['General', 'Travel', 'Comedy', 'Tech', 'Other'];

export default function VideoDetailsScreen({ videoUri, onClose, onPublish }: VideoDetailsScreenProps) {
  const insets = useSafeAreaInsets();
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState<string>('General');

  const handlePublish = () => {
    if (!videoUri) return;
    onPublish({ videoUri, caption, category });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={onClose} style={styles.headerLeft}>
          <Ionicons name="close-outline" size={30} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Video Details</Text>
        <TouchableOpacity onPress={handlePublish} style={styles.publishButton}>
          <Text style={styles.publishText}>Publish</Text>
        </TouchableOpacity>
      </View>

      {/* Video preview */}
      <View style={styles.previewContainer}>
        <Video
          source={{ uri: videoUri }}
          style={styles.video}
          resizeMode="cover"
          shouldPlay
          isLooping
        />
      </View>

      {/* Caption */}
      <View style={styles.section}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.input}
          placeholder="Write a caption..."
          placeholderTextColor="#777"
          value={caption}
          onChangeText={setCaption}
          multiline
        />
      </View>

      {/* Category */}
      <View style={styles.section}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => {
            const isActive = cat === category;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerLeft: { padding: 4 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  publishButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#FFFC00' },
  publishText: { color: '#000', fontWeight: '700', fontSize: 14 },
  previewContainer: {
    height: 260,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  video: { flex: 1 },
  section: { marginTop: 20, paddingHorizontal: 16 },
  label: { color: '#aaa', fontSize: 14, marginBottom: 8 },
  input: {
    minHeight: 80,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#111',
    color: '#fff',
    textAlignVertical: 'top',
  },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  categoryChipActive: {
    backgroundColor: '#FFFC00',
    borderColor: '#FFFC00',
  },
  categoryText: { color: '#ccc', fontSize: 13 },
  categoryTextActive: { color: '#000', fontWeight: '700' },
});


