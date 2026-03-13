import { SkeletonLoader } from '@/components/SkeletonLoader';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
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
  isLiked?: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  videoId: string;
  commentCount: number;
  onCommentAdded?: (newCount: number) => void;
}

// Removed MOCK_COMMENTS

function CommentRow({ item }: { item: Comment }) {
  const { authState } = useAuth();
  const [liked, setLiked] = useState(!!item.isLiked);
  const [likes, setLikes] = useState(item.likes || 0);
  const scale = useRef(new Animated.Value(1)).current;

  const handleLike = async () => {
    if (!authState.user) return; // Need auth to like
    const isNowLiked = !liked;
    setLiked(isNowLiked);
    setLikes(l => isNowLiked ? l + 1 : l - 1);

    Animated.sequence([
      Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, speed: 30 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }),
    ]).start();

    try {
      if (isNowLiked) {
        await supabase.from('comment_likes').insert({ comment_id: item.id, user_id: authState.user.id });
      } else {
        await supabase.from('comment_likes').delete().eq('comment_id', item.id).eq('user_id', authState.user.id);
      }
    } catch { } // Silent fallback
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
      </View>
      <TouchableOpacity onPress={handleLike} style={cs.likeBtn}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={16} color={liked ? Colors.primary : Colors.textMuted} />
        </Animated.View>
        <Text style={[cs.likeCount, liked && { color: Colors.primary }]}>{likes}</Text>
      </TouchableOpacity>
    </View>
  );
}

const cs = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 12, alignItems: 'flex-start' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surfaceAlt },
  content: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  username: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: Colors.text },
  time: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: Colors.textMuted },
  text: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary, lineHeight: 20 },
  replyBtn: { marginTop: 6 },
  replyText: { fontSize: 12, color: Colors.textMuted, fontFamily: 'Poppins_500Medium' },
  likeBtn: { alignItems: 'center', gap: 3, paddingTop: 4 },
  likeCount: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: Colors.textMuted },
});

export default function CommentsModal({ visible, onClose, videoId, commentCount, onCommentAdded }: Props) {
  const { authState } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<any>(null);
  const slideAnim = useRef(new Animated.Value(H)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      fetchComments();
    } else {
      Animated.timing(slideAnim, {
        toValue: H, duration: 240,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start();
      setComments([]);
    }
  }, [visible, slideAnim, videoId]);

  const fetchComments = async () => {
    if (!videoId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_video_comments', {
        p_video_id: videoId,
        p_viewer_id: authState.user?.id || undefined
      });

      if (error) {
        console.error('Fetch comments error:', error);
        return;
      }

      if (data) {
        const formatted = data.map((c: any) => ({
          id: c.id,
          user: {
            username: c.username || 'user',
            avatar: c.avatar_url || `https://ui-avatars.com/api/?name=${c.username || 'u'}`
          },
          text: c.text || '',
          time: new Date(c.created_at).toLocaleDateString(),
          likes: c.likes_count || 0,
          isLiked: c.is_liked || false
        }));
        setComments(formatted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!text.trim() || !authState.user || !videoId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const content = text.trim();
    setText(''); // clear input immediately for optimistic UI

    // Optimistic insert
    const optimisticComment: Comment = {
      id: Date.now().toString(),
      user: {
        username: authState.userData?.username || 'You',
        avatar: (authState.userData as any)?.avatar_url || `https://ui-avatars.com/api/?name=${authState.userData?.username || 'me'}`
      },
      text: content,
      time: 'şimdi',
      likes: 0,
    };

    setComments(prev => [optimisticComment, ...prev]);
    // ✅ DÜZELTİLDİ: commentCount prop'unu kullan (stale closure hatası önlendi)
    onCommentAdded?.(commentCount + 1);
    setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);

    try {
      const { error } = await (supabase as any)
        .from('comments')
        .insert({
          video_id: videoId,
          user_id: authState.user.id,
          content,
          text: content, // DB has 'text' column; 'content' added as alias
        });

      if (error) {
        console.error('Insert comment error:', error);
        // Optionally revert optimistic UI here on fail
      }
    } catch (err) {
      console.error(err);
    }
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

        {/* Comments — skeleton while loading, list when ready */}
        {loading ? (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonLoader.NotifRow key={i} />
            ))}
          </>
        ) : (
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
        )}

        {/* Input */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={ms.inputRow}>
            <Image
              source={{ uri: authState.profile?.avatar_url || (authState.userData as any)?.avatar_url || 'https://ui-avatars.com/api/?name=U' }}
              style={ms.myAvatar}
              contentFit="cover"
            />
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
  title: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: Colors.text },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  rowSep: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.borderLight, marginLeft: 66 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: Colors.textMuted },
  emptySubtext: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: Colors.textDim },
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
  input: { flex: 1, fontSize: 14, color: Colors.text, fontFamily: 'Poppins_400Regular', maxHeight: 80, paddingVertical: 2 },
  sendBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnActive: { backgroundColor: Colors.primary },
});
