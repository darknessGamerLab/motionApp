import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
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
  likes: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  videoId: string;
  commentCount: number;
  onCommentAdded?: (newCount: number) => void;
}

const MOCK_COMMENTS: Comment[] = [
  { id: '1', user: { username: 'ahmet_y', avatar: 'https://i.pravatar.cc/100?img=1' }, text: 'Harika video! 🔥 Çok güzel bir içerik olmuş', time: '2s', likes: 14 },
  { id: '2', user: { username: 'ayse_o', avatar: 'https://i.pravatar.cc/100?img=2' }, text: 'Çok güzel olmuş, tebrikler 👏', time: '5d', likes: 7 },
  { id: '3', user: { username: 'mehmet_k', avatar: 'https://i.pravatar.cc/100?img=3' }, text: 'Süper bir çalışma 💯', time: '1h', likes: 3 },
  { id: '4', user: { username: 'zeynep_d', avatar: 'https://i.pravatar.cc/100?img=4' }, text: 'Beni çok etkiledi devam et!', time: '3h', likes: 22 },
  { id: '5', user: { username: 'emre_c', avatar: 'https://i.pravatar.cc/100?img=5' }, text: 'Ne zaman bir sonraki geliyor? 😍', time: '6h', likes: 5 },
];

function CommentRow({ item }: { item: Comment }) {
  const [liked, setLiked] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  const handleLike = () => {
    setLiked(l => !l);
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, speed: 30 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }),
    ]).start();
  };

  return (
    <View style={cs.row}>
      <Image source={{ uri: item.user.avatar }} style={cs.avatar} contentFit="cover" />
      <View style={cs.content}>
        <View style={cs.nameRow}>
          <Text style={cs.username}>{item.user.username}</Text>
          <Text style={cs.time}>{item.time}</Text>
        </View>
        <Text style={cs.text}>{item.text}</Text>
        <TouchableOpacity onPress={() => { }} style={cs.replyBtn}>
          <Text style={cs.replyText}>Yanıtla</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={handleLike} style={cs.likeBtn}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={16} color={liked ? Colors.primary : Colors.textMuted} />
        </Animated.View>
        <Text style={[cs.likeCount, liked && { color: Colors.primary }]}>{liked ? item.likes + 1 : item.likes}</Text>
      </TouchableOpacity>
    </View>
  );
}

const cs = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 12, alignItems: 'flex-start' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surfaceAlt },
  content: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  username: { fontSize: 13, fontWeight: '600', color: Colors.text },
  time: { fontSize: 11, color: Colors.textMuted },
  text: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  replyBtn: { marginTop: 6 },
  replyText: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  likeBtn: { alignItems: 'center', gap: 3, paddingTop: 4 },
  likeCount: { fontSize: 11, color: Colors.textMuted },
});

export default function CommentsModal({ visible, onClose, videoId, commentCount, onCommentAdded }: Props) {
  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS);
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<any>(null);
  const slideAnim = useRef(new Animated.Value(H)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0, tension: 65, friction: 11,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: H, duration: 250, useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handlePost = () => {
    if (!text.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newComment: Comment = {
      id: Date.now().toString(),
      user: { username: 'sen', avatar: 'https://i.pravatar.cc/100?img=99' },
      text: text.trim(),
      time: 'şimdi',
      likes: 0,
    };
    const updated = [newComment, ...comments];
    setComments(updated);
    setText('');
    onCommentAdded?.(updated.length);
    setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      {/* Backdrop */}
      <TouchableOpacity style={ms.backdrop} activeOpacity={1} onPress={onClose} />

      <Animated.View style={[ms.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={ms.handleWrap}>
          <View style={ms.handle} />
        </View>

        {/* Header */}
        <View style={ms.header}>
          <Text style={ms.title}>{comments.length} Yorum</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Separator */}
        <View style={ms.sep} />

        {/* Comments */}
        <FlashList
          ref={listRef}
          data={comments}
          renderItem={({ item }) => <CommentRow item={item} />}
          keyExtractor={i => i.id}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={ms.empty}>
              <Ionicons name="chatbubble-outline" size={40} color={Colors.textDim} />
              <Text style={ms.emptyText}>Henüz yorum yok</Text>
              <Text style={ms.emptySubtext}>İlk yorumu sen yap!</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={ms.rowSep} />}
        />

        {/* Input */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={ms.inputRow}>
            <Image source={{ uri: 'https://i.pravatar.cc/100?img=99' }} style={ms.myAvatar} contentFit="cover" />
            <View style={ms.inputWrap}>
              <TextInput
                ref={inputRef}
                style={ms.input}
                placeholder="Yorum yaz..."
                placeholderTextColor={Colors.textMuted}
                value={text}
                onChangeText={setText}
                multiline
                maxLength={200}
                returnKeyType="send"
                onSubmitEditing={handlePost}
              />
              <TouchableOpacity
                onPress={handlePost}
                disabled={!text.trim()}
                style={[ms.sendBtn, text.trim() && ms.sendBtnActive]}
              >
                <Ionicons name="arrow-up" size={16} color={text.trim() ? '#fff' : Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const SHEET_H = H * 0.75;

const ms = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: SHEET_H,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 12,
    elevation: 12,
  },
  handleWrap: { alignItems: 'center', paddingTop: 10 },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
  },
  title: { fontSize: 16, fontWeight: '700', color: Colors.text },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  rowSep: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.borderLight, marginLeft: 66 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '600', color: Colors.textMuted },
  emptySubtext: { fontSize: 13, color: Colors.textDim },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  myAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.surfaceAlt },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 22, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, paddingRight: 6, paddingVertical: 6,
    gap: 8,
  },
  input: { flex: 1, fontSize: 14, color: Colors.text, maxHeight: 80, paddingVertical: 2 },
  sendBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnActive: { backgroundColor: Colors.primary },
});
