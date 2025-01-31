import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Voice {
  id: string;
  name: string;
  language: string;
  gender: string;
  preview_url?: string;
}

const AVAILABLE_VOICES: Voice[] = [
  {
    id: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni',
    language: 'Spanish',
    gender: 'Male',
  },
  {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Sarah',
    language: 'Spanish',
    gender: 'Female',
  },
  {
    id: 'ODq5zmih8GrVes37Dizd',
    name: 'Jean',
    language: 'French',
    gender: 'Male',
  },
  {
    id: 'IKne3meq5aSn9XLyUdCD',
    name: 'Hans',
    language: 'German',
    gender: 'Male',
  },
  {
    id: 'VR6AewLTigWG4xSOukaG',
    name: 'Marco',
    language: 'Italian',
    gender: 'Male',
  },
];

export const VoiceSettings = () => {
  const [selectedVoices, setSelectedVoices] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    loadSelectedVoices();
  }, []);

  const loadSelectedVoices = async () => {
    try {
      const voices = await AsyncStorage.getItem('selectedVoices');
      if (voices) {
        setSelectedVoices(JSON.parse(voices));
      }
    } catch (error) {
      console.error('Error loading voice preferences:', error);
    }
  };

  const saveVoicePreference = async (language: string, voiceId: string) => {
    try {
      const newSelectedVoices = {
        ...selectedVoices,
        [language.toLowerCase()]: voiceId,
      };
      await AsyncStorage.setItem('selectedVoices', JSON.stringify(newSelectedVoices));
      setSelectedVoices(newSelectedVoices);
    } catch (error) {
      console.error('Error saving voice preference:', error);
    }
  };

  const groupedVoices = AVAILABLE_VOICES.reduce((acc, voice) => {
    const language = voice.language;
    if (!acc[language]) {
      acc[language] = [];
    }
    acc[language].push(voice);
    return acc;
  }, {} as Record<string, Voice[]>);

  return (
    <View style={styles.container}>
      {Object.entries(groupedVoices).map(([language, voices]) => (
        <View key={language} style={styles.languageSection}>
          <View style={styles.languageHeader}>
            <Ionicons name="language" size={20} color="#6441A5" />
            <Text style={styles.languageTitle}>{language}</Text>
          </View>
          <View style={styles.voiceList}>
            {voices.map((voice) => (
              <TouchableOpacity
                key={voice.id}
                style={[
                  styles.voiceItem,
                  selectedVoices[language.toLowerCase()] === voice.id && styles.selectedVoice,
                ]}
                onPress={() => saveVoicePreference(language, voice.id)}
              >
                <View style={styles.voiceContent}>
                  <View style={styles.voiceInfo}>
                    <Text style={styles.voiceName}>{voice.name}</Text>
                    <View style={styles.genderBadge}>
                      <Ionicons
                        name={voice.gender === 'Male' ? 'male' : 'female'}
                        size={12}
                        color="#6441A5"
                      />
                      <Text style={styles.genderText}>{voice.gender}</Text>
                    </View>
                  </View>
                  {selectedVoices[language.toLowerCase()] === voice.id && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark-circle" size={24} color="#6441A5" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  languageSection: {
    gap: 12,
  },
  languageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  voiceList: {
    gap: 8,
  },
  voiceItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  selectedVoice: {
    backgroundColor: '#f0ebf7',
    borderColor: '#6441A5',
  },
  voiceContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voiceInfo: {
    gap: 4,
  },
  voiceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  genderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0ebf7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  genderText: {
    fontSize: 12,
    color: '#6441A5',
    fontWeight: '500',
  },
  checkmark: {
    width: 24,
    height: 24,
  },
});

export default VoiceSettings;
