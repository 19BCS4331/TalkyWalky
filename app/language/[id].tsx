import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { getLessonsByLanguage, getLanguageById, getUserProgress, Lesson, Language } from '@/services/database';
import { supabase } from '@/lib/supabase';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';

const { width } = Dimensions.get('window');

export default function LanguageDetails() {
  const params = useLocalSearchParams();
  const languageCode = params.id as string;

  const [language, setLanguage] = useState<Language | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Record<string, { completed: boolean; score: number }>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { height: tabBarHeight } = useTabBarHeight();

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get language details
      const languageData = await getLanguageById(languageCode);
      if (!languageData) {
        console.error('Language not found');
        return;
      }
      setLanguage(languageData);

      // Get lessons for the language
      const languageLessons = await getLessonsByLanguage(languageData.id);
      setLessons(languageLessons);

      // Get user progress if logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userProgress = await getUserProgress(user.id);
        const progressMap = userProgress.reduce((acc, curr) => ({
          ...acc,
          [curr.lesson_id]: {
            completed: curr.completed,
            score: curr.score || 0,
          },
        }), {});
        setProgress(progressMap);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [languageCode])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (!language) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  const renderLesson = (lesson: Lesson) => {
    const lessonProgress = progress[lesson.id];
    const isCompleted = lessonProgress?.completed;
    const score = lessonProgress?.score || 0;

    return (
      <TouchableOpacity
        key={lesson.id}
        style={[styles.lessonCard, isCompleted && styles.completedCard]}
        onPress={() =>
          router.push({
            pathname: '/lesson/[id]',
            params: {
              id: lesson.id,
              languageCode: language.code,
              languageName: language.name,
            },
          })
        }
      >
        <View style={styles.lessonContent}>
          <Text style={styles.lessonTitle}>{lesson.title}</Text>
          <Text style={styles.lessonDescription}>{lesson.description}</Text>
          <View style={styles.lessonMeta}>
            <View style={styles.lessonMetaItem}>
              <Ionicons
                name="time-outline"
                size={16}
                color={language.color_primary}
              />
              <Text style={[styles.lessonMetaText, { color: language.color_primary }]}>
                {lesson.duration}
              </Text>
            </View>
            <View style={styles.lessonMetaItem}>
              <Ionicons
                name="school-outline"
                size={16}
                color={language.color_primary}
              />
              <Text style={[styles.lessonMetaText, { color: language.color_primary }]}>
                {lesson.difficulty}
              </Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={24} color={language.color_primary} />
        {isCompleted ? (
          <View style={styles.scoreContainer}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.scoreText}>{score}%</Text>
          </View>
        ) : (
          <Text style={styles.startText}>Start Lesson</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: tabBarHeight }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Section */}
        <LinearGradient
          colors={[language.color_primary, language.color_secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.languageName}>{language.name}</Text>
            <Text style={styles.nativeName}>{language.native_name}</Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Ionicons name="people" size={20} color="#fff" />
                <Text style={styles.statText}>{language.speakers} Speakers</Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="time" size={20} color="#fff" />
                <Text style={styles.statText}>{language.estimated_time}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.statCard}>
            <Ionicons name="school" size={24} color={language.color_primary} />
            <Text style={styles.statValue}>{language.total_lessons}</Text>
            <Text style={styles.statLabel}>Lessons</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="book" size={24} color={language.color_primary} />
            <Text style={styles.statValue}>{language.total_words}</Text>
            <Text style={styles.statLabel}>Words</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="ribbon" size={24} color={language.color_primary} />
            <Text style={styles.statValue}>
              {Object.values(progress).filter(p => p.completed).length}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        {/* Lessons Section */}
        <View style={styles.lessonsSection}>
          <Text style={styles.sectionTitle}>Available Lessons</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={language.color_primary} />
              <Text style={styles.loadingText}>Loading lessons...</Text>
            </View>
          ) : lessons.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={48} color="#666" />
              <Text style={styles.emptyStateTitle}>No Lessons Available</Text>
              <Text style={styles.emptyStateText}>
                Pull down to refresh and check for new lessons
              </Text>
            </View>
          ) : (
            lessons.map(renderLesson)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 0 : 40,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    padding: 15,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  languageName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  nativeName: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 20,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    color: '#fff',
    fontSize: 14,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    marginTop: -10,
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  statCard: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  lessonsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  completedCard: {
    backgroundColor: '#f8fff8',
  },
  lessonContent: {
    flex: 1,
    marginRight: 10,
  },
  lessonTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  lessonDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  lessonMeta: {
    flexDirection: 'row',
    gap: 15,
  },
  lessonMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  lessonMetaText: {
    fontSize: 12,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    position: 'absolute',
    bottom: 15,
    right: 15,
  },
  scoreText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  startText: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    color: '#666',
  },
});
