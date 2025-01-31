import AsyncStorage from '@react-native-async-storage/async-storage';

interface LessonProgress {
  lessonId: string;
  completed: boolean;
  score: number;
  lastAttempted: string;
  timeSpent: number;
}

interface LanguageProgress {
  languageCode: string;
  lessonsCompleted: number;
  totalScore: number;
  streak: number;
  lastPracticed: string;
  lessonProgress: { [key: string]: LessonProgress };
}

interface UserProgress {
  totalLessonsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  lastActive: string;
  languages: { [key: string]: LanguageProgress };
  userInfo: {
    name: string;
    email: string;
    joinDate: string;
    avatar?: string;
    level: number;
    xp: number;
  };
}

const PROGRESS_KEY = '@user_progress';
const STREAK_THRESHOLD_HOURS = 36; // Allow for some flexibility in daily practice

export const initializeProgress = async (): Promise<void> => {
  try {
    const existingProgress = await AsyncStorage.getItem(PROGRESS_KEY);
    if (!existingProgress) {
      const initialProgress: UserProgress = {
        totalLessonsCompleted: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActive: new Date().toISOString(),
        languages: {},
        userInfo: {
          name: 'Language Learner',
          email: 'user@example.com',
          joinDate: new Date().toISOString(),
          level: 1,
          xp: 0,
        },
      };
      await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(initialProgress));
    }
  } catch (error) {
    console.error('Error initializing progress:', error);
  }
};

export const getProgress = async (): Promise<UserProgress | null> => {
  try {
    const progress = await AsyncStorage.getItem(PROGRESS_KEY);
    return progress ? JSON.parse(progress) : null;
  } catch (error) {
    console.error('Error getting progress:', error);
    return null;
  }
};

export const updateLessonProgress = async (
  languageCode: string,
  lessonId: string,
  score: number,
  timeSpent: number
): Promise<void> => {
  try {
    const progress = await getProgress();
    if (!progress) return;

    const now = new Date();
    const lastActiveDate = new Date(progress.lastActive);
    const hoursSinceLastActive = (now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60);

    // Update streak
    if (hoursSinceLastActive > STREAK_THRESHOLD_HOURS) {
      progress.currentStreak = 1;
    } else {
      progress.currentStreak += 1;
    }
    progress.longestStreak = Math.max(progress.longestStreak, progress.currentStreak);
    progress.lastActive = now.toISOString();

    // Initialize language progress if it doesn't exist
    if (!progress.languages[languageCode]) {
      progress.languages[languageCode] = {
        languageCode,
        lessonsCompleted: 0,
        totalScore: 0,
        streak: 0,
        lastPracticed: now.toISOString(),
        lessonProgress: {},
      };
    }

    const languageProgress = progress.languages[languageCode];
    const existingLesson = languageProgress.lessonProgress[lessonId];
    const isNewCompletion = !existingLesson?.completed && score >= 70;

    // Update language-specific progress
    languageProgress.lessonProgress[lessonId] = {
      lessonId,
      completed: score >= 70,
      score: Math.max(existingLesson?.score || 0, score),
      lastAttempted: now.toISOString(),
      timeSpent: (existingLesson?.timeSpent || 0) + timeSpent,
    };

    if (isNewCompletion) {
      languageProgress.lessonsCompleted += 1;
      progress.totalLessonsCompleted += 1;
    }

    languageProgress.totalScore = Object.values(languageProgress.lessonProgress)
      .reduce((sum, lesson) => sum + lesson.score, 0) / 
      Object.keys(languageProgress.lessonProgress).length;

    languageProgress.lastPracticed = now.toISOString();

    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Error updating lesson progress:', error);
  }
};

export const getLanguageStats = async (languageCode: string) => {
  try {
    const progress = await getProgress();
    if (!progress || !progress.languages[languageCode]) {
      return {
        lessonsCompleted: 0,
        averageScore: 0,
        totalTimeSpent: 0,
        streak: 0,
      };
    }

    const languageProgress = progress.languages[languageCode];
    const totalTimeSpent = Object.values(languageProgress.lessonProgress)
      .reduce((sum, lesson) => sum + lesson.timeSpent, 0);

    return {
      lessonsCompleted: languageProgress.lessonsCompleted,
      averageScore: languageProgress.totalScore,
      totalTimeSpent,
      streak: progress.currentStreak,
    };
  } catch (error) {
    console.error('Error getting language stats:', error);
    return null;
  }
};
