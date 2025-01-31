import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { textToSpeech } from '@/services/speech';
import { getLanguageById, getLessonById, Lesson, Phrase } from '@/services/database';
import { generateLesson, GeneratedLesson } from './ai';

const LESSONS_STORAGE_KEY = '@lessons';
const AUDIO_STORAGE_KEY = 'talkywalky_audio_mapping';

export type { GeneratedLesson as Lesson };

const LESSON_CATEGORIES = [
  { name: 'Greetings', level: 'Beginner', duration: '10 min' },
  { name: 'Numbers', level: 'Beginner', duration: '15 min' },
  { name: 'Food and Dining', level: 'Beginner', duration: '20 min' },
  { name: 'Travel', level: 'Intermediate', duration: '25 min' },
  { name: 'Business', level: 'Intermediate', duration: '30 min' },
  { name: 'Culture', level: 'Advanced', duration: '35 min' },
];

// export const getLessonById = async (lessonId: string): Promise<GeneratedLesson | null> => {
//   try {
//     // First check if lesson is downloaded
//     const downloadedLesson = await getDownloadedLesson(lessonId);
//     if (downloadedLesson) {
//       return downloadedLesson;
//     }
//     return null;
//   } catch (error) {
//     console.error('Error getting lesson:', error);
//     return null;
//   }
// };

export const getLanguageLessons = async (
  languageCode: string,
  languageName: string
): Promise<GeneratedLesson[]> => {
  try {
    // Check if lessons are cached
    const cachedLessons = await getCachedLessons(languageCode);
    if (cachedLessons && cachedLessons.length > 0) {
      return cachedLessons;
    }

    // Generate lessons sequentially to avoid rate limits
    const lessons: (GeneratedLesson | null)[] = [];
    for (const category of LESSON_CATEGORIES) {
      try {
        const lesson = await generateLesson(
          languageCode,
          languageName,
          category.level,
          category.name
        );
        lessons.push(lesson);
      } catch (error) {
        console.error(`Error generating lesson for ${category.name}:`, error);
        lessons.push(null);
      }
    }

    // Filter out failed lessons
    const validLessons = lessons.filter((lesson): lesson is GeneratedLesson => lesson !== null);

    // Cache the lessons
    if (validLessons.length > 0) {
      await cacheLessons(languageCode, validLessons);
    }

    return validLessons;
  } catch (error) {
    console.error('Error getting language lessons:', error);
    return [];
  }
};

const getCachedLessons = async (languageCode: string): Promise<GeneratedLesson[] | null> => {
  try {
    const storedLessons = await AsyncStorage.getItem(`${LESSONS_STORAGE_KEY}_${languageCode}`);
    if (!storedLessons) return null;

    const lessons = JSON.parse(storedLessons);
    return Array.isArray(lessons) ? lessons : null;
  } catch (error) {
    console.error('Error getting cached lessons:', error);
    return null;
  }
};

const cacheLessons = async (languageCode: string, lessons: GeneratedLesson[]): Promise<void> => {
  try {
    // Get existing lessons
    const existingLessons = await getCachedLessons(languageCode) || [];
    
    // Create a map of existing lessons by category
    const existingLessonsByCategory = new Map(
      existingLessons.map(lesson => [
        lesson.id.split('_')[1], // Get category from ID
        lesson
      ])
    );
    
    // Merge new lessons, replacing existing ones of the same category
    const mergedLessons = lessons.map(lesson => {
      const category = lesson.id.split('_')[1];
      existingLessonsByCategory.delete(category);
      return lesson;
    });
    
    // Add remaining existing lessons that weren't replaced
    mergedLessons.push(...Array.from(existingLessonsByCategory.values()));

    await AsyncStorage.setItem(
      `${LESSONS_STORAGE_KEY}_${languageCode}`,
      JSON.stringify(mergedLessons)
    );
  } catch (error) {
    console.error('Error caching lessons:', error);
  }
};

