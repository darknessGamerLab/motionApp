
import { CustomAlert as Alert } from '@/components/GlobalAlert';
import ProfilePhotoCarousel from "@/components/ProfilePhotoCarousel";
import ProfileTabGrid from "@/components/ProfileTabGrid";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import VideoPlayerModal from "@/components/VideoPlayerModal";
import Colors from "@/constants/Colors";
import { getTalentById, getTalentByName } from "@/constants/Talents";
import { useAuth } from "@/contexts/AuthContext";
import { useVideoPlayer as usePlayerModal } from "@/hooks/useVideoPlayer";
import { eventBus } from "@/lib/eventBus";
import { supabase } from "@/lib/supabase";
import { VideoItem } from "@/types/video";
import { formatNumber } from "@/utils/format";
import { annotateInteractions } from '@/utils/videoInteractions';
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
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

const EditProfileScreen = lazy(() => import('./EditProfileScreen'));
const SettingsScreen = lazy(() => import('./SettingsScreen'));
const FollowListScreen = lazy(() => import('@/components/FollowListScreen'));

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
  isBackgrounded?: boolean;
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
  isBackgrounded = false,
}: MeScreenProps) {
  const insets = useSafeAreaInsets();
  const player = usePlayerModal();

  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const { authState } = useAuth();
  const userId = authState.user?.id;

  const [dbUserVideos, setDbUserVideos] = useState<VideoItem[]>([]);
  const [dbSavedVideos, setDbSavedVideos] = useState<VideoItem[]>([]);
  const [dbLikedVideos, setDbLikedVideos] = useState<VideoItem[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [showFollowList, setShowFollowList] = useState(false);

  const hasFetchedRef = useRef(false);

  const fetchMyData = useCallback(
    async (force = false) => {
      if (!userId) return;
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

  // Fetch on mount
  useEffect(() => {
    hasFetchedRef.current = false;
    fetchMyData();
  }, [userId]);

  // EventBus: beğeni değiştiğinde liked listesini yenile
  useEffect(() => {
    if (!userId) return;
    const unsubLike = eventBus.on('video:liked', ({ videoId, isLiked }) => {
      if (isLiked) {
        hasFetchedRef.current = false;
        fetchMyData(true);
      } else {
        setDbLikedVideos(prev => prev.filter(v => v.id !== videoId));
      }
    });
    const unsubSave = eventBus.on('video:saved', ({ videoId, isSaved }) => {
      if (isSaved) {
        hasFetchedRef.current = false;
        fetchMyData(true);
      } else {
        setDbSavedVideos(prev => prev.filter(v => v.id !== videoId));
      }
    });
    return () => { unsubLike(); unsubSave(); };
  }, [userId, fetchMyData]);

  const user = useMemo(
    () => ({
      username: userProfile?.username || "kullanici",
      fullName: userProfile?.fullName || "Kullanıcı",
      bio: userProfile?.bio || "Merhaba! 👋",
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
        {/* ─── Profile Header: Avatar (username altında) ─────────── */}
        <View style={styles.profileSection}>

          {/* 3'lü profil fotoğraf carousel — basılı tutunca büyür */}
          <ProfilePhotoCarousel
            avatars={user.avatars}
            size={90}
            isEditable={false}
          />

          {/* İsim + Bio */}
          <Text style={styles.fullName}>{user.fullName}</Text>
          <Text style={styles.bio} numberOfLines={2}>{user.bio}</Text>

          {/* Yetenekler */}
          {user.skills.length > 0 && (
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
          )}

          {/* İstatistikler */}
          <View style={styles.stats}>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => openFollowList("followers")}
            >
              <Text style={styles.statNumber}>{user.followers}</Text>
              <Text style={styles.statLabel}>Takipçi</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => openFollowList("following")}
            >
              <Text style={styles.statNumber}>{user.following}</Text>
              <Text style={styles.statLabel}>Takip</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{formatViews(user.videos)}</Text>
              <Text style={styles.statLabel}>Video</Text>
            </TouchableOpacity>
          </View>

          {/* Aksiyon Butonları */}
          <View style={styles.actionButtons}>
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

        {/* ProfileTabGrid */}
        <ProfileTabGrid
          videos={userVideos}
          likedVideos={dbLikedVideos}
          savedVideos={savedVideosList}
          loading={dbLoading}
          onVideoPress={(list, idx) => player.open(list, idx)}
          onVideoLongPress={handleDeleteVideo}
        />
      </ScrollView>

      {/* Video Player Modal */}
      <VideoPlayerModal
        visible={player.visible}
        videos={player.videos}
        startIndex={player.startIndex}
        onClose={player.close}
        mode="own-profile"
        onVideoSaved={handleVideoSaved}
        onVideoLiked={onVideoLiked}
        onVideoCommented={onVideoCommented}
        onDelete={(videoId) => handleDeleteVideo({ id: videoId } as VideoItem)}
        onUserPress={onUserPress}
        isBackgrounded={isBackgrounded}
      />

      {/* Takipçi / Takip Listesi */}
      {showFollowList && (
        <Suspense fallback={<View style={{flex:1, justifyContent:'center', alignItems:'center'}}><ActivityIndicator size="large" color={Colors.primary} /></View>}>
          <FollowListScreen
            visible={showFollowList}
            userId={userId || ""}
            initialTab={followListTab}
            onClose={() => setShowFollowList(false)}
            onUserPress={(uid) => {
              setShowFollowList(false);
            }}
          />
        </Suspense>
      )}

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <Suspense fallback={<View style={{flex:1, justifyContent:'center', alignItems:'center'}}><ActivityIndicator size="large" color={Colors.primary} /></View>}>
          <SettingsScreen
            onBackPress={() => setShowSettings(false)}
            onEditProfile={() => {
              setShowSettings(false);
              setShowEditProfile(true);
            }}
          />
        </Suspense>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfile}
        animationType="slide"
        onRequestClose={() => setShowEditProfile(false)}
      >
        <Suspense fallback={<View style={{flex:1, justifyContent:'center', alignItems:'center'}}><ActivityIndicator size="large" color={Colors.primary} /></View>}>
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
        </Suspense>
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

  // ─── Profile Section ────────────────────────────────────────────
  profileSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',         // ortada hizalanmış
  },

  fullName: {
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  bio: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textMuted,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },

  // Skills
  skillsContainer: {
    flexDirection: "row",
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    justifyContent: 'center',
  },
  skillText: { color: Colors.primary, fontSize: 12, fontFamily: 'Poppins_500Medium' },

  // Stats — tam genişlik kullan
  stats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",   // eşit aralıklı ve tam genişlik
    width: "100%",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  statItem: { alignItems: "center", flex: 1 },
  statNumber: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: Colors.text,
  },
  statLabel: { fontSize: 11, color: Colors.textMuted, fontFamily: 'Poppins_500Medium' },
  statDivider: { width: 1, height: 24, backgroundColor: Colors.border },

  // Action Buttons — tam genişlik
  actionButtons: { flexDirection: "row", gap: 8, width: "100%", marginBottom: 4 },
  editProfileButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    minHeight: 36,
  },
  editProfileButtonText: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: "#fff" },
  shareButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 36,
  },
  shareButtonText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: Colors.text },
});
