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
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProgress, getLanguageStats } from '../../services/progress';
import { getUserStats, getAchievements, getLanguageProgress } from '../../services/gamification';
import { useFocusEffect } from '@react-navigation/native';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

// Enable LayoutAnimation for Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

const ProfileScreen = () => {
  const { height: tabBarHeight } = useTabBarHeight();
  const { user, signOut } = useAuth();
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
  const [achievements, setAchievements] = useState<any[]>([]);
  const [allAchievements, setAllAchievements] = useState<any[]>([]);
  const [languageProgress, setLanguageProgress] = useState<any[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const expandAnimation = useRef(new Animated.Value(0)).current;

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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6441A5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
      >
        <View style={styles.header}>
          <LinearGradient
            colors={['#7928CA', '#FF0080']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <BlurView intensity={20} style={styles.blurContainer}>
              {!isEditingProfile ? (
                <Animated.View style={{ opacity: fadeAnim }}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={handleEditPress}
                  >
                    <LinearGradient
                      colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                      style={styles.editButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
                        <MaterialCommunityIcons name="pencil" size={20} color="rgba(255,255,255,0.9)" />
                      </Animated.View>
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                      <LinearGradient
                        colors={['#FF416C', '#FF4B2B']}
                        style={styles.avatarGradient}
                      >
                        <Text style={styles.avatarText}>
                          {userProfile.username ? userProfile.username[0].toUpperCase() : 'U'}
                        </Text>
                      </LinearGradient>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.username}>{userProfile.username || 'User'}</Text>
                      <Text style={styles.fullName}>{userProfile.full_name || ''}</Text>
                    </View>
                  </View>

                  <View style={styles.levelContainer}>
                    <View style={styles.levelHeader}>
                      <Text style={styles.levelText}>Level {userStats.level}</Text>
                      <Text style={styles.xpText}>{userStats.total_xp} XP</Text>
                    </View>
                    <LinearGradient
                      colors={['#FF416C', '#FF4B2B']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.xpBar}
                    >
                      <LinearGradient
                        style={[
                          styles.xpProgress, 
                          { 
                            width: levelConfig && levelConfig.next_level_xp
                              ? `${((userStats.total_xp - levelConfig.xp_required) / (levelConfig.next_level_xp - levelConfig.xp_required)) * 100}%` 
                              : '0%' 
                          }
                        ]} 
                        colors={['#4CAF50', '#8BC34A']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      />
                    </LinearGradient>
                    {levelConfig?.next_level_xp && (
                      <Text style={styles.xpToNext}>
                        {levelConfig.next_level_xp - userStats.total_xp} XP to next level
                      </Text>
                    )}
                  </View>

                  <View style={styles.streakContainer}>
                    <View style={styles.streakItem}>
                      <MaterialCommunityIcons name="fire" size={24} color="#FF416C" />
                      <Text style={styles.streakCount}>{userStats.current_streak}</Text>
                      <Text style={styles.streakLabel}>Day Streak</Text>
                    </View>
                    <View style={styles.streakItem}>
                      <MaterialCommunityIcons name="trophy" size={24} color="#FFD700" />
                      <Text style={styles.streakCount}>{userStats.longest_streak}</Text>
                      <Text style={styles.streakLabel}>Best Streak</Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={styles.expandButton} 
                    onPress={handleToggleExpand}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons 
                      name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                      size={24} 
                      color="#fff" 
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <Animated.View style={[
                      styles.collapsibleContent,
                      {
                        opacity: expandAnimation,
                        transform: [{
                          translateY: expandAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-20, 0]
                          })
                        }]
                      }
                    ]}>
                      <View style={styles.languageProgress}>
                        <Text style={styles.sectionTitle}>Language Progress</Text>
                        <View style={styles.languageProgressBars}>
                          {languageProgress.map((progress) => (
                            <View key={progress.language} style={styles.languageProgressBar}>
                              <View style={styles.languageProgressHeader}>
                                <Text style={styles.languageProgressBarTitle}>
                                  {progress.language}
                                </Text>
                                <Text style={styles.languageProgressBarStats}>
                                  {progress.completedLessons}/{progress.totalLessons} lessons
                                </Text>
                              </View>
                              <View style={styles.languageProgressBarFill}>
                                <View 
                                  style={[
                                    styles.languageProgressBarFillInner, 
                                    { width: `${progress.progressPercentage}%` }
                                  ]} 
                                />
                                <Text style={styles.progressPercentage}>
                                  {Math.round(progress.progressPercentage)}%
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>

                      <View style={styles.achievementsContainer}>
                        <View style={styles.sectionHeader}>
                          <Text style={[styles.sectionTitle, { color: 'white',marginBottom: 0 }]}>Achievements</Text>
                          <TouchableOpacity onPress={() => setShowAllAchievements(!showAllAchievements)}>
                            <Text style={styles.seeAllText}>{showAllAchievements ? 'Show Earned' : 'See All'}</Text>
                          </TouchableOpacity>
                        </View>
                        <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.achievementsScroll}
                        >
                          {(showAllAchievements ? allAchievements : achievements.slice(0, 5)).map((achievement) => (
                            <View key={achievement.id} style={[
                              styles.achievementItem,
                              !achievement.earned_at && styles.unachievedItem
                            ]}>
                              <LinearGradient
                                colors={achievement.earned_at ? ['#FF416C', '#FF4B2B'] : ['#666', '#444']}
                                style={styles.achievementIcon}
                              >
                                <MaterialCommunityIcons 
                                  name={achievement?.achievement?.icon_name || 'trophy'} 
                                  size={24} 
                                  color={achievement.earned_at ? '#fff' : 'rgba(255,255,255,0.7)'} 
                                />
                              </LinearGradient>
                              <Text style={[
                                styles.achievementName,
                                !achievement.earned_at && styles.unachievedText
                              ]}>
                                {achievement?.achievement?.name || 'Achievement'}
                              </Text>
                              <Text style={[
                                styles.achievementDescription,
                                !achievement.earned_at && styles.unachievedText
                              ]} numberOfLines={2}>
                                {achievement?.achievement?.description || 'Complete tasks to earn this achievement'}
                              </Text>
                              {!achievement.earned_at && (
                                <View style={styles.progressBar}>
                                  <View style={[styles.progressFill, { width: `${achievement.progress}%` }]} />
                                  <Text style={styles.progressText}>{achievement.progress}%</Text>
                                </View>
                              )}
                              <Text style={[
                                styles.achievementXP,
                                !achievement.earned_at && styles.unachievedXP
                              ]}>
                                +{achievement?.achievement?.xp_reward || 0} XP
                              </Text>
                              <Text style={styles.achievementDate}>
                                {achievement.earned_at 
                                  ? new Date(achievement.earned_at).toLocaleDateString()
                                  : `${achievement?.achievement?.requirement_value} ${achievement?.achievement?.requirement_type.replace(/_/g, ' ')}`
                                }
                              </Text>
                            </View>
                          ))}
                          {(showAllAchievements ? allAchievements : achievements).length === 0 && (
                            <View style={styles.noAchievements}>
                              <Text style={styles.noAchievementsText}>
                                Complete lessons to unlock achievements!
                              </Text>
                            </View>
                          )}
                        </ScrollView>
                      </View>
                    </Animated.View>
                  )}

                  

                 
                </Animated.View>
              ) : (
                <Animated.View 
                  style={[
                    styles.editForm,
                    { opacity: formFadeAnim }
                  ]}
                >
                  <View style={styles.editHeader}>
                    <Text style={styles.editTitle}>Edit Profile</Text>
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={handleCancelEdit}
                    >
                      <MaterialCommunityIcons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.formContainer}>
                    <View style={styles.editInputContainer}>
                      <Text style={styles.editLabel}>Full Name</Text>
                      <TextInput
                        style={styles.editInput}
                        value={editForm.full_name}
                        onChangeText={(text) => setEditForm(prev => ({ ...prev, full_name: text }))}
                        placeholder="Enter your full name"
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        autoCapitalize="words"
                      />
                    </View>

                    <View style={styles.editInputContainer}>
                      <Text style={styles.editLabel}>Username</Text>
                      <TextInput
                        style={styles.editInput}
                        value={editForm.username}
                        onChangeText={(text) => setEditForm(prev => ({ ...prev, username: text }))}
                        placeholder="Choose a username"
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        autoCapitalize="none"
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                      onPress={handleUpdateProfile}
                      disabled={isLoading}
                    >
                      <LinearGradient
                        colors={['#FF0080', '#7928CA']}
                        style={styles.saveButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        {isLoading ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.saveButtonText}>Save Changes</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              )}
            </BlurView>
          </LinearGradient>
        </View>

        <View style={styles.content}>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    width: '100%',
    marginBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    paddingTop: 10,
  
  },
  blurContainer: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  avatarContainer: {
    marginRight: 20,
  },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  fullName: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  editButton: {
    position: 'absolute',
    top: 30,
    right: 10,
    zIndex: 1,
  },
  editButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  editForm: {
    padding: 24,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  editTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  closeButton: {
    padding: 8,
  },
  formContainer: {
    width: '100%',
  },
  editInputContainer: {
    marginBottom: 20,
  },
  editLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
    fontWeight: '500',
  },
  editInput: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  saveButton: {
    overflow: 'hidden',
    borderRadius: 12,
    marginTop: 24,
  },
  saveButtonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  content: {
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  statsOverview: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    width: width / 3.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  progressSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  progressCircle: {
    alignItems: 'center',
  },
  progressContent: {
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#6441A5',
  },
  progressLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  achievementsSection: {
    marginBottom: 20,
  },
  achievementsContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
  },
  achievementsScroll: {
    paddingVertical: 15,
    paddingHorizontal: 5,
  },
  achievementItem: {
    width: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 15,
    marginRight: 15,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  achievementName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  achievementDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 10,
  },
  achievementXP: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  achievementDate: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 5,
  },
  noAchievements: {
    width: width - 60,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noAchievementsText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: 'pink',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelContainer: {
    alignSelf: 'center',
    width:'90%',
    marginTop: 20,
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  xpText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
  xpBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpProgress: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  streakContainer: {
    alignSelf: 'center',
    width:'90%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  streakItem: {
    alignItems: 'center',
  },
  streakCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 4,
  },
  streakLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  languageProgress: {
    alignSelf: 'center',
    width:'90%',
    marginTop: 24,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  languageProgressBars: {
    gap: 20,
  },
  languageProgressBar: {
    marginBottom: 4,
  },
  languageProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  languageProgressBarTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  languageProgressBarStats: {
    fontSize: 14,
    color: '#666666',
  },
  languageProgressBarFill: {
    height: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  languageProgressBarFillInner: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  progressPercentage: {
    position: 'absolute',
    right: 5,
    top:1,
    fontSize: 10,
    color: 'purple',
    fontWeight: '500',
  },
  signOutButton: {
    backgroundColor: '#f44336',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  xpToNext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginTop: 8,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    padding: 10,
  },
  expandText: {
    color: '#fff',
    marginRight: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  collapsibleContent: {
    overflow: 'hidden',
    marginTop: 20,
  },
  unachievedItem: {
    opacity: 0.8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  unachievedText: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  unachievedXP: {
    color: 'rgba(255, 215, 0, 0.5)',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    marginVertical: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF416C',
    borderRadius: 2,
  },
  progressText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default ProfileScreen;
