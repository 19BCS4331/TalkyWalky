import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { textToSpeech } from './speech';

const DOWNLOADS_DIR = `${FileSystem.documentDirectory}downloads/`;
const DOWNLOADS_INFO_KEY = 'downloads_info';

export interface LessonContent {
  id: string;
  title: string;
  phrases: Array<{
    original: string;
    translation: string;
  }>;
}

interface DownloadInfo {
  lessonId: string;
  title: string;
  downloadDate: string;
  size: number;
}

// Initialize downloads directory
export async function initializeDownloads() {
  try {
    const dirInfo = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true });
    }
  } catch (error) {
    console.error('Error initializing downloads directory:', error);
    throw new Error('Failed to initialize downloads directory');
  }
}

// Get all downloaded lessons info
export async function getDownloadedLessons(): Promise<DownloadInfo[]> {
  try {
    const info = await AsyncStorage.getItem(DOWNLOADS_INFO_KEY);
    return info ? JSON.parse(info) : [];
  } catch (error) {
    console.error('Error getting downloads info:', error);
    return [];
  }
}

// Check if a lesson is downloaded
export async function isLessonDownloaded(lessonId: string): Promise<boolean> {
  try {
    if (!lessonId) return false;
    
    const downloads = await getDownloadedLessons();
    return downloads.some(d => d.lessonId === lessonId);
  } catch (error) {
    console.error('Error checking lesson download status:', error);
    return false;
  }
}

// Download a lesson and its audio
export async function downloadLesson(lesson: LessonContent): Promise<void> {
  if (!lesson || !lesson.id) {
    throw new Error('Invalid lesson data');
  }

  try {
    await initializeDownloads();

    // Create lesson directory
    const lessonDir = `${DOWNLOADS_DIR}${lesson.id}/`;
    await FileSystem.makeDirectoryAsync(lessonDir, { intermediates: true });

    // Download and save audio for each phrase
    const audioPromises = lesson.phrases.map(async (phrase, index) => {
      try {
        const audioUri = await textToSpeech({
          text: phrase.original,
          language: 'es', // TODO: Make this dynamic based on lesson language
        });

        if (!audioUri) {
          throw new Error('Failed to generate audio');
        }

        // Convert data URI to base64
        const base64Data = audioUri.split(',')[1];
        const audioPath = `${lessonDir}phrase_${index}.mp3`;
        await FileSystem.writeAsStringAsync(audioPath, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        return audioPath;
      } catch (error) {
        console.error(`Error downloading audio for phrase ${index}:`, error);
        throw error;
      }
    });

    // Save lesson content
    const contentPath = `${lessonDir}content.json`;
    await FileSystem.writeAsStringAsync(
      contentPath,
      JSON.stringify(lesson),
      { encoding: FileSystem.EncodingType.UTF8 }
    );

    // Wait for all audio downloads to complete
    await Promise.all(audioPromises);

    // Calculate total size
    const dirInfo = await FileSystem.getInfoAsync(lessonDir, { size: true });
    const size = dirInfo.size || 0;

    // Update downloads info
    const downloads = await getDownloadedLessons();
    const existingIndex = downloads.findIndex(d => d.lessonId === lesson.id);
    
    const downloadInfo: DownloadInfo = {
      lessonId: lesson.id,
      title: lesson.title,
      downloadDate: new Date().toISOString(),
      size,
    };

    if (existingIndex >= 0) {
      downloads[existingIndex] = downloadInfo;
    } else {
      downloads.push(downloadInfo);
    }

    await AsyncStorage.setItem(DOWNLOADS_INFO_KEY, JSON.stringify(downloads));

  } catch (error) {
    console.error('Error downloading lesson:', error);
    // Clean up any partially downloaded files
    try {
      await FileSystem.deleteAsync(`${DOWNLOADS_DIR}${lesson.id}/`, { idempotent: true });
    } catch (cleanupError) {
      console.error('Error cleaning up failed download:', cleanupError);
    }
    throw new Error('Failed to download lesson');
  }
}

// Delete a downloaded lesson
export async function deleteDownloadedLesson(lessonId: string): Promise<void> {
  if (!lessonId) {
    throw new Error('Invalid lesson ID');
  }

  try {
    const lessonDir = `${DOWNLOADS_DIR}${lessonId}/`;
    await FileSystem.deleteAsync(lessonDir, { idempotent: true });

    // Update downloads info
    const downloads = await getDownloadedLessons();
    const updatedDownloads = downloads.filter(d => d.lessonId !== lessonId);
    await AsyncStorage.setItem(DOWNLOADS_INFO_KEY, JSON.stringify(updatedDownloads));

  } catch (error) {
    console.error('Error deleting lesson:', error);
    throw new Error('Failed to delete lesson');
  }
}

// Get downloaded lesson content
export async function getDownloadedLessonContent(lessonId: string): Promise<LessonContent | null> {
  if (!lessonId) return null;

  try {
    const contentPath = `${DOWNLOADS_DIR}${lessonId}/content.json`;
    const contentInfo = await FileSystem.getInfoAsync(contentPath);
    
    if (!contentInfo.exists) {
      return null;
    }

    const content = await FileSystem.readAsStringAsync(contentPath);
    return JSON.parse(content);
  } catch (error) {
    console.error('Error getting lesson content:', error);
    return null;
  }
}

// Get audio URI for a downloaded phrase
export async function getDownloadedPhraseAudio(lessonId: string, phraseIndex: number): Promise<string | null> {
  if (!lessonId || phraseIndex < 0) return null;

  try {
    const audioPath = `${DOWNLOADS_DIR}${lessonId}/phrase_${phraseIndex}.mp3`;
    const audioInfo = await FileSystem.getInfoAsync(audioPath);
    
    if (!audioInfo.exists) {
      return null;
    }

    const base64Audio = await FileSystem.readAsStringAsync(audioPath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:audio/mpeg;base64,${base64Audio}`;
  } catch (error) {
    console.error('Error getting phrase audio:', error);
    return null;
  }
}

// Calculate total size of downloads
export async function getDownloadsTotalSize(): Promise<number> {
  try {
    const downloads = await getDownloadedLessons();
    return downloads.reduce((total, download) => total + (download.size || 0), 0);
  } catch (error) {
    console.error('Error calculating total size:', error);
    return 0;
  }
}

// Clear all downloads
export async function clearAllDownloads(): Promise<void> {
  try {
    await FileSystem.deleteAsync(DOWNLOADS_DIR, { idempotent: true });
    await AsyncStorage.removeItem(DOWNLOADS_INFO_KEY);
    await initializeDownloads();
  } catch (error) {
    console.error('Error clearing downloads:', error);
    throw new Error('Failed to clear downloads');
  }
}
