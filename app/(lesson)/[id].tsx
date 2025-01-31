import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { updateLessonProgress } from '../../services/progress';

const MOCK_LESSON_CONTENT = {
  '1': {
    title: 'Basic Greetings',
    content: [
      { type: 'text', content: 'Hello - Hola' },
      { type: 'text', content: 'Good morning - Buenos días' },
      { type: 'text', content: 'Good afternoon - Buenas tardes' },
      { type: 'text', content: 'Good evening - Buenas noches' },
      { type: 'text', content: 'Goodbye - Adiós' },
    ],
    exercises: [
      {
        question: 'How do you say "Hello" in Spanish?',
        options: ['Adiós', 'Hola', 'Buenos días', 'Gracias'],
        correctAnswer: 'Hola',
      },
      {
        question: 'What is "Good morning" in Spanish?',
        options: ['Buenas noches', 'Hola', 'Buenos días', 'Buenas tardes'],
        correctAnswer: 'Buenos días',
      },
    ],
  },
  // Add more lessons as needed
};

export default function LessonScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [currentExercise, setCurrentExercise] = useState(0);
  const [score, setScore] = useState(0);
  const [startTime] = useState(new Date());
  const [showExercises, setShowExercises] = useState(false);

  const lesson = MOCK_LESSON_CONTENT[id as keyof typeof MOCK_LESSON_CONTENT];
  const currentQuestion = lesson?.exercises[currentExercise];

  const handleAnswer = async (answer: string) => {
    if (answer === currentQuestion.correctAnswer) {
      setScore(score + 1);
    }

    if (currentExercise < lesson.exercises.length - 1) {
      setCurrentExercise(currentExercise + 1);
    } else {
      // Lesson completed
      const endTime = new Date();
      const timeSpent = Math.round((endTime.getTime() - startTime.getTime()) / 60000); // Convert to minutes
      const finalScore = Math.round((score / lesson.exercises.length) * 100);

      try {
        await updateLessonProgress('spanish', id as string, finalScore, timeSpent);
        Alert.alert(
          'Lesson Completed!',
          `You scored ${finalScore}%`,
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } catch (error) {
        console.error('Error updating progress:', error);
        Alert.alert('Error', 'Failed to save progress');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>{lesson?.title}</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {!showExercises ? (
          <>
            {lesson?.content.map((item, index) => (
              <View key={index} style={styles.lessonItem}>
                <Text style={styles.lessonText}>{item.content}</Text>
              </View>
            ))}
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => setShowExercises(true)}
            >
              <Text style={styles.startButtonText}>Start Exercises</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.exerciseContainer}>
            <Text style={styles.questionText}>{currentQuestion?.question}</Text>
            {currentQuestion?.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.optionButton}
                onPress={() => handleAnswer(option)}
              >
                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  lessonItem: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  lessonText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  startButton: {
    backgroundColor: '#6441A5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseContainer: {
    padding: 16,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
});
