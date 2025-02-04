import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getLanguages, Language } from '@/services/database';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { useTheme } from '../../context/ThemeContext';
import { fonts } from '@/constants/fonts';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width / 2 - 30;

export default function HomeScreen() {
  const { colors } = useTheme();
  const { height: tabBarHeight } = useTabBarHeight();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadLanguages();
  }, []);

  const loadLanguages = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getLanguages();
      console.log('Fetched languages:', data); // Debug log
      setLanguages(data);
    } catch (err) {
      console.error('Error loading languages:', err);
      setError('Failed to load languages. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLanguages = languages.filter(lang =>
    lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.native_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLanguagePress = (code: string) => {
    router.push(`/language/${code}`);
  };

  const handleSearchFocus = () => {
    Animated.spring(searchAnim, {
      toValue: 1,
      useNativeDriver: false,
    }).start();
  };

  const handleSearchBlur = () => {
    Animated.spring(searchAnim, {
      toValue: 0,
      useNativeDriver: false,
    }).start();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.bold, fontSize: 32, fontWeight: 'bold' }]}>TalkyWalky</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 16, opacity: 0.7, marginBottom: 20 }]}>Learn a new language today</Text>
      </View>

      <View style={styles.searchContainer}>
        <Animated.View
          style={[
            styles.searchWrapper,
            {
              backgroundColor: colors.surface,
              transform: [
                {
                  scale: searchAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.02],
                  }),
                },
              ],
              shadowOpacity: searchAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.1, 0.3],
              }),
            },
          ]}
        >
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text, fontFamily: fonts.regular, fontSize: 16 }]}
            placeholder="Search languages..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            placeholderTextColor={colors.textSecondary}
          />
        </Animated.View>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 16, marginTop: 10 }]}>Loading languages...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: colors.error, fontFamily: fonts.medium, fontSize: 16, textAlign: 'center', marginTop: 20 }]}>Error loading languages</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: colors.surface }]} 
            onPress={loadLanguages}
          >
            <Text style={[styles.retryText, { color: colors.text, fontFamily: fonts.medium, fontSize: 16 }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grid}>
            {filteredLanguages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[styles.card, { backgroundColor: colors.surface }]}
                onPress={() => handleLanguagePress(lang.code)}
              >
                <LinearGradient
                  colors={[lang.color_primary, lang.color_secondary]}
                  style={styles.cardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.cardContent}>
                    <View>
                      <Text style={[styles.languageName, { color: '#fff', fontFamily: fonts.bold, fontSize: 20 }]}>{lang.name}</Text>
                      <Text style={[styles.nativeName, { color: 'rgba(255,255,255,0.8)', fontFamily: fonts.regular, fontSize: 14, marginTop: 2 }]}>{lang.native_name}</Text>
                      <View style={[styles.difficultyBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                        <Text style={[styles.difficultyText, { color: '#fff', fontFamily: fonts.medium, fontSize: 12 }]}>{lang.difficulty}</Text>
                      </View>
                    </View>
                    <View style={styles.statsContainer}>
                      <View style={styles.stat}>
                        <Text style={[styles.statValue, { color: '#fff', fontFamily: fonts.bold, fontSize: 18 }]}>{lang.total_lessons}</Text>
                        <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.8)', fontFamily: fonts.regular, fontSize: 12, marginTop: 2 }]}>Lessons</Text>
                      </View>
                      <View style={styles.stat}>
                        <Text style={[styles.statValue, { color: '#fff', fontFamily: fonts.bold, fontSize: 18 }]}>{lang.total_words}</Text>
                        <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.8)', fontFamily: fonts.regular, fontSize: 12, marginTop: 2 }]}>Words</Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingBottom: 30,
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 5,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  card: {
    width: CARD_WIDTH,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardGradient: {
    padding: 15,
  },
  cardContent: {
    justifyContent: 'space-between',
    minHeight: 150,
  },
  languageName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  nativeName: {
    fontSize: 14,
    marginTop: 2,
  },
  difficultyBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
  },
});