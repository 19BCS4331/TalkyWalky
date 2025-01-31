import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, { 
  FadeInDown, 
  FadeInUp,
  SlideInRight 
} from 'react-native-reanimated';
import CircularProgress from './CircularProgress';

interface LessonCompleteProps {
  score: number;
  languageName: string;
  lessonTitle: string;
  totalExercises: number;
  correctAnswers: number;
  onClose: () => void;
}

const getFeedbackMessage = (score: number) => {
  if (score === 100) return "Perfect! You're a natural! 🌟";
  if (score >= 80) return "Great job! Keep up the good work! 👏";
  if (score >= 60) return "Good effort! Practice makes perfect! 💪";
  return "Keep practicing! You'll get better! 🎯";
};

const getGradeColor = (score: number): readonly [string, string] => {
  if (score >= 90) return ['#4CAF50', '#81C784'] as const;
  if (score >= 70) return ['#FFA726', '#FFB74D'] as const;
  return ['#EF5350', '#E57373'] as const;
};

export default function LessonComplete({
  score,
  languageName,
  lessonTitle,
  totalExercises,
  correctAnswers,
  onClose
}: LessonCompleteProps) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#2a2a2a']}
        style={styles.background}
      >
        <Animated.View 
          entering={FadeInDown.delay(300)}
          style={styles.header}
        >
          <Image
            source={require('@/assets/images/trophy.png')}
            style={styles.trophyImage}
          />
          <Text style={styles.congratsText}>Lesson Complete!</Text>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(600)}
          style={styles.scoreContainer}
        >
          <CircularProgress
            percentage={score}
            color={getGradeColor(score)[0]}
            radius={60}
            strokeWidth={8}
            duration={1000}
            delay={400}
          />
          <Text style={styles.feedbackText}>{getFeedbackMessage(score)}</Text>
        </Animated.View>

        <Animated.View 
          entering={FadeInUp.delay(900)}
          style={styles.statsContainer}
        >
          <View style={styles.statRow}>
            <Ionicons name="book-outline" size={24} color="#aaa" />
            <Text style={styles.statText}>{lessonTitle}</Text>
          </View>
          <View style={styles.statRow}>
            <Ionicons name="language-outline" size={24} color="#aaa" />
            <Text style={styles.statText}>{languageName}</Text>
          </View>
          <View style={styles.statRow}>
            <Ionicons name="checkmark-circle-outline" size={24} color="#aaa" />
            <Text style={styles.statText}>{correctAnswers} of {totalExercises} correct</Text>
          </View>
        </Animated.View>

        <Animated.View 
          entering={SlideInRight.delay(1200)}
          style={styles.buttonContainer}
        >
          <TouchableOpacity
            style={styles.button}
            onPress={onClose}
          >
            <LinearGradient
              colors={['#2196F3', '#64B5F6']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.buttonText}>Back to Lessons</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  background: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  trophyImage: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  congratsText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  scoreContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  feedbackText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
  },
  statsContainer: {
    width: '100%',
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 40,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  statText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    width: '100%',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
