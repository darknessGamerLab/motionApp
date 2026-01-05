import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React, { useState, useRef, useEffect } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { height: H } = Dimensions.get('window');

interface Comment {
  id: string;
  user: { username: string; avatar: string };
  text: string;
  time: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  videoId: string;
  commentCount: number;
  onCommentAdded?: (newCount: number) => void;
}

const MOCK_COMMENTS: Comment[] = [
  { id: '1', user: { username: 'ahmet', avatar: 'https://i.pravatar.cc/100?img=1' }, text: 'Harika video! 🔥', time: '2s' },
  { id: '2', user: { username: 'ayşe', avatar: 'https://i.pravatar.cc/100?img=2' }, text: 'Çok güzel olmuş', time: '5d' },
  { id: '3', user: { username: 'mehmet', avatar: 'https://i.pravatar.cc/100?img=3' }, text: 'Süper 👏', time: '1h' },
];

function CommentRow({ item }: { item: Comment }) {
  return (
    <View style={styles.commentRow}>
      <Image source={{ uri: item.user.avatar }} style={styles.avatar} contentFit="cover" transition={150} />
      <View style={styles.commentContent}>
        <Text style={styles.username}>{item.user.username}</Text>
        <Text style={styles.commentText}>{item.text}</Text>
        <Text style={styles.time}>{item.time}</Text>
      </View>
    </View>
  );
}

export default function CommentsModal({ visible, onClose, videoId, commentCount, onCommentAdded }: Props) {
  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS);
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlashList<Comment>>(null);

  // Modal açıldığında input'a focus
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [visible]);

  const handlePost = () => {
    if (!text.trim()) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const newComment: Comment = {
      id: Date.now().toString(),
      user: { username: 'sen', avatar: 'https://i.pravatar.cc/100?img=99' },
      text: text.trim(),
      time: 'şimdi',
    };
    
    const updatedComments = [newComment, ...comments];
    setComments(updatedComments);
    setText('');
    
    // Global state güncelle
    onCommentAdded?.(updatedComments.length);
    
    // Listeyi en üste scroll et
    setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 100);
    
    // Klavyeyi kapatma - kullanıcı devam edebilsin
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{comments.length} Yorum</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Comments */}
          <FlashList
            ref={listRef}
            data={comments}
            renderItem={({ item }) => <CommentRow item={item} />}
            keyExtractor={i => i.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            estimatedItemSize={70}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="chatbubble-outline" size={48} color="#333" />
                <Text style={styles.emptyText}>Henüz yorum yok</Text>
                <Text style={styles.emptySubtext}>İlk yorumu sen yap!</Text>
              </View>
            }
          />

          {/* Input */}
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.inputWrap}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Yorum yaz..."
                placeholderTextColor="#666"
                value={text}
                onChangeText={setText}
                multiline
                maxLength={200}
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={handlePost}
              />
              <TouchableOpacity 
                style={[
                  styles.postBtn, 
                  !text.trim() ? styles.postBtnDisabled : styles.postBtnActive
                ]} 
                onPress={handlePost} 
                disabled={!text.trim()}
              >
                <Ionicons name="send" size={18} color={text.trim() ? '#fff' : '#555'} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { height: H * 0.7, backgroundColor: '#000', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderTopWidth: 1, borderColor: '#222' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#222' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  closeBtn: { padding: 4 },
  list: { paddingVertical: 12 },
  commentRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  commentContent: { flex: 1 },
  username: { fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 4 },
  commentText: { fontSize: 14, color: '#ccc', lineHeight: 20 },
  time: { fontSize: 11, color: '#666', marginTop: 4 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { color: '#888', fontSize: 16, marginTop: 12, fontWeight: '600' },
  emptySubtext: { color: '#555', fontSize: 13, marginTop: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#222', gap: 10 },
  input: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, color: '#fff', fontSize: 14, maxHeight: 80 },
  postBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  postBtnDisabled: { backgroundColor: '#222' },
  postBtnActive: { backgroundColor: Colors.primary },
});
