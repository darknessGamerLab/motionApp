import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 4) / GRID_COLUMNS; // 4px gap total

/**
 * MeScreen - Modern profil sayfası
 * 
 * Dribbble "Look at Me" tasarımına uygun
 * Modern, temiz ve minimal tasarım
 */
interface MeScreenProps {
  isActive?: boolean;
}

export default function MeScreen({ isActive = false }: MeScreenProps) {
  const insets = useSafeAreaInsets();

  // Örnek kullanıcı verisi
  const user = {
    id: 'user1',
    username: 'johndoe',
    fullName: 'John Doe',
    mainAvatar: 'https://i.pravatar.cc/300?img=1',
    leftAvatar: 'https://i.pravatar.cc/300?img=2',
    rightAvatar: 'https://i.pravatar.cc/300?img=3',
    skills: ['Photography', 'Travel', 'Adventure'],
    posts: 42,
    followers: 1250,
    following: 340,
  };

  // Örnek içerik verileri (ızgara için)
  const posts = Array.from({ length: 12 }, (_, i) => ({
    id: `post-${i + 1}`,
    thumbnail: `https://picsum.photos/400/600?random=${i + 1}`,
    isVideo: i % 3 === 0,
  }));

  const renderPostItem = ({ item, index }: { item: typeof posts[0]; index: number }) => {
    const isLastInRow = (index + 1) % GRID_COLUMNS === 0;
    return (
      <View style={[styles.postItem, { marginRight: isLastInRow ? 0 : 2 }]}>
        <Image 
          source={{ uri: item.thumbnail }} 
          style={styles.postThumbnail}
          resizeMode="cover"
        />
        {/* Tüm videolar için play ikonu göster */}
        <View style={styles.videoBadge}>
          <Ionicons name="play" size={18} color="#fff" />
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => console.log('Back')}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerUsername}>@{user.username}</Text>
        </View>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => console.log('Settings')}
        >
          <Ionicons name="settings-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={isActive}
      >
        {/* Profile Photos - Ana fotoğraf ve yan fotoğraflar */}
        <View style={styles.profilePhotoContainer}>
          {/* Left Photo */}
          <View style={[styles.secondaryPhotoContainer, styles.leftSecondaryPhoto]}>
            <Image 
              source={{ uri: user.leftAvatar }} 
              style={styles.secondaryPhoto}
            />
          </View>

          {/* Main Photo */}
          <View style={[styles.mainPhotoWrapper, styles.mainPhotoMargin]}>
            <Image 
              source={{ uri: user.mainAvatar }} 
              style={styles.profilePhoto}
            />
          </View>

          {/* Right Photo */}
          <View style={[styles.secondaryPhotoContainer, styles.rightSecondaryPhoto]}>
            <Image 
              source={{ uri: user.rightAvatar }} 
              style={styles.secondaryPhoto}
            />
          </View>
        </View>

        {/* Ad Soyad */}
        <View style={styles.userInfo}>
          <Text style={styles.fullName}>{user.fullName}</Text>
        </View>

        {/* Yetenek Alanları - 3 adet */}
        <View style={styles.skillsContainer}>
          {user.skills.map((skill, index) => (
            <View key={index} style={styles.skillTag}>
              <Text style={styles.skillText}>#{skill}</Text>
            </View>
          ))}
        </View>

        {/* Stats - Videos, Followers, Following */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user.posts}</Text>
            <Text style={styles.statLabel}>Videos</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user.followers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user.following}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => console.log('Edit Profile')}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.inviteButton}
            onPress={() => console.log('Invite')}
          >
            <Text style={styles.inviteButtonText}>Invite</Text>
          </TouchableOpacity>
        </View>

        {/* Posts Grid */}
        <View style={styles.postsSection}>
          <FlatList
            data={posts}
            renderItem={renderPostItem}
            keyExtractor={(item) => item.id}
            numColumns={GRID_COLUMNS}
            scrollEnabled={false}
            contentContainerStyle={styles.gridContainer}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  headerUsername: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  profilePhotoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  mainPhotoWrapper: {
    zIndex: 3, // En üstte
  },
  mainPhotoMargin: {
    marginHorizontal: -40, // Fotoğrafları daha yaklaştırmak için negatif margin
  },
  profilePhoto: {
    width: 115, // %15 büyütüldü (100 * 1.15)
    height: 129, // %15 büyütüldü (112 * 1.15)
    borderRadius: 10,
    overflow: 'hidden',
  },
  secondaryPhotoContainer: {
    zIndex: 1, // Ana fotoğrafın altında
  },
  leftSecondaryPhoto: {
    transform: [{ rotate: '-10deg' }],
  },
  rightSecondaryPhoto: {
    transform: [{ rotate: '10deg' }],
  },
  secondaryPhoto: {
    width: 90, // %10 küçük (100 * 0.9)
    height: 101, // %10 küçük (112 * 0.9)
    borderRadius: 9,
    opacity: 0.5, // Hafif soluk
  },
  userInfo: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  fullName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 8,
  },
  skillTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skillText: {
    fontSize: 13,
    color: '#000',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  editButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  inviteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
  },
  inviteButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  postsSection: {
    paddingHorizontal: 2,
  },
  gridContainer: {
    paddingBottom: 20,
  },
  postItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE * 1.5, // Dikey format (video gibi)
    marginBottom: 2,
    position: 'relative',
    backgroundColor: '#000',
  },
  postThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -15 }, { translateY: -15 }],
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
