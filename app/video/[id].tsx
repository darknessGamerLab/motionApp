import { VideoCard } from "@/app/HomeScreen";
import CommentsModal from "@/components/CommentsModal";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { VideoItem } from "@/types/video";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    Dimensions,
    StyleSheet,
    TouchableOpacity,
    View,
    ViewToken,
} from "react-native";

const { width: W, height: FULL_H } = Dimensions.get("window");

/**
 * Dedicated Video Screen to fix routing issues from Modals.
 * Supports deep-linking and back-button behavior out of the box.
 */
export default function VideoScreen() {
    const { id, userId, feedType } = useLocalSearchParams<{
        id: string;
        userId: string;
        feedType: string;
    }>();
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { authState } = useAuth();
    const currentUserId = authState.user?.id;

    // Render & Playback state
    const [activeIdx, setActiveIdx] = useState(0);
    const activeIdxRef = useRef(0);
    const [paused, setPaused] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [commentVideoId, setCommentVideoId] = useState<string | null>(null);
    const [commentCount, setCommentCount] = useState(0);

    // 1. Fetch exactly the subset of videos needed based on the feed context
    useEffect(() => {
        async function loadVideos() {
            if (!currentUserId && !userId) return;

            let fetched: VideoItem[] = [];
            try {
                if (feedType === "profile") {
                    const { data, error } = await (supabase as any)
                        .from("videos")
                        .select("id, video_url, user_id, description, topic, likes_count, comments_count, shares_count, thumbnail_url, created_at, profiles(id, username, avatar_url)")
                        .eq("user_id", userId || currentUserId)
                        .order("created_at", { ascending: false })
                        .limit(50);

                    if (!error && data) {
                        fetched = data.map((row: any) => ({
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
                    }
                } else if (feedType === "saved") {
                    const { data, error } = await (supabase as any)
                        .from("saves")
                        .select("video_id, videos(id, video_url, user_id, description, topic, likes_count, comments_count, shares_count, thumbnail_url, created_at, profiles(id, username, avatar_url))")
                        .eq("user_id", userId || currentUserId)
                        .order("created_at", { ascending: false })
                        .limit(50);

                    if (!error && data) {
                        fetched = data
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
                    }
                }
            } catch (e) {
                console.warn("Playback fetch error", e);
            }

            // Ensure the tapped ID is actually in the list, and identify its position
            if (fetched.length > 0) {
                setVideos(fetched);
                const tapIndex = fetched.findIndex((v) => v.id === id);
                if (tapIndex > 0) {
                    setActiveIdx(tapIndex);
                    activeIdxRef.current = tapIndex;
                }
            }
            setLoading(false);
        }
        loadVideos();
    }, [id, userId, feedType, currentUserId]);

    const togglePause = useCallback(() => setPaused((p) => !p), []);

    const onViewChange = useRef(
        ({ viewableItems }: { viewableItems: ViewToken[] }) => {
            const first = viewableItems.find((t) => t.isViewable && t.index != null);
            if (!first || first.index == null) return;
            const newIdx = first.index;
            if (newIdx === activeIdxRef.current) return;
            activeIdxRef.current = newIdx;
            setActiveIdx(newIdx);
            setPaused(false);
        },
    ).current;

    const viewConfig = useRef({ itemVisiblePercentThreshold: 70 }).current;

    // Updates local state optimistically
    const handleLike = useCallback(
        (videoId: string, isLiked: boolean, likes: number) => {
            setVideos((prev) =>
                prev.map((v) => (v.id === videoId ? { ...v, isLiked, likes } : v)),
            );
        },
        [],
    );

    const handleSave = useCallback((videoId: string, isSaved: boolean) => {
        setVideos((prev) =>
            prev.map((v) => (v.id === videoId ? { ...v, isSaved } : v)),
        );
    }, []);

    const handleCommentUpdate = useCallback(
        (newCount: number) => {
            if (!commentVideoId) return;
            setVideos((prev) =>
                prev.map((v) =>
                    v.id === commentVideoId ? { ...v, comments: newCount } : v,
                ),
            );
        },
        [commentVideoId],
    );

    const renderItem = useCallback(
        ({ item, index }: { item: VideoItem; index: number }) => (
            <VideoCard
                data={item}
                active={index === activeIdx}
                paused={paused && index === activeIdx}
                height={FULL_H}
                isAuthenticated={!!currentUserId}
                onTogglePause={togglePause}
                onVideoLiked={handleLike}
                onVideoSaved={handleSave}
                onAuthRequired={() =>
                    Alert.alert("Giriş Yap", "Devam etmek için giriş yapmalısınız.")
                }
                onVideoCommented={(vid, count) => {
                    setCommentVideoId(vid);
                    setCommentCount(count);
                    setShowComments(true);
                }}
            />
        ),
        [activeIdx, paused, currentUserId, togglePause, handleLike, handleSave],
    );

    if (loading) {
        return <View style={s.container} />;
    }

    return (
        <View style={s.container}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={28} color="#fff" />
            </TouchableOpacity>

            <FlashList
                data={videos}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                pagingEnabled
                snapToInterval={FULL_H}
                snapToAlignment="start"
                decelerationRate="fast"
                disableIntervalMomentum
                onViewableItemsChanged={onViewChange}
                viewabilityConfig={viewConfig}
                removeClippedSubviews={false}
                drawDistance={FULL_H}
                // @ts-ignore
                estimatedItemSize={FULL_H}
                showsVerticalScrollIndicator={false}
                initialScrollIndex={activeIdx}
            />

            <CommentsModal
                visible={showComments}
                onClose={() => setShowComments(false)}
                videoId={commentVideoId || ""}
                commentCount={commentCount}
                onCommentAdded={handleCommentUpdate}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },
    backBtn: {
        position: "absolute",
        top: 50,
        left: 20,
        zIndex: 99,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(0,0,0,0.4)",
        alignItems: "center",
        justifyContent: "center",
    },
});