export const downloadLesson = async (lesson: GeneratedLesson): Promise<void> => {
  try {
    // Create lesson directory if it doesn't exist
    const lessonDir = `${FileSystem.documentDirectory}lessons/${lesson.id}`;
    await FileSystem.makeDirectoryAsync(lessonDir, { intermediates: true });

    // Save lesson data
    const storedLessons = await AsyncStorage.getItem(LESSONS_STORAGE_KEY);
    const lessons = storedLessons ? JSON.parse(storedLessons) : {};
    lessons[lesson.id] = lesson;
    await AsyncStorage.setItem(LESSONS_STORAGE_KEY, JSON.stringify(lessons));

    // Download audio for each phrase
    for (let i = 0; i < lesson.phrases.length; i++) {
      const phrase = lesson.phrases[i];
      await downloadPhraseAudio(lesson.id, lesson.languageCode, i, phrase.original);
    }
  } catch (error) {
    console.error('Error downloading lesson:', error);
    throw error;
  }
};

export const isLessonDownloaded = async (lessonId: string): Promise<boolean> => {
  try {
    const storedLessons = await AsyncStorage.getItem(LESSONS_STORAGE_KEY);
    if (!storedLessons) return false;

    const lessons = JSON.parse(storedLessons);
    return !!lessons[lessonId];
  } catch (error) {
    console.error('Error checking lesson download status:', error);
    return false;
  }
};

export const getDownloadedLesson = async (lessonId: string): Promise<GeneratedLesson | null> => {
  try {
    const storedLessons = await AsyncStorage.getItem(LESSONS_STORAGE_KEY);
    if (!storedLessons) return null;

    const lessons = JSON.parse(storedLessons);
    return lessons[lessonId] || null;
  } catch (error) {
    console.error('Error getting downloaded lesson:', error);
    return null;
  }
};

const downloadPhraseAudio = async (lessonId: string, languageCode: string, phraseIndex: number, text: string): Promise<string> => {
  try {
    // Check if audio file already exists
    const storedAudio = await AsyncStorage.getItem(AUDIO_STORAGE_KEY);
    const audioMap = storedAudio ? JSON.parse(storedAudio) : {};
    
    if (audioMap[lessonId]?.[phraseIndex]) {
      const existingPath = audioMap[lessonId][phraseIndex];
      const fileInfo = await FileSystem.getInfoAsync(existingPath);
      if (fileInfo.exists) {
        return existingPath;
      }
    }

    // Get the language for proper TTS
    const language = await getLanguageById(languageCode);
    if (!language) {
      throw new Error(`Language not found for code: ${languageCode}`);
    }

    // Generate audio using ElevenLabs
    const audioUri = await textToSpeech({ 
      text,
      language: languageCode
    });
    
    if (!audioUri) {
      throw new Error('Failed to generate audio');
    }

    // Create directory if it doesn't exist
    const audioDir = `${FileSystem.documentDirectory}lessons/${lessonId}/audio`;
    const dirInfo = await FileSystem.getInfoAsync(audioDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(audioDir, { intermediates: true });
    }

    // Extract base64 data from data URI
    const base64Data = audioUri.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid audio data format');
    }

    // Use a more unique filename to avoid conflicts
    const fileName = `phrase_${phraseIndex}_${Date.now()}.mp3`;
    const filePath = `${audioDir}/${fileName}`;

    // Save the audio file
    await FileSystem.writeAsStringAsync(filePath, base64Data, { encoding: FileSystem.EncodingType.Base64 });

    // Update audio mapping
    if (!audioMap[lessonId]) audioMap[lessonId] = {};
    audioMap[lessonId][phraseIndex] = filePath;
    await AsyncStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(audioMap));

    return filePath;
  } catch (error) {
    console.error('Error downloading phrase audio:', error);
    throw new Error(`Failed to download audio: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
  }
};

export const getDownloadedPhraseAudio = async (lessonId: string, phraseIndex: number): Promise<string | null> => {
  try {
    const storedAudio = await AsyncStorage.getItem(AUDIO_STORAGE_KEY);
    if (!storedAudio) return null;

    const audioMap = JSON.parse(storedAudio);
    return audioMap[lessonId]?.[phraseIndex] || null;
  } catch (error) {
    console.error('Error getting downloaded phrase audio:', error);
    return null;
  }
};