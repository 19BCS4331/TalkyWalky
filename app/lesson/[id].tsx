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
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { getLessonById, updateUserProgress, getLanguageById } from '@/services/database';
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
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadLesson();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [lessonId]);

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

            setShowComplete(true);
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
          }
          setScore(newScore); // Update score state after the last question
          setShowComplete(true);
        } catch (error) {
          console.error('Error updating progress:', error);
          Alert.alert('Error', 'Failed to save progress');
        }
      }
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
        <View style={styles.phraseCard}>
          <Text style={styles.phraseText}>{phrase.original_text}</Text>
          {showTranslation && (
            <Text style={styles.translationText}>{phrase.translated_text}</Text>
          )}
          {phrase.pronunciation && (
            <Text style={styles.pronunciationText}>{phrase.pronunciation}</Text>
          )}
        </View>
        
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
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          disabled={mode === 'exercises' && selectedAnswer === null}
        >
          <LinearGradient
            colors={[language?.color_primary || '#4CAF50', language?.color_secondary || '#81C784']}
            style={[styles.nextButtonGradient, (mode === 'exercises' && selectedAnswer === null) && styles.nextButtonDisabled]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.nextButtonText}>
              {mode === 'exercises' && !isAnswerChecked ? 'Check Answer' : 'Next'}
            </Text>
            <Ionicons 
              name={mode === 'exercises' && !isAnswerChecked ? "checkmark" : "arrow-forward"}
              size={20}
              color="#fff"
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
    width:'90%',
    alignSelf: 'center',
  },
  phraseCard: {
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
    borderRadius: 12,
    alignItems: 'center',
  },
  translationButton: {
    flex: 2,
  },
  translationButtonGradient: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  translationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
});
