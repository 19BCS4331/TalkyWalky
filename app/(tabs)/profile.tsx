import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProgress, getLanguageStats } from '../../services/progress';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import { MotiView } from 'moti';
import { useFocusEffect } from '@react-navigation/native';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';
import { Animated, Easing } from 'react-native';

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

  const scaleValue = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const statsScaleAnim = useRef(new Animated.Value(0.97)).current;
  const formFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadProgress();
    fetchUserProfile();
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Reset animation key when screen comes into focus
      setAnimationKey(prev => prev + 1);
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
                    <Animated.View 
                      style={[
                        styles.avatarContainer,
                        { transform: [{ scale: scaleValue }] }
                      ]}
                    >
                      <LinearGradient
                        colors={['#FF0080', '#7928CA']}
                        style={styles.avatarGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={styles.avatarText}>
                          {userProfile.full_name 
                            ? userProfile.full_name.charAt(0).toUpperCase()
                            : user?.email?.charAt(0).toUpperCase()}
                        </Text>
                      </LinearGradient>
                    </Animated.View>

                    <View style={styles.profileInfo}>
                      <Text style={styles.profileName}>
                        {userProfile.full_name || 'Add your name'}
                      </Text>
                      <Text style={styles.profileUsername}>
                        {userProfile.username ? `@${userProfile.username}` : user?.email}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statsContainer}>
                    <Animated.View 
                      style={[
                        styles.statsRow,
                        { 
                          transform: [{ scale: statsScaleAnim }],
                          opacity: fadeAnim
                        }
                      ]}
                    >
                      <View style={styles.statItem}>
                        <Text style={styles.profileStatValue}>0</Text>
                        <Text style={styles.profileStatLabel}>Streak</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={styles.profileStatValue}>0</Text>
                        <Text style={styles.profileStatLabel}>XP</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={styles.profileStatValue}>0</Text>
                        <Text style={styles.profileStatLabel}>Level</Text>
                      </View>
                    </Animated.View>
                  </View>
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
          {/* Stats Overview */}
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: 200 }}
            style={styles.statsOverview}
          >
            <View style={styles.statCard}>
              <Ionicons name="book-outline" size={24} color="#6441A5" />
              <Text style={styles.statValue}>{progress?.totalLessonsCompleted || 0}</Text>
              <Text style={styles.statLabel}>Lessons</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="time-outline" size={24} color="#6441A5" />
              <Text style={styles.statValue}>{formatTime(languageStats?.totalTimeSpent || 0)}</Text>
              <Text style={styles.statLabel}>Time</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="trending-up-outline" size={24} color="#6441A5" />
              <Text style={styles.statValue}>{progress?.longestStreak || 0}</Text>
              <Text style={styles.statLabel}>Best Streak</Text>
            </View>
          </MotiView>

          {/* Progress Circle */}
          {selectedLanguage && languageStats && (
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', delay: 400 }}
              style={styles.progressSection}
            >
              <Text style={styles.sectionTitle}>Language Mastery</Text>
              <View style={styles.progressCircle}>
                <AnimatedCircularProgress
                  size={200}
                  width={15}
                  fill={languageStats.averageScore}
                  tintColor="#6441A5"
                  backgroundColor="rgba(100, 65, 165, 0.1)"
                  rotation={0}
                  lineCap="round"
                  duration={1500}
                >
                  {(fill) => (
                    <View style={styles.progressContent}>
                      <Text style={styles.progressValue}>{Math.round(fill)}%</Text>
                      <Text style={styles.progressLabel}>Proficiency</Text>
                    </View>
                  )}
                </AnimatedCircularProgress>
              </View>
            </MotiView>
          )}

          {/* Achievements */}
          <View style={styles.achievementsSection}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.achievementsContainer}
            >
              {[
                { icon: '🎯', title: 'First Steps', desc: 'First lesson completed', unlocked: true },
                { icon: '🔥', title: 'Streak Master', desc: '7 day streak', unlocked: progress?.currentStreak >= 7 },
                { icon: '⭐', title: 'Perfect Score', desc: 'Get 100% in a lesson', unlocked: false },
                { icon: '🏆', title: 'Champion', desc: 'Complete all lessons', unlocked: false },
              ].map((achievement, index) => (
                <MotiView
                  key={index}
                  from={{ opacity: 0, scale: 0.8, translateX: 20 }}
                  animate={{ opacity: 1, scale: 1, translateX: 0 }}
                  transition={{
                    type: 'spring',
                    delay: 600 + index * 100,
                    damping: 15,
                  }}
                  style={styles.achievementCard}
                >
                  <LinearGradient
                    colors={achievement.unlocked ? ['#6441A5', '#2a0845'] : ['#9e9e9e', '#616161']}
                    style={styles.achievementGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                    <Text style={styles.achievementTitle}>{achievement.title}</Text>
                    <Text style={styles.achievementDesc}>{achievement.desc}</Text>
                  </LinearGradient>
                </MotiView>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity
            style={styles.signOutButton}
            onPress={signOut}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
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
    paddingTop: 10
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
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  profileUsername: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  statsContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 16,
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
  profileStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  profileStatLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    fontWeight: '600',
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
    paddingRight: 20,
  },
  achievementCard: {
    width: width * 0.4,
    height: 150,
    marginRight: 15,
    borderRadius: 20,
    overflow: 'hidden',
  },
  achievementGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
    textAlign: 'center',
  },
  achievementDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
 
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  editActionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
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
});

export default ProfileScreen;
