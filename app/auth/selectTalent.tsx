import Colors from '@/constants/Colors';
import { TALENTS } from '@/constants/Talents';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SelectTalentScreen() {
  const insets = useSafeAreaInsets();
  const { setUserData, completeAuth } = useAuth();

  const [selectedTalents, setSelectedTalents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleTalent = (talentId: string) => {
    setError('');
    if (selectedTalents.includes(talentId)) {
      setSelectedTalents(selectedTalents.filter(id => id !== talentId));
    } else {
      if (selectedTalents.length < 3) {
        setSelectedTalents([...selectedTalents, talentId]);
      } else {
        setError('En fazla 3 yetenek seçebilirsiniz');
      }
    }
  };

  const handleContinue = () => {
    if (selectedTalents.length < 1) {
      setError('En az 1 yetenek seçmelisiniz');
      return;
    }

    setError('');
    setLoading(true);

    setUserData({ talents: selectedTalents });

    setTimeout(() => {
      completeAuth();
      setLoading(false);
    }, 300);
  };

  const getSelectedTalentNames = () => {
    return selectedTalents.map(id => {
      const talent = TALENTS.find(t => t.id === id);
      return talent?.name || '';
    }).filter(Boolean).join(', ');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
          <Text style={styles.progressText}>Son Adım</Text>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Yeteneklerini Seç</Text>
          <Text style={styles.subtitle}>
            Profilinde gösterilecek yeteneklerini seç{'\n'}
            <Text style={styles.highlight}>1-3 adet</Text> seçebilirsin
          </Text>
        </View>

        {/* Selection Counter */}
        <View style={styles.counterContainer}>
          <Text style={styles.counterText}>
            {selectedTalents.length}/3 seçildi
          </Text>
          {selectedTalents.length > 0 && (
            <Text style={styles.selectedText} numberOfLines={1}>
              {getSelectedTalentNames()}
            </Text>
          )}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Talents Grid */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.talentsGrid}>
            {TALENTS.map((talent) => {
              const isSelected = selectedTalents.includes(talent.id);
              return (
                <TouchableOpacity
                  key={talent.id}
                  style={[styles.talentCard, isSelected && styles.talentCardSelected]}
                  onPress={() => toggleTalent(talent.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
                    <Ionicons
                      name={talent.icon as any}
                      size={24}
                      color={isSelected ? '#fff' : Colors.textSecondary}
                    />
                  </View>
                  <Text style={[styles.talentName, isSelected && styles.talentNameSelected]}>
                    {talent.name}
                  </Text>
                  {isSelected && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Continue Button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[
              styles.button,
              loading && styles.buttonDisabled,
              selectedTalents.length === 0 && styles.buttonInactive
            ]}
            onPress={handleContinue}
            disabled={loading || selectedTalents.length === 0}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>Başla</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  progressText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    fontFamily: 'Poppins_400Regular',
  },
  highlight: {
    color: Colors.primary,
    fontFamily: 'Poppins_600SemiBold',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  counterText: {
    color: Colors.primary,
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  selectedText: {
    color: Colors.textMuted,
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
    fontFamily: 'Poppins_400Regular',
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'Poppins_500Medium',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  talentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  talentCard: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    position: 'relative',
  },
  talentCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryDark + '15',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconContainerSelected: {
    backgroundColor: Colors.primary,
  },
  talentName: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
  },
  talentNameSelected: {
    color: Colors.text,
    fontFamily: 'Poppins_600SemiBold',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingTop: 16,
  },
  button: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonInactive: {
    backgroundColor: Colors.border,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
  },
});
