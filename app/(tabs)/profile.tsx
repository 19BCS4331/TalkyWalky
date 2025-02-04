import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { MaterialCommunityIcons as MaterialCommunityIconsType } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProgress, getLanguageStats } from '../../services/progress';
import { getUserStats, getAchievements, getLanguageProgress } from '../../services/gamification';
import { useFocusEffect } from '@react-navigation/native';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

// Enable LayoutAnimation for Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

interface Achievement {
  id: string;
  earned_at: string | null;
  progress: number;
  achievement: {
    id: string;
    name: string;
    description: string;
    icon_name: keyof typeof MaterialCommunityIconsType.glyphMap;
    xp_reward: number;
    requirement_type: string;
    requirement_value: number;
  };
}

const ProfileScreen = () => {
  const { height: tabBarHeight } = useTabBarHeight();
  const { user, signOut } = useAuth();
  const { colors, theme, toggleTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState<any>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [languageStats, setLanguageStats] = useState<any>(null);
  const [animationKey, setAnimationKey] = useState(0);
  const [userProfile, setUserProfile] = useState<{
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  }>({
    username: null,
    full_name: null,
    avatar_url: null
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    full_name: ''
  });
  const [userStats, setUserStats] = useState<{
    total_xp: number;
    level: number;
    current_streak: number;
    longest_streak: number;
    xp_to_next_level?: number;
  }>({
    total_xp: 0,
    level: 1,
    current_streak: 0,
    longest_streak: 0
  });
  const [levelConfig, setLevelConfig] = useState<{
    xp_required: number;
    next_level_xp?: number;
  } | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [languageProgress, setLanguageProgress] = useState<any[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const expandAnimation = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;

  const scaleValue = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const statsScaleAnim = useRef(new Animated.Value(0.97)).current;
  const formFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadProgress();
    fetchUserProfile();
    fetchUserStats();
    fetchAchievements();
    fetchLanguageProgress();
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Reset animation key when screen comes into focus
      setAnimationKey(prev => prev + 1);
      // Refresh user stats and achievements
      fetchUserStats();
      fetchAchievements();
      loadProgress();
      fetchLanguageProgress();
    }, [])
  );

  useEffect(() => {
    if (selectedLanguage) {
      loadLanguageStats(selectedLanguage);
    }
  }, [selectedLanguage]);

  useEffect(() => {
    // Single animation on mount
    Animated.spring(statsScaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true
    }).start();
  }, []);

  const loadProgress = async () => {
    try {
      const userProgress = await getProgress();
      setProgress(userProgress);
      if (userProgress && Object.keys(userProgress.languages).length > 0) {
        setSelectedLanguage(Object.keys(userProgress.languages)[0]);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLanguageStats = async (languageCode: string) => {
    const stats = await getLanguageStats(languageCode);
    setLanguageStats(stats);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const fetchUserProfile = async () => {
    try {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setUserProfile(data || {
        username: null,
        full_name: null,
        avatar_url: null
      });

      setEditForm({
        username: data?.username || '',
        full_name: data?.full_name || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchUserStats = async () => {
    try {
      const stats = await getUserStats();
      if (stats) {
        setUserStats(stats);
        // Fetch level configuration for current and next level
        const { data: levelData } = await supabase
          .from('level_config')
          .select('*')
          .or(`level.eq.${stats.level},level.eq.${stats.level + 1}`)
          .order('level');
        
        if (levelData && levelData.length > 0) {
          const currentLevel = levelData[0];
          const nextLevel = levelData[1];
          setLevelConfig({
            xp_required: currentLevel.xp_required,
            next_level_xp: nextLevel?.xp_required
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const fetchAchievements = async () => {
    try {
      const achievementsData = await getAchievements();
      if (achievementsData && Array.isArray(achievementsData)) {
        // Split achievements into earned and unearned
        const earned = achievementsData
          .filter(achievement => achievement.earned)
          .map(achievement => ({
            id: achievement.id,
            achievement: {
              id: achievement.id,
              name: achievement.name,
              description: achievement.description,
              icon_name: achievement.icon_name,
              xp_reward: achievement.xp_reward,
              requirement_type: achievement.requirement_type,
              requirement_value: achievement.requirement_value,
              progress: achievement.progress
            },
            earned_at: achievement.earned_at,
            progress: achievement.progress
          }));

        const all = achievementsData.map(achievement => ({
          id: achievement.id,
          achievement: {
            id: achievement.id,
            name: achievement.name,
            description: achievement.description,
            icon_name: achievement.icon_name,
            xp_reward: achievement.xp_reward,
            requirement_type: achievement.requirement_type,
            requirement_value: achievement.requirement_value,
            progress: achievement.progress
          },
          earned_at: achievement.earned_at,
          progress: achievement.progress
        }));

        setAchievements(earned);
        setAllAchievements(all);
      } else {
        setAchievements([]);
        setAllAchievements([]);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
      setAchievements([]);
      setAllAchievements([]);
    }
  };

  const fetchLanguageProgress = async () => {
    try {
      if (!user?.id) return;
      const progressData = await getLanguageProgress(user.id);
      if (progressData) {
        setLanguageProgress(progressData);
      }
    } catch (error) {
      console.error('Error fetching language progress:', error);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          username: editForm.username,
          full_name: editForm.full_name,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      await fetchUserProfile();
      
      // Fade out edit form
      Animated.timing(formFadeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true
      }).start(() => {
        setIsEditingProfile(false);
        // Fade in main view
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true
        }).start();
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPress = () => {
    // First animate the button press
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.95,
        duration: 50,
        useNativeDriver: true
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true
      })
    ]).start();

    // Fade out current view
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true
    }).start(() => {
      setIsEditingProfile(true);
      // Fade in edit form
      Animated.timing(formFadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true
      }).start();
    });
  };

  const handleCancelEdit = () => {
    // Fade out edit form
    Animated.timing(formFadeAnim, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true
    }).start(() => {
      setIsEditingProfile(false);
      setEditForm({
        username: userProfile.username || '',
        full_name: userProfile.full_name || ''
      });
      // Fade in main view
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true
      }).start();
    });
  };

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
    Animated.timing(expandAnimation, {
      toValue: isExpanded ? 0 : 1,
      duration: 300,
      useNativeDriver: true
    }).start();
  };

  const arrowRotation = expandAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });

  const handleAchievementPress = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
    Animated.sequence([
      Animated.timing(cardScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(cardScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <BlurView intensity={20} style={styles.blurContainer}>
              {!isEditingProfile ? (
                <Animated.View style={[styles.profileInfo, { opacity: fadeAnim }]}>
                  <View style={styles.avatarContainer}>
                    <LinearGradient
                      colors={[colors.gradientStart, colors.gradientEnd]}
                      style={styles.avatarGradient}
                    >
                      <Text style={[styles.avatarText, { color: '#fff' }]}>
                        {userProfile.full_name?.[0]?.toUpperCase() || userProfile.username?.[0]?.toUpperCase() || '?'}
                      </Text>
                    </LinearGradient>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={handleEditPress}
                    >
                      <LinearGradient
                        colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                        style={styles.editButtonGradient}
                      >
                        <MaterialCommunityIcons name="pencil" size={20} color="#fff" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.userName, { color: 'white' }]}>
                    {userProfile.full_name || userProfile.username || 'User'}
                  </Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: 'white' }]}>{userStats.level}</Text>
                      <Text style={[styles.statLabel, { color: 'white' }]}>Level</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: 'white' }]}>{userStats.total_xp}</Text>
                      <Text style={[styles.statLabel, { color: 'white' }]}>Total XP</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: 'white' }]}>{userStats.current_streak}</Text>
                      <Text style={[styles.statLabel, { color: 'white' }]}>Day Streak</Text>
                    </View>
                  </View>
                </Animated.View>
              ) : (
                <Animated.View style={[styles.editForm, { opacity: formFadeAnim }]}>
                  <Text style={[styles.editTitle, { color: 'white' }]}>Edit Profile</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={editForm.full_name}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, full_name: text }))}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Username"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={editForm.username}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, username: text }))}
                  />
                  <View style={styles.editButtons}>
                    <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
                      <Text style={[styles.buttonText, { color: 'white' }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveButton} onPress={handleUpdateProfile}>
                      <Text style={[styles.buttonText, { color: 'white' }]}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              )}
            </BlurView>
          </LinearGradient>
        </View>

        {/* Level Progress */}
        <View style={[styles.levelProgressContainer,{backgroundColor: colors.surface}]}>
          <View style={styles.levelProgressHeader}>
            <Text style={[styles.levelProgressTitle, { color: colors.text }]}>
              Level {userStats.level}
            </Text>
            <Text style={[styles.levelProgressXP, { color: colors.textSecondary }]}>
              {userStats.total_xp % (levelConfig?.xp_required || 1000)}/{levelConfig?.next_level_xp || 1000} XP
            </Text>
          </View>
          <View style={styles.levelProgressBar}>
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.levelProgressFill,
                { width: `${(userStats.total_xp % (levelConfig?.xp_required || 1000)) / (levelConfig?.next_level_xp || 1000) * 100}%` }
              ]}
            />
          </View>
        </View>

        {/* Language Progress */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Language Progress</Text>
          </View>
          <View style={[styles.languageCards]}>
            {languageProgress.map((progress) => (
              <LinearGradient
                key={progress.language}
                colors={[colors.surface, colors.surface]}
                style={styles.languageCard}
              >
                <View style={styles.languageCardHeader}>
                  <Text style={[styles.languageTitle, { color: colors.text }]}>{progress.language}</Text>
                  <Text style={[styles.lessonCount, { color: colors.textSecondary }]}>
                    {progress.completedLessons}/{progress.totalLessons} lessons
                  </Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <LinearGradient
                    colors={[colors.gradientStart, colors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.progressBarFill,
                      { width: `${progress.progressPercentage}%` }
                    ]}
                  />
                </View>
                <Text style={[styles.progressPercentage, { color: colors.textSecondary }]}>
                  {Math.round(progress.progressPercentage)}% Complete
                </Text>
              </LinearGradient>
            ))}
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Achievements</Text>
            <TouchableOpacity 
              style={styles.toggleButton}
              onPress={() => setShowAllAchievements(!showAllAchievements)}
            >
              <Text style={[styles.toggleButtonText, { color: colors.text }]}>
                {showAllAchievements ? 'Show Earned' : 'See All'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.achievementsScroll}
          >
            {(showAllAchievements ? allAchievements : achievements).map((achievement) => (
              <TouchableOpacity
                key={achievement.id}
                activeOpacity={0.9}
                onPress={() => handleAchievementPress(achievement)}
              >
                <Animated.View style={[
                  { transform: [{ scale: cardScale }] }
                ]}>
                  <LinearGradient
                    colors={achievement.earned_at ? colors.cardBackground : colors.cardBackgroundInactive}
                    style={[
                      styles.achievementCard,
                      !achievement.earned_at && styles.unachievedCard,
                      selectedAchievement?.id === achievement.id && styles.selectedCard,
                      { borderColor: colors.secondary }
                    ]}
                  >
                    <LinearGradient
                      colors={achievement.earned_at ? [colors.gradientStart, colors.gradientEnd] : ['#666', '#444']}
                      style={styles.achievementIconContainer}
                    >
                      <MaterialCommunityIcons 
                        name={achievement?.achievement?.icon_name || 'trophy'} 
                        size={24} 
                        color={achievement.earned_at ? '#fff' : 'rgba(255,255,255,0.7)'} 
                      />
                    </LinearGradient>
                    <Text style={[
                      styles.achievementName,
                      !achievement.earned_at && styles.unachievedText,
                      { color: colors.text }
                    ]}>
                      {achievement?.achievement?.name || 'Achievement'}
                    </Text>
                    <Text style={[
                      styles.achievementDescription,
                      !achievement.earned_at && styles.unachievedText,
                      { color: colors.textSecondary }
                    ]} numberOfLines={2}>
                      {achievement?.achievement?.description || 'Complete tasks to earn this achievement'}
                    </Text>
                    {!achievement.earned_at && (
                      <View style={styles.achievementProgress}>
                        <View style={styles.progressBarContainer}>
                          <LinearGradient
                            colors={[colors.gradientStart, colors.gradientEnd]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[
                              styles.progressBarFill,
                              { width: `${achievement.progress}%` }
                            ]}
                          />
                        </View>
                        <Text style={[styles.achievementProgressText, { color: colors.textSecondary }]}>
                          {achievement.progress}% Complete
                        </Text>
                      </View>
                    )}
                    <Text style={[
                      styles.achievementXP,
                      !achievement.earned_at && styles.unachievedText,
                      { color: colors.text }
                    ]}>
                      +{achievement?.achievement?.xp_reward || 0} XP
                    </Text>
                    <Text style={[
                      styles.achievementDate,
                      !achievement.earned_at && styles.unachievedText,
                      { color: colors.textSecondary }
                    ]}>
                      {achievement.earned_at 
                        ? new Date(achievement.earned_at).toLocaleDateString()
                        : `${achievement?.achievement?.requirement_value} ${achievement?.achievement?.requirement_type.replace(/_/g, ' ')}`
                      }
                    </Text>
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <TouchableOpacity
          style={[styles.themeToggle, { backgroundColor: colors.surface }]}
          onPress={toggleTheme}
        >
          <MaterialCommunityIcons 
            name={theme === 'dark' ? 'weather-sunny' : 'weather-night'} 
            size={24} 
            color={colors.text} 
          />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    width: '100%',
    overflow: 'hidden',
  },
  headerGradient: {
    padding: 20,
  },
  blurContainer: {
    padding: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  profileInfo: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: -10,
    backgroundColor: 'transparent',
  },
  editButtonGradient: {
    padding: 8,
    borderRadius: 15,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  editForm: {
    width: '100%',
  },
  editTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    color: '#fff',
    fontSize: 16,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FF0080',
    padding: 15,
    borderRadius: 10,
    marginLeft: 10,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  levelProgressContainer: {
    margin: 20,
    borderRadius: 15,
    padding: 15,
  },
  levelProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  levelProgressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  levelProgressXP: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  levelProgressBar: {
    height: 8,
    backgroundColor: 'lightgray',
    borderRadius: 4,
    overflow: 'hidden',
  },
  levelProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  sectionContainer: {
    margin: 20,
    marginTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  toggleButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  toggleButtonText: {
    color: '#FF0080',
    fontSize: 14,
    fontWeight: '600',
  },
  languageCards: {
    gap: 15,
  },
  languageCard: {
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
  },
  languageCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  languageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  lessonCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'lightgray',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercentage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  achievementsScroll: {
    paddingVertical: 10,
    paddingRight: 20,
  },
  achievementCard: {
    width: 250,
    padding: 15,
    borderRadius: 15,
    marginRight: 15,
  },
  unachievedCard: {
    opacity: 0.7,
  },
  achievementIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  achievementDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
    lineHeight: 20,
  },
  achievementProgress: {
    marginBottom: 12,
  },
  achievementProgressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'right',
    marginTop: 4,
  },
  achievementXP: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
  },
  achievementDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  unachievedText: {
    opacity: 0.5,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#FF0080',
  },
  signOutButton: {
    margin: 20,
    marginTop: 10,
    overflow: 'hidden',
    borderRadius: 25,
  },
  signOutGradient: {
    padding: 15,
    alignItems: 'center',
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  themeToggle: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 10,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default ProfileScreen;
