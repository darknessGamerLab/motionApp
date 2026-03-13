import HomeScreen from "@/app/HomeScreen";
import CommentsModal from "@/components/CommentsModal";
import { CustomAlert } from '@/components/GlobalAlert';
import { SkeletonLoader } from "@/components/SkeletonLoader";
import Colors from "@/constants/Colors";
import { useAuth } from "@/contexts/AuthContext";
import { VideoItem } from "@/types/video";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import React, { useEffect, useState } from "react";
import {
    Dimensions,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * VideoPlayerModal — Unified video player for Explore, Profile, and Own-Profile contexts.
 *
 * mode:
 *   'explore'     → no top buttons, comment bar at bottom
 *   'profile'     → back button top-left, comment bar at bottom
 *   'own-profile' → back button top-left, delete button top-right, no report flag, comment bar at bottom
 *
 * Feed (HomeScreen) is the reference and is never wrapped in this modal.
 */

export type VideoPlayerMode = "explore" | "profile" | "own-profile";

interface VideoPlayerModalProps {
    visible: boolean;
    videos: VideoItem[];
    startIndex: number;
    onClose: () => void;
    mode?: VideoPlayerMode;
    /** Active video id, tracked externally when needed */
    activeVideoId?: string;
    onVideoSaved?: (videoId: string, isSaved: boolean) => void;
    onVideoLiked?: (
        videoId: string,
        isLiked: boolean,
        newLikeCount: number,
    ) => void;
    onVideoCommented?: (videoId: string, newCommentCount: number) => void;
    onDelete?: (videoId: string) => void;
    onUserPress?: (userId: string) => void;
    isBackgrounded?: boolean;
}

export default function VideoPlayerModal({
    visible,
    videos,
    startIndex,
    onClose,
    mode = "explore",
    onVideoSaved,
    onVideoLiked,
    onVideoCommented,
    onDelete,
    onUserPress,
    isBackgrounded = false,
}: VideoPlayerModalProps) {
    const insets = useSafeAreaInsets();
    const safeTop = insets.top || Constants.statusBarHeight;
    const { authState } = useAuth();

    // ─── Hide Layout Leap (Skeleton) ────────────────────────────────
    const [showSkeleton, setShowSkeleton] = useState(false);

    useEffect(() => {
        if (visible) {
            setShowSkeleton(true);
            const t = setTimeout(() => setShowSkeleton(false), 450);
            return () => clearTimeout(t);
        }
    }, [visible, startIndex]);

    // Track which video is currently active so the comment bar sends to the right video
    const [activeIdx, setActiveIdx] = useState(startIndex);
    const [showComments, setShowComments] = useState(false);

    useEffect(() => {
        if (visible) {
            setActiveIdx(startIndex);
        }
    }, [visible, startIndex]);

    // ─── Delayed Unmount (For smooth Native Slide-Out) ─────────────
    const [activeState, setActiveState] = useState(visible);
    useEffect(() => {
        if (visible) {
            setActiveState(true);
        } else {
            // Keep HomeScreen "active" for 450ms while Native Modal slides out.
            // This prevents a heavy React re-render from blocking the UI thread!
            const t = setTimeout(() => setActiveState(false), 450);
            return () => clearTimeout(t);
        }
    }, [visible]);

    if (!videos || !videos.length) return null;

    const currentVideo = videos[activeIdx] ?? videos[0];
    const showBack = true;
    const showDelete = mode === "own-profile";
    const hideReport = mode === "own-profile";

    const handleDelete = () => {
        if (!currentVideo?.id || !onDelete) return;
        onDelete(currentVideo.id);
        if (videos.length <= 1) {
            onClose();
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent={true}
        >
            <View style={{ flex: 1, backgroundColor: Colors.background, paddingTop: safeTop }}>
                <View style={{ flex: 1, backgroundColor: "#000", overflow: "hidden" }}>
                    <HomeScreen
                        videos={videos}
                        isActive={activeState && !showSkeleton}
                        isAuthenticated={!!authState.user}
                        startIndex={startIndex}
                        hideReport={hideReport}
                        onActiveIndexChange={setActiveIdx}
                        onUserPress={(uid) => {
                            onClose();
                            setTimeout(() => onUserPress?.(uid), 300);
                        }}
                        onVideoLiked={onVideoLiked}
                        onVideoSaved={onVideoSaved}
                        onVideoCommented={onVideoCommented}
                        onAuthRequired={(action) => {
                            if (!authState.user) {
                                CustomAlert.alert("Kayıt Gerekli", "Bu işlem için giriş yapmalısınız.");
                            }
                        }}
                        isBackgrounded={isBackgrounded}
                    />

                    {/* Mask FlashList initial jump with a skeleton loader */}
                    {showSkeleton && (
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#000", zIndex: 999 }]}>
                            <SkeletonLoader.VideoCard height={Dimensions.get("window").height - safeTop - 52} />
                        </View>
                    )}

                    {/* ── Top Buttons (back / delete) ── */}
                    {showBack && (
                        <TouchableOpacity
                            style={[s.topBtn, s.topLeft, { top: 10 }]}
                            onPress={onClose}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <View style={s.btnBg}>
                                <Ionicons name="arrow-back" size={20} color="#fff" />
                            </View>
                        </TouchableOpacity>
                    )}

                    {showDelete && (
                        <TouchableOpacity
                            style={[s.topBtn, s.topRight, { top: 10 }]}
                            onPress={handleDelete}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <View style={[s.btnBg, s.deleteBg]}>
                                <Ionicons name="trash-outline" size={18} color="#fff" />
                            </View>
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── Comment Input Bar (navbar replacement) ── */}
                <View
                    style={[
                        s.commentBar,
                        {
                            height: 52 + (insets.bottom || (Platform.OS === 'ios' ? 20 : 0)),
                            paddingBottom: insets.bottom || (Platform.OS === 'ios' ? 20 : 0),
                        },
                    ]}
                >
                    <View style={s.inputRow}>
                        <TouchableOpacity
                            style={s.inputWrap}
                            activeOpacity={0.8}
                            onPress={() => setShowComments(true)}
                        >
                            <Text style={s.inputDummyText}>Bir yorum yaz…</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[s.sendBtn, s.sendBtnDisabled]}
                            onPress={() => setShowComments(true)}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="send"
                                size={18}
                                color={"rgba(150,150,150,0.3)"}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <CommentsModal
                visible={showComments}
                onClose={() => setShowComments(false)}
                videoId={currentVideo?.id}
                commentCount={currentVideo?.comments}
                onCommentAdded={(count: number) => onVideoCommented?.(currentVideo.id, count)}
            />
        </Modal>
    );
}

const s = StyleSheet.create({
    // ── Top Buttons ──
    topBtn: {
        position: "absolute",
        zIndex: 1000,
    },
    topLeft: {
        left: 14,
    },
    topRight: {
        right: 14,
    },
    btnBg: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(0,0,0,0.45)",
        alignItems: "center",
        justifyContent: "center",
    },
    deleteBg: {
        backgroundColor: "rgba(220,40,40,0.55)",
    },

    // ── Comment Bar ──
    commentBar: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        backgroundColor: Colors.surface,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: Colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 8,
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    inputWrap: {
        flex: 1,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(150,150,150,0.1)",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(150,150,150,0.2)",
        paddingHorizontal: 14,
        justifyContent: "center",
    },
    inputDummyText: {
        color: "rgba(150,150,150,0.8)",
        fontSize: 14,
        paddingVertical: 0,
        fontFamily: 'Poppins_400Regular',
    },
    sendBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(150,150,150,0.08)",
        alignItems: "center",
        justifyContent: "center",
    },
    sendBtnDisabled: {
        opacity: 0.5,
    },
    sendingText: {
        color: Colors.primary,
        fontFamily: 'Poppins_700Bold',
    },
});
