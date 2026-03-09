import FollowListScreen from "@/components/FollowListScreen";
import { CustomAlert as Alert } from '@/components/GlobalAlert';
import ProfilePhotoCarousel from "@/components/ProfilePhotoCarousel";
import ProfileTabGrid from "@/components/ProfileTabGrid";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import VideoPlayerModal from "@/components/VideoPlayerModal";
import Colors from "@/constants/Colors";
import { getTalentById, getTalentByName } from "@/constants/Talents";
import { useAuth } from "@/contexts/AuthContext";
import { useVideoPlayer as usePlayerModal } from "@/hooks/useVideoPlayer";
import { supabase } from "@/lib/supabase";
import { VideoItem } from "@/types/video";
import { formatNumber } from "@/utils/format";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dimensions,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import EditProfileScreen from "./EditProfileScreen";

import { annotateInteractions } from '@/utils/videoInteractions';
import SettingsScreen from "./SettingsScreen";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_COLUMNS = 3;
const GRID_GAP = 2;
const GRID_ITEM_WIDTH =
  (SCREEN_WIDTH - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

interface MeScreenProps {
  isActive?: boolean;
  userProfile?: any;
  allVideos?: VideoItem[];
  onVideoDelete?: (videoId: string) => void;
  onVideoSaved?: (videoId: string, isSaved: boolean) => void;
  onVideoLiked?: (
    videoId: string,
    isLiked: boolean,
    newLikeCount: number,
  ) => void;
  onVideoCommented?: (videoId: string, newCommentCount: number) => void;
  onProfileUpdate?: (updatedProfile: any) => void;
  onUserPress?: (userId: string) => void;
}

export default function MeScreen({
  isActive = false,
  userProfile,
  allVideos = [],
  onVideoSaved,
  onVideoLiked,
  onVideoCommented,
  onVideoDelete,
  onProfileUpdate,
  onUserPress,
}: MeScreenProps) {
  const insets = useSafeAreaInsets();
  // ── Video player modal — extracted to useVideoPlayer hook (replaces 3 manual states)
  const player = usePlayerModal();

  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const { authState } = useAuth();
  const userId = authState.user?.id;

  // DB'den kullanıcının kendi videoları
  const [dbUserVideos, setDbUserVideos] = useState<VideoItem[]>([]);
  const [dbSavedVideos, setDbSavedVideos] = useState<VideoItem[]>([]);
  const [dbLikedVideos, setDbLikedVideos] = useState<VideoItem[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [showFollowList, setShowFollowList] = useState(false);

  const hasFetchedRef = useRef(false);

  const fetchMyData = useCallback(
    async (force = false) => {
      if (!userId) return;
      // Only fetch once per userId session unless forced (e.g. after delete/save)
      if (!force && hasFetchedRef.current) return;
      hasFetchedRef.current = true;
      setDbLoading(true);
      try {
        // Kendi videolarım
        const { data: vids } = await (supabase as any)
          .from("videos")
          .select(
            "id, video_url, user_id, description, topic, likes_count, comments_count, shares_count, thumbnail_url, created_at, profiles(id, username, avatar_url)",
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (vids) {
          const rawVids = vids.map((row: any) => ({
            id: row.id,
            uri: row.video_url || "",
            thumbnail_url: row.thumbnail_url,
            user: {
              id: row.user_id,
              username: row.profiles?.username || "",
              avatar: row.profiles?.avatar_url,
            },
            description: row.description || "",
            topic: row.topic || "",
            likes: row.likes_count || 0,
            comments: row.comments_count || 0,
            shares: row.shares_count || 0,
            isLiked: false,
            isSaved: false,
          }));
          const annotatedVids = await annotateInteractions(rawVids as any, userId);
          setDbUserVideos(annotatedVids as any);
        }

        // Kaydettiğim videolar
        const { data: saved } = await (supabase as any)
          .from("saves")
          .select(
            "video_id, videos(id, video_url, user_id, description, topic, likes_count, comments_count, shares_count, thumbnail_url, created_at, profiles(id, username, avatar_url))",
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (saved) {
          const rawSaved = saved
            .filter((s: any) => s.videos)
            .map((s: any) => ({
              id: s.videos.id,
              uri: s.videos.video_url || "",
              thumbnail_url: s.videos.thumbnail_url,
              user: {
                id: s.videos.user_id,
                username: s.videos.profiles?.username || "",
                avatar: s.videos.profiles?.avatar_url,
              },
              description: s.videos.description || "",
              topic: s.videos.topic || "",
              likes: s.videos.likes_count || 0,
              comments: s.videos.comments_count || 0,
              shares: s.videos.shares_count || 0,
              isLiked: false,
              isSaved: true,
            }));
          const annotatedSaved = await annotateInteractions(rawSaved as any, userId);
          setDbSavedVideos(annotatedSaved as any);
        }

        // Beğendiğim videolar
        const { data: liked } = await (supabase as any)
          .from("likes")
          .select(
            "video_id, videos(id, video_url, user_id, description, topic, likes_count, comments_count, shares_count, thumbnail_url, created_at, profiles(id, username, avatar_url))",
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (liked) {
          const rawLiked = liked
            .filter((l: any) => l.videos)
            .map((l: any) => ({
              id: l.videos.id,
              uri: l.videos.video_url || "",
              thumbnail_url: l.videos.thumbnail_url,
              user: {
                id: l.videos.user_id,
                username: l.videos.profiles?.username || "",
                avatar: l.videos.profiles?.avatar_url,
              },
              description: l.videos.description || "",
              topic: l.videos.topic || "",
              likes: l.videos.likes_count || 0,
              comments: l.videos.comments_count || 0,
              shares: l.videos.shares_count || 0,
              isLiked: true,
              isSaved: false,
            }));
          const annotatedLiked = await annotateInteractions(rawLiked as any, userId);
          setDbLikedVideos(annotatedLiked as any);
        }
      } catch (e) {
        console.warn("[MeScreen] fetchMyData error:", e);
      } finally {
        setDbLoading(false);
      }
    },
    [userId],
  );

  // Fetch on mount; userId change resets the guard
  useEffect(() => {
    hasFetchedRef.current = false;
    fetchMyData();
  }, [userId]);

  // userProfile'dan user bilgilerini al
  const user = useMemo(
    () => ({
      username: userProfile?.username || "kullanici",
      fullName: userProfile?.fullName || "Kullanıcı",
      bio: userProfile?.bio || "Merhaba! 👋",
      // Use real avatar_urls array if available, else single avatar_url, else generated
      avatars:
        userProfile?.avatars?.length > 0
          ? userProfile.avatars
          : userProfile?.avatar
            ? [userProfile.avatar]
            : [
              `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.username || "U")}&background=random&size=300`,
            ],
      skills: userProfile?.skills || [],
      following: userProfile?.following || 0,
      followers: userProfile?.followers || 0,
      videos: userProfile?.videos || 0,
    }),
    [userProfile],
  );

  // DB videolarını önce kullan, fallback olarak prop'tan gelen allVideos
  const userVideos =
    dbUserVideos.length > 0
      ? dbUserVideos
      : allVideos.filter(
        (v) => v.user.id === userId || v.user.username === user.username,
      );
  const savedVideosList =
    dbSavedVideos.length > 0
      ? dbSavedVideos
      : allVideos.filter((v) => v.isSaved);

  const [followListTab, setFollowListTab] = useState<"following" | "followers">("followers");

  const openFollowList = (tab: "following" | "followers") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFollowListTab(tab);
    setShowFollowList(true);
  };

  // Video silme — ProfileTabGrid'e onVideoLongPress olarak geçilir
  const handleDeleteVideo = useCallback(
    (video: VideoItem) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        "Videoyu Sil",
        "Bu videoyu silmek istediğinizden emin misiniz?",
        [
          { text: "İptal", style: "cancel" },
          {
            text: "Sil",
            style: "destructive",
            onPress: () => {
              setDbUserVideos((prev) => prev.filter((v) => v.id !== video.id));
              onVideoDelete?.(video.id);
            },
          },
        ],
      );
    },
    [onVideoDelete],
  );

  const handleVideoSaved = useCallback(
    (videoId: string, isSaved: boolean) => {
      if (!isSaved) {
        setDbSavedVideos((prev) => prev.filter((v) => v.id !== videoId));
      }
      onVideoSaved?.(videoId, isSaved);
    },
    [onVideoSaved],
  );

  const formatViews = formatNumber;

  // ─── Loading skeleton ──────────────────────────────────────────────────────
  if (dbLoading && dbUserVideos.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <SkeletonLoader width={120} height={16} borderRadius={8} />
          <SkeletonLoader width={32} height={32} borderRadius={16} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <SkeletonLoader.ProfileHeader />
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 2,
              padding: 2,
            }}
          >
            {Array.from({ length: 9 }).map((_, i) => (
              <SkeletonLoader.GridTile key={i} size={GRID_ITEM_WIDTH} />
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerUsername}>@{user.username}</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowSettings(true)}
        >
          <Ionicons name="settings-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        scrollEnabled={isActive}
      >
        {/* Profile Photos - 3 Photos */}
        <View style={styles.profileSection}>
          {/* 3 Photos Carousel */}
          <ProfilePhotoCarousel
            avatars={user.avatars}
            size={90}
            isEditable={true}
            onEditPress={() => setShowEditProfile(true)}
          />

          {/* Full Name */}
          <Text style={styles.fullName}>{user.fullName}</Text>

          {/* Bio */}
          <Text style={styles.bio} numberOfLines={1}>
            {user.bio}
          </Text>

          {/* Skills - 3 Skills Mandatory */}
          <View style={styles.skillsContainer}>
            {user.skills.map((skill: string, index: number) => {
              const talent = getTalentById(skill) || getTalentByName(skill);
              const label = talent ? talent.name : skill;
              return (
                <Text key={index} style={styles.skillText}>
                  #{label.toLowerCase()}
                </Text>
              );
            })}
          </View>

          {/* Stats — tıklanabilir, takıpçi/takip listesi açıyor */}
          <View style={styles.stats}>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => openFollowList("following")}
            >
              <Text style={styles.statNumber}>{user.following}</Text>
              <Text style={styles.statLabel}>Takip Edilen</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => openFollowList("followers")}
            >
              <Text style={styles.statNumber}>{user.followers}</Text>
              <Text style={styles.statLabel}>Takipçi</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{formatViews(user.videos)}</Text>
              <Text style={styles.statLabel}>Video</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {/* Profili Düzenle — uygulama kırmızısı */}
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => setShowEditProfile(true)}
            >
              <Ionicons name="pencil-outline" size={15} color="#fff" />
              <Text style={styles.editProfileButtonText}>Profili Düzenle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={() => {
                Share.share({
                  title: `@${user.username} - motionApp`,
                  message: `motionApp'te @${user.username} profilini incele!`,
                }).catch(() => { });
              }}
            >
              <Ionicons
                name="share-social-outline"
                size={15}
                color={Colors.text}
              />
              <Text style={styles.shareButtonText}>Paylaş</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ✅ ProfileTabGrid — replaces ~160 lines of duplicate tab+FlatList code */}
        <ProfileTabGrid
          videos={userVideos}
          likedVideos={dbLikedVideos}
          savedVideos={savedVideosList}
          loading={dbLoading}
          onVideoPress={(list, idx) => player.open(list, idx)}
          onVideoLongPress={handleDeleteVideo}
        />
      </ScrollView>

      {/* ✅ Shared Video Player Modal - Overlay */}
      <VideoPlayerModal
        visible={player.visible}
        videos={player.videos}
        startIndex={player.startIndex}
        onClose={player.close}
        mode="own-profile"
        onVideoSaved={handleVideoSaved}
        onVideoLiked={onVideoLiked}
        onVideoCommented={onVideoCommented}
        onDelete={handleDeleteVideo ? (id: string) => handleDeleteVideo({ id } as any) : undefined}
        onUserPress={onUserPress}
      />

      {/* ✅ Takipçi / Takip Listesi Modal */}
      {showFollowList && (
        <FollowListScreen
          visible={showFollowList}
          userId={userId || ""}
          initialTab={followListTab}
          onClose={() => setShowFollowList(false)}
          onUserPress={(uid) => {
            setShowFollowList(false);
            // Parent'a geiş için — index.tsx'de yönetilecek
          }}
        />
      )}

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <SettingsScreen
          onBackPress={() => setShowSettings(false)}
          onEditProfile={() => {
            setShowSettings(false);
            setShowEditProfile(true);
          }}
        />
      </Modal>

      {/* Edit Profile Screen */}
      <Modal
        visible={showEditProfile}
        animationType="slide"
        onRequestClose={() => setShowEditProfile(false)}
      >
        <EditProfileScreen
          onClose={() => setShowEditProfile(false)}
          userProfile={{
            ...user,
            avatarUri: user.avatars?.[0] || "",
            talents: (userProfile as any).talents || [],
          }}
          onSave={(updatedProfile) => {
            onProfileUpdate?.(updatedProfile);
            setShowEditProfile(false);
          }}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: { padding: 4 },
  headerUsername: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: Colors.text },
  scrollView: { flex: 1 },
  profileSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
    alignItems: "center",
  },
  fullName: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.text,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  bio: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 12,
    maxWidth: "80%",
  },
  skillsContainer: {
    flexDirection: "row",
    gap: 32,
    marginBottom: 16,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  skillText: { color: Colors.primary, fontSize: 13, fontFamily: 'Poppins_500Medium' },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 0,
    paddingHorizontal: 20,
    width: "100%",
  },
  statItem: { alignItems: "center", flex: 1 },
  statNumber: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: Colors.text,
    marginBottom: 3,
  },
  statLabel: { fontSize: 12, color: Colors.textMuted, fontFamily: 'Poppins_500Medium' },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.border },
  taxInfoBar: {
    backgroundColor: "rgba(0,0,0,0.04)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  taxLabel: {
    fontSize: 10,
    fontFamily: "Poppins_700Bold",
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  actionButtons: { flexDirection: "row", gap: 8, width: "100%", marginTop: 10 },
  // Profili Düzenle butonu — kırmızı tema rengi
  editProfileButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  editProfileButtonText: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: "#fff" },
  // Paylaş butonu — nötr
  shareButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  shareButtonText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: Colors.text },
  // Eski tek tip buton (kültüşme için tutuldu)
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonText: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: Colors.text },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    marginTop: 2,
    position: "relative",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
    paddingBottom: 5,
  },
  tabIndicator: {
    position: "absolute",
    bottom: -1,
    width: 40,
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 1.5,
  },
  gridContainer: { flexDirection: "row", width: SCREEN_WIDTH * 3 },
  gridPage: { width: SCREEN_WIDTH },
  gridContent: { paddingBottom: 4 },
  videoItem: {
    width: GRID_ITEM_WIDTH,
    height: GRID_ITEM_WIDTH * 1.3,
    backgroundColor: Colors.surfaceAlt,
  },
  videoThumbnail: { width: "100%", height: "100%" },
  viewsOverlay: {
    position: "absolute",
    bottom: 4,
    left: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewsText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Poppins_700Bold",
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  editModalContent: {
    width: "85%",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  editModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  editModalTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: Colors.text },
  editModalPlaceholder: {
    color: Colors.textMuted,
    fontSize: 14,
    marginBottom: 20,
    textAlign: "center",
    fontFamily: 'Poppins_400Regular',
  },
  editModalButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
  },
  editModalButtonText: { color: "#fff", fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
});
