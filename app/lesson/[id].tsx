import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  Alert,
  TextInput,
  Animated
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import LottieView from 'lottie-react-native';
import { getLessonById, updateUserProgress, getLanguageById } from '@/services/database';
import { getAchievements, getUserStats } from '@/services/gamification';
import { supabase } from '@/lib/supabase';
import { textToSpeech } from '@/services/speech';
import LessonComplete from '@/app/components/LessonComplete';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';

interface ExerciseOption {
  id?: string;
  option_text: string;
}

export default function LessonScreen() {
  const params = useLocalSearchParams();
  const lessonId = params.id as string;
  const languageCode = params.languageCode as string;
  const languageName = params.languageName as string;
  const { height: tabBarHeight } = useTabBarHeight();

  const [lesson, setLesson] = useState<any>(null);
  const [language, setLanguage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [currentExercise, setCurrentExercise] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [mode, setMode] = useState<'phrases' | 'exercises'>('phrases');
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [showXPAnimation, setShowXPAnimation] = useState(false);
  const [showAchievementAnimation, setShowAchievementAnimation] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const [newAchievements, setNewAchievements] = useState<any[]>([]);
  const [currentAchievementIndex, setCurrentAchievementIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const xpAnimationRef = useRef<LottieView>(null);
  const achievementAnimationRef = useRef<LottieView>(null);
  const [xpSound, setXPSound] = useState<Audio.Sound | null>(null);
  const [achievementSound, setAchievementSound] = useState<Audio.Sound | null>(null);
  const animationScale = useState(new Animated.Value(1));
  const [achievementOpacity] = useState(new Animated.Value(0));

  useEffect(() => {
    loadLesson();
    loadSounds();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      unloadSounds();
    };
  }, [lessonId]);

  useEffect(() => {
    if (showAchievementAnimation && newAchievements && newAchievements.length > 0) {
      Animated.timing(achievementOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      achievementOpacity.setValue(0);
    }
  }, [showAchievementAnimation]);

  useEffect(() => {
    if (showAchievementAnimation) {
      const scale = 1 + (currentAchievementIndex * 0.3); // Increase scale by 0.3 for each achievement
      Animated.spring(animationScale[0], {
        toValue: scale,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      animationScale[0].setValue(1);
    }
  }, [currentAchievementIndex, showAchievementAnimation]);

  useEffect(() => {
    // Reset achievement-related states when there are no achievements
    if (!newAchievements || newAchievements.length === 0) {
      setShowAchievementAnimation(false);
      setCurrentAchievementIndex(0);
      if (achievementAnimationRef.current) {
        achievementAnimationRef.current.reset();
      }
    }
  }, [newAchievements]);

  const loadLesson = async () => {
    try {
      setLoading(true);
      const lessonData = await getLessonById(lessonId);
      setLesson(lessonData);

      // Get language colors
      const languageData = await getLanguageById(languageCode);
      setLanguage(languageData);

      setLoading(false);
    } catch (error) {
      console.error('Error loading lesson:', error);
      setLoading(false);
    }
  };

  const loadSounds = async () => {
    try {
      const xpSoundObject = new Audio.Sound();
      await xpSoundObject.loadAsync(require('@/assets/sounds/xp-gain.mp3'));
      setXPSound(xpSoundObject);

      const achievementSoundObject = new Audio.Sound();
      await achievementSoundObject.loadAsync(require('@/assets/sounds/achievement-unlock.mp3'));
      setAchievementSound(achievementSoundObject);
    } catch (error) {
      console.error('Error loading sounds:', error);
    }
  };

  const unloadSounds = async () => {
    try {
      if (xpSound) {
        await xpSound.unloadAsync();
      }
      if (achievementSound) {
        await achievementSound.unloadAsync();
      }
    } catch (error) {
      console.error('Error unloading sounds:', error);
    }
  };

  const playAudio = async (text: string) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      // Generate audio using ElevenLabs
      const audioUri = await textToSpeech({
        text,
        language: languageCode
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      await newSound.playAsync();
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const handleAnswerSelect = (answer: string) => {
    if (!isAnswerChecked) {
      setSelectedAnswer(answer);
    }
  };

  const checkAnswer = () => {
    const currentEx = lesson?.exercises?.[currentExercise];
    if (!currentEx || selectedAnswer === null) return;

    const isCorrect = selectedAnswer === currentEx.correct_answer;
    setIsAnswerCorrect(isCorrect);
    setIsAnswerChecked(true);
    
    if (isCorrect) {
      playCorrectSound();
    } else {
      playIncorrectSound();
    }
  };

  const playCorrectSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/correct.mp3')
      );
      await sound.playAsync();
    } catch (error) {
      console.error('Error playing correct sound:', error);
    }
  };

  const playIncorrectSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/incorrect.mp3')
      );
      await sound.playAsync();
    } catch (error) {
      console.error('Error playing incorrect sound:', error);
    }
  };

  const handleNext = async () => {
    if (mode === 'phrases') {
      if (currentPhrase < (lesson?.phrases?.length || 0) - 1) {
        setCurrentPhrase(prev => prev + 1);
        setShowTranslation(false);
        scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: true });
      } else if (lesson?.exercises?.length) {
        setMode('exercises');
        setCurrentPhrase(0);
      } else {
        // No exercises available, complete the lesson
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await updateUserProgress(user.id, lessonId, true, 100);
            
            // Get previous stats for comparison
            const prevStats = await getUserStats();
            
            // Ensure user has stats record
            const { data: userStats } = await supabase
              .from('user_stats')
              .select('id')
              .eq('id', user.id)
              .single();

            if (!userStats) {
              await supabase
                .from('user_stats')
                .insert({ id: user.id });
            }

            // Get updated stats and achievements
            const newStats = await getUserStats();
            const achievements = await getAchievements();
            
            // Calculate XP gained
            const xpGained = (newStats?.total_xp || 0) - (prevStats?.total_xp || 0);
            setEarnedXP(xpGained);

            // Find newly unlocked achievements
            const newlyUnlocked = achievements?.filter(a => 
              a.earned && 
              new Date(a.earned_at).getTime() > new Date(prevStats?.updated_at || 0).getTime()
            ) || [];
            setNewAchievements(newlyUnlocked);

            // Show XP animation first, then achievements if any
            if (xpGained > 0) {
              setShowXPAnimation(true);
              playXPSound();
              if (xpAnimationRef.current) {
                xpAnimationRef.current.play();
              }
            } else if (newlyUnlocked.length > 0) {
              setShowAchievementAnimation(true);
              playAchievementSound();
              if (achievementAnimationRef.current) {
                achievementAnimationRef.current.play();
              }
            } else {
              setShowComplete(true);
            }
          }
        } catch (error) {
          console.error('Error updating progress:', error);
          Alert.alert('Error', 'Failed to save progress');
        }
      }
    } else {
      if (selectedAnswer === null) {
        Alert.alert('Please select an answer');
        return;
      }

      if (!isAnswerChecked) {
        checkAnswer();
        return;
      }

      // Update score if answer is correct
      if (isAnswerCorrect) {
        setScore(prev => prev + 1);
      }

      if (currentExercise < (lesson?.exercises?.length || 0) - 1) {
        setCurrentExercise(prev => prev + 1);
        setSelectedAnswer(null);
        setIsAnswerChecked(false);
        setIsAnswerCorrect(false);
      } else {
        // Calculate final score after the last exercise
        const newScore = score + (isAnswerCorrect ? 1 : 0);
        const finalScore = Math.round((newScore / lesson?.exercises?.length) * 100);
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Get previous stats for comparison
            const prevStats = await getUserStats();
            
            await updateUserProgress(user.id, lessonId, true, finalScore);
            
            // Ensure user has stats record
            const { data: userStats } = await supabase
              .from('user_stats')
              .select('id')
              .eq('id', user.id)
              .single();

            if (!userStats) {
              await supabase
                .from('user_stats')
                .insert({ id: user.id });
            }

            // Get updated stats and achievements
            const newStats = await getUserStats();
            const achievements = await getAchievements();
            
            // Calculate XP gained
            const xpGained = (newStats?.total_xp || 0) - (prevStats?.total_xp || 0);
            setEarnedXP(xpGained);

            // Find newly unlocked achievements
            const newlyUnlocked = achievements?.filter(a => 
              a.earned && 
              new Date(a.earned_at).getTime() > new Date(prevStats?.updated_at || 0).getTime()
            ) || [];
            setNewAchievements(newlyUnlocked);

            setScore(newScore); // Update score state after the last question

            // Show XP animation first, then achievements if any
            if (xpGained > 0) {
              setShowXPAnimation(true);
              playXPSound();
              if (xpAnimationRef.current) {
                xpAnimationRef.current.play();
              }
            } else if (newlyUnlocked.length > 0) {
              setShowAchievementAnimation(true);
              playAchievementSound();
              if (achievementAnimationRef.current) {
                achievementAnimationRef.current.play();
              }
            } else {
              setShowComplete(true);
            }
          }
        } catch (error) {
          console.error('Error updating progress:', error);
          Alert.alert('Error', 'Failed to save progress');
        }
      }
    }
  };

  const handlePrevious = () => {
    if (currentPhrase > 0) {
      setCurrentPhrase(prev => prev - 1);
      setShowTranslation(false);
      scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: true });
    }
  };

  const getFeedbackMessage = (score: number) => {
    if (score === 100) return "Perfect! You're a natural! 🌟";
    if (score >= 80) return "Great job! Keep up the good work! 👏";
    if (score >= 60) return "Good effort! Practice makes perfect! 💪";
    return "Keep practicing! You'll get better! 🎯";
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      <View style={styles.headerContent}>
        <Text style={styles.languageName}>{languageName}</Text>
        <Text style={styles.lessonTitle}>{lesson?.title}</Text>
      </View>
    </View>
  );

  const renderProgress = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressInfo}>
        <Text style={styles.progressText}>
          {mode === 'phrases' 
            ? `Phrase ${currentPhrase + 1} of ${lesson?.phrases?.length}`
            : `Exercise ${currentExercise + 1} of ${lesson?.exercises?.length}`
          }
        </Text>
        <Text style={styles.modeText}>{mode === 'phrases' ? 'Learning' : 'Practice'}</Text>
      </View>
      <View style={styles.progressBar}>
        <LinearGradient
          colors={[language?.color_primary || '#4CAF50', language?.color_secondary || '#81C784']}
          style={[
            styles.progressFill,
            {
              width: `${mode === 'phrases' 
                ? ((currentPhrase + 1) / lesson?.phrases?.length) * 100
                : ((currentExercise + 1) / lesson?.exercises?.length) * 100
              }%`
            }
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </View>
    </View>
  );

  const renderPhrase = () => {
    if (!lesson?.phrases?.length) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No phrases available for this lesson</Text>
        </View>
      );
    }

    const phrase = lesson.phrases[currentPhrase];
    if (!phrase) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading phrase</Text>
        </View>
      );
    }

    return (
      <View style={styles.phraseContainer}>
        <TouchableOpacity 
          style={styles.phraseTextContainer} 
          onPress={() => playAudio(phrase.original_text)}
          activeOpacity={0.7}
        >
          <Text style={styles.phraseText}>{phrase.original_text}</Text>
        </TouchableOpacity>
        {showTranslation && (
          <Text style={styles.translationText}>{phrase.translated_text}</Text>
        )}
        {phrase.pronunciation && (
          <Text style={styles.pronunciationText}>{phrase.pronunciation}</Text>
        )}
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.audioButton}
            onPress={() => playAudio(phrase.original_text)}
          >
            <LinearGradient
              colors={[language?.color_primary || '#2196F3', language?.color_secondary || '#64B5F6']}
              style={styles.audioButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="volume-high" size={24} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.translationButton}
            onPress={() => setShowTranslation(!showTranslation)}
          >
            <LinearGradient
              colors={[language?.color_primary || '#9C27B0', language?.color_secondary || '#BA68C8']}
              style={styles.translationButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.translationButtonText}>
                {showTranslation ? 'Hide Translation' : 'Show Translation'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderExercise = () => {
    if (!lesson?.exercises?.length) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No exercises available for this lesson</Text>
        </View>
      );
    }

    const exercise = lesson.exercises[currentExercise];
    if (!exercise) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading exercise</Text>
        </View>
      );
    }

    return (
      <View style={styles.exerciseContainer}>
        <Text style={styles.questionText}>{exercise.question}</Text>
        {exercise.type === 'translation' ? (
          <TextInput
            style={styles.inputField}
            onChangeText={setSelectedAnswer}
            value={selectedAnswer || ''}
            placeholder="Type your answer here"
          />
        ) : (
          <View style={styles.optionsContainer}>
            {exercise.options?.map((option: ExerciseOption, index: number) => {
              const isSelected = selectedAnswer === option.option_text;
              const isCorrect = isAnswerChecked && option.option_text === exercise.correct_answer;
              const isWrong = isAnswerChecked && isSelected && !isCorrect;

              return (
                <TouchableOpacity
                  key={option.id || index}
                  style={[
                    styles.optionButton,
                    isSelected && !isAnswerChecked && { borderColor: '#2196F3' },
                    isAnswerChecked && {
                      borderColor: isCorrect ? '#4CAF50' : '#f44336',
                      backgroundColor: isCorrect ? '#4CAF5020' : '#f4433620',
                    },
                  ]}
                  onPress={() => handleAnswerSelect(option.option_text)}
                  disabled={isAnswerChecked}
                >
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && !isAnswerChecked && { color: '#2196F3' },
                      isAnswerChecked && {
                        color: isCorrect ? '#4CAF50' : '#f44336',
                      },
                    ]}
                  >
                    {option.option_text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        {isAnswerChecked && (
          <View style={styles.feedbackContainer}>
            <Text style={[
              styles.feedbackText,
              isAnswerCorrect ? styles.correctFeedback : styles.incorrectFeedback
            ]}>
              {isAnswerCorrect ? 
                "Correct! Well done! 🎉" : 
                `Incorrect. The correct answer is: ${exercise.correct_answer}`
              }
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderXPAnimation = () => (
    <View style={StyleSheet.absoluteFill}>
      <View style={styles.modalContainer}>
        <View style={styles.xpAnimationContainer}>
          <LottieView
            ref={xpAnimationRef}
            source={require('@/assets/animations/xp-gain.json')}
            autoPlay={true}
            speed={2}
            loop={false}
            style={styles.xpAnimation}
            onAnimationFinish={() => {
              setShowXPAnimation(false);
              if (newAchievements && newAchievements.length > 0) {
                // Ensure previous states are cleared
                achievementAnimationRef.current?.reset();
                setCurrentAchievementIndex(0);
                
                // Delay showing achievement
                setTimeout(() => {
                  setShowAchievementAnimation(true);
                  playAchievementSound();
                  if (achievementAnimationRef.current) {
                    achievementAnimationRef.current.play();
                  }
                }, 100);
              } else {
                setShowComplete(true);
              }
            }}
          />
          <Text style={styles.xpText}>+{earnedXP} XP</Text>
        </View>
      </View>
    </View>
  );

  const renderAchievementAnimation = () => {
    if (!showAchievementAnimation || !newAchievements?.length) return null;

    return (
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[
          styles.modalContainer,
          { opacity: achievementOpacity }
        ]}>
          <Animated.View style={[
            styles.achievementAnimationContainer,
            {
              transform: [{ scale: animationScale[0] }]
            }
          ]}>
            <LottieView
              ref={achievementAnimationRef}
              source={require('@/assets/animations/achievement-unlock.json')}
              autoPlay={true}
              loop={false}
              style={styles.achievementAnimation}
              onAnimationFinish={() => {
                if (currentAchievementIndex < newAchievements.length - 1) {
                  setCurrentAchievementIndex(prev => prev + 1);
                  playAchievementSound();
                  if (achievementAnimationRef.current) {
                    achievementAnimationRef.current.reset();
                    achievementAnimationRef.current.play();
                  }
                } else {
                  setShowAchievementAnimation(false);
                  setShowComplete(true);
                }
              }}
            />
            <View style={styles.achievementContent}>
              <Text style={styles.achievementTitle}>Achievement Unlocked!</Text>
              <Text style={styles.achievementName}>{newAchievements[currentAchievementIndex]?.name}</Text>
              <Text style={styles.achievementXP}>+{newAchievements[currentAchievementIndex]?.xp_reward} XP</Text>
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    );
  };

  const playXPSound = async () => {
    try {
      if (xpSound) {
        await xpSound.replayAsync();
      }
    } catch (error) {
      console.error('Error playing XP sound:', error);
    }
  };

  const playAchievementSound = async () => {
    try {
      if (achievementSound) {
        await achievementSound.replayAsync();
      }
    } catch (error) {
      console.error('Error playing achievement sound:', error);
    }
  };

  if (loading || !lesson) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (showComplete) {
    return (
      <LessonComplete
        score={Math.round((score / (lesson?.exercises?.length || 1)) * 100)}
        languageName={languageName}
        lessonTitle={lesson?.title || ''}
        totalExercises={lesson?.exercises?.length || 0}
        correctAnswers={score}
        onClose={() => router.back()}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderProgress()}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: tabBarHeight }]}
        showsVerticalScrollIndicator={false}
        ref={scrollViewRef}
      >
        {mode === 'phrases' ? renderPhrase() : renderExercise()}
      </ScrollView>
      <View style={styles.buttonContainer}>
        {mode === 'phrases' && (
          <TouchableOpacity
            onPress={handlePrevious}
            disabled={currentPhrase === 0}
            style={styles.navigationButton}
          >
            <LinearGradient
              colors={[language?.color_primary || '#4CAF50', language?.color_secondary || '#81C784']}
              style={[
                styles.navigationButtonGradient,
                currentPhrase === 0 && styles.nextButtonDisabled
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.buttonContent}>
                <Ionicons 
                  name="arrow-back"
                  size={20}
                  color="#fff"
                  style={styles.buttonIcon}
                />
                <Text style={styles.navigationButtonText}>Previous</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={handleNext}
          disabled={mode === 'exercises' && selectedAnswer === null}
          style={styles.navigationButton}
        >
          <LinearGradient
            colors={[language?.color_primary || '#4CAF50', language?.color_secondary || '#81C784']}
            style={[
              styles.navigationButtonGradient,
              (mode === 'exercises' && selectedAnswer === null) && styles.nextButtonDisabled
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.navigationButtonText}>
                {mode === 'exercises' && !isAnswerChecked ? 'Check Answer' : 'Next'}
              </Text>
              <Ionicons 
                name={mode === 'exercises' && !isAnswerChecked ? "checkmark" : "arrow-forward"}
                size={20}
                color="#fff"
                style={styles.buttonIcon}
              />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      {showXPAnimation && renderXPAnimation()}
      {showAchievementAnimation && newAchievements?.length > 0 ? renderAchievementAnimation() : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  scrollView: {
    flex: 1,
    padding: 15,
  },
  contentContainer: {
    flexGrow: 1,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  languageName: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 4,
  },
  lessonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressContainer: {
    padding: 16,
    backgroundColor: '#2a2a2a',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    color: '#fff',
    fontSize: 14,
  },
  modeText: {
    color: '#aaa',
    fontSize: 14,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#404040',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  phraseContainer: {
    marginVertical: 16,
    width:'100%',
    alignSelf: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  phraseTextContainer: {
    alignSelf: 'flex-start',
  },
  phraseText: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 12,
    lineHeight: 32,
  },
  translationText: {
    fontSize: 18,
    color: '#aaa',
    marginTop: 12,
    lineHeight: 24,
  },
  pronunciationText: {
    fontSize: 16,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  audioButton: {
    flex: 1,
    marginRight: 12,
  },
  audioButtonGradient: {
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  translationButton: {
    flex: 2,
  },
  translationButtonGradient: {
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  translationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  navigationButton: {
    flex: 1,
    maxWidth: 200,
  },
  navigationButtonGradient: {
    borderRadius: 25,
    padding: 15,
  },
  navigationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    padding: 16,
    backgroundColor: '#2a2a2a',
  },
  nextButton: {
    width: '100%',
  },
  nextButtonGradient: {
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
  },
  exerciseContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    marginTop: 16,
  },
  questionText: {
    fontSize: 22,
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 30,
  },
  optionsContainer: {
    gap: 12,
    
  },
  optionButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#404040',
    borderRadius: 12,
    padding: 12,
  },
  optionGradient: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  selectedOption: {
    transform: [{ scale: 1.02 }],
  },
  selectedOptionText: {
    fontWeight: 'bold',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
  },
  optionIcon: {
    marginLeft: 8,
  },
  feedbackContainer: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
  },
  feedbackText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  correctFeedback: {
    color: '#81C784',
  },
  incorrectFeedback: {
    color: '#e57373',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  inputField: {
    width: '100%',
    height: 40,
    borderColor: '#404040',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    backgroundColor: '#2a2a2a',
  },
  modalContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  xpAnimationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 300,
    height: 300,
  },
  xpAnimation: {
    width: 300,
    height: 300,
  },
  xpText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  achievementAnimationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 250,
    height: 330, // Height includes space for text
  },
  achievementAnimation: {
    width: 250,
    height: 250,
  },
  achievementContent: {
    alignItems: 'center',
    marginTop: 10,
  },
  achievementTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  achievementName: {
    fontSize: 20,
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  achievementXP: {
    fontSize: 18,
    color: '#FFD700',
    marginTop: 4,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonIcon: {
    marginTop: 1, // Small adjustment to align with text
  },
});
