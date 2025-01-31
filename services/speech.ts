import * as FileSystem from 'expo-file-system';
import { Base64 } from 'js-base64';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://api.elevenlabs.io/v1';
const ELEVENLABS_API_KEY = Constants.expoConfig?.extra?.elevenLabsApiKey;

// Create a cache directory
const CACHE_DIR = `${FileSystem.cacheDirectory}audio_cache/`;
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB cache limit

interface SpeechOptions {
  text: string;
  language: string;
  voice?: string;
}

// Default voice IDs for different languages
const DEFAULT_VOICES = {
  'es': 'ErXwobaYiN019PkySvjV', // Antoni (Spanish male)
  'fr': 'ODq5zmih8GrVes37Dizd', // French male
  'de': 'IKne3meq5aSn9XLyUdCD', // German male
  'it': 'VR6AewLTigWG4xSOukaG', // Italian male
};

function sanitizeText(text: string): string {
  return text.trim();
}

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return Base64.btoa(binary);
}

// Initialize cache directory
async function initializeCache() {
  const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR);
  }
}

// Generate cache key for a text+language combination
async function generateCacheKey(text: string, language: string): Promise<string> {
  const data = `${text}-${language}`;
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data
  );
  return hash;
}

// Check cache size and clean if necessary
async function cleanCache() {
  try {
    const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
    let totalSize = 0;
    const fileInfos = await Promise.all(
      files.map(async (file) => {
        const fileInfo = await FileSystem.getInfoAsync(CACHE_DIR + file, { size: true });
        if (!fileInfo.exists) {
          return {
            uri: CACHE_DIR + file,
            size: 0,
            modifiedTime: 0
          };
        }
        return {
          uri: CACHE_DIR + file,
          size: fileInfo.size,
          modifiedTime: fileInfo.modificationTime || 0
        };
      })
    );

    // Sort by last modified (oldest first)
    fileInfos.sort((a, b) => a.modifiedTime - b.modifiedTime);

    // Calculate total size and remove old files if needed
    for (const fileInfo of fileInfos) {
      totalSize += fileInfo.size;
      if (totalSize > MAX_CACHE_SIZE) {
        await FileSystem.deleteAsync(fileInfo.uri);
      }
    }
  } catch (error) {
    console.error('Error cleaning cache:', error);
  }
}

// Get voice ID for a language, considering user preferences
async function getVoiceForLanguage(language: string): Promise<string> {
  try {
    const selectedVoices = await AsyncStorage.getItem('selectedVoices');
    if (selectedVoices) {
      const voices = JSON.parse(selectedVoices);
      if (voices[language.toLowerCase()]) {
        return voices[language.toLowerCase()];
      }
    }
  } catch (error) {
    console.error('Error getting voice preference:', error);
  }
  return DEFAULT_VOICES[language as keyof typeof DEFAULT_VOICES] || DEFAULT_VOICES['es'];
}

export async function textToSpeech({ text, language }: SpeechOptions): Promise<string> {
  try {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not found in environment variables');
    }

    // Initialize cache if needed
    await initializeCache();

    const sanitizedText = sanitizeText(text);
    const voiceId = await getVoiceForLanguage(language);
    
    // Check cache first
    const cacheKey = await generateCacheKey(sanitizedText, language);
    const cachedFilePath = `${CACHE_DIR}${cacheKey}.mp3`;
    const cachedFile = await FileSystem.getInfoAsync(cachedFilePath);

    if (cachedFile.exists) {
      // Return cached audio file
      return `data:audio/mpeg;base64,${await FileSystem.readAsStringAsync(cachedFilePath, { encoding: FileSystem.EncodingType.Base64 })}`;
    }

    // If not in cache, fetch from API
    const response = await fetch(
      `${API_BASE_URL}/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text: sanitizedText,
          model_id: 'eleven_multilingual_v2'
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    // Get the audio data as an array buffer
    const audioData = await response.arrayBuffer();
    const base64Audio = arrayBufferToBase64(audioData);

    // Save to cache
    await FileSystem.writeAsStringAsync(cachedFilePath, base64Audio, { encoding: FileSystem.EncodingType.Base64 });
    
    // Clean cache if needed
    await cleanCache();

    // Return as a data URI
    return `data:audio/mpeg;base64,${base64Audio}`;

  } catch (error) {
    console.error('Text-to-speech error:', error);
    // Fallback to test audio if anything fails
    return 'https://www.cs.uic.edu/~i101/SoundFiles/CantinaBand60.wav';
  }
}

// Helper function to get the voice ID for a language
export function getVoiceId(languageCode: string): string {
  return DEFAULT_VOICES[languageCode as keyof typeof DEFAULT_VOICES] || DEFAULT_VOICES['es'];
}
