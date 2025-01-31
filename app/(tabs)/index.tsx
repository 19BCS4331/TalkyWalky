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

const { width } = Dimensions.get('window');
const CARD_WIDTH = width / 2 - 30;

export default function HomeScreen() {
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>TalkyWalky</Text>
        <Text style={styles.subtitle}>Learn a new language today</Text>
      </View>

      <View style={styles.searchContainer}>
        <Animated.View
          style={[
            styles.searchWrapper,
            {
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
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search languages..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            placeholderTextColor={'#666'}
          />
        </Animated.View>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6441A5" />
          <Text style={styles.loadingText}>Loading languages...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadLanguages}>
            <Text style={styles.retryText}>Retry</Text>
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
                style={styles.card}
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
                      <Text style={styles.languageName}>{lang.name}</Text>
                      <Text style={styles.nativeName}>{lang.native_name}</Text>
                      <View style={styles.difficultyBadge}>
                        <Text style={styles.difficultyText}>{lang.difficulty}</Text>
                      </View>
                    </View>
                    <View style={styles.statsContainer}>
                      <View style={styles.stat}>
                        <Text style={styles.statValue}>{lang.total_lessons}</Text>
                        <Text style={styles.statLabel}>Lessons</Text>
                      </View>
                      <View style={styles.stat}>
                        <Text style={styles.statValue}>{lang.total_words}</Text>
                        <Text style={styles.statLabel}>Words</Text>
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
    backgroundColor: '#f8f9fa',
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
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 8,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: CARD_WIDTH,
    height: 180,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardGradient: {
    flex: 1,
    padding: 15,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  
  },
  languageName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  nativeName: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  difficultyBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  difficultyText: {
    color: '#fff',
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
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#6441A5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});