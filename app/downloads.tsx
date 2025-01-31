import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  getDownloadedLessons,
  deleteDownloadedLesson,
  clearAllDownloads,
  getDownloadsTotalSize,
} from '../services/downloads';

interface DownloadInfo {
  lessonId: string;
  title: string;
  downloadDate: string;
  size: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function DownloadsScreen() {
  const router = useRouter();
  const [downloads, setDownloads] = useState<DownloadInfo[]>([]);
  const [totalSize, setTotalSize] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDownloads();
  }, []);

  async function loadDownloads() {
    try {
      const downloadedLessons = await getDownloadedLessons();
      setDownloads(downloadedLessons || []);
      const total = await getDownloadsTotalSize();
      setTotalSize(total || 0);
    } catch (error) {
      console.error('Error loading downloads:', error);
      Alert.alert('Error', 'Failed to load downloads');
      setDownloads([]);
      setTotalSize(0);
    } finally {
      setIsLoading(false);
    }
  }

  const handleDeleteLesson = async (lessonId: string) => {
    if (!lessonId) return;
    
    Alert.alert(
      'Delete Lesson',
      'Are you sure you want to delete this downloaded lesson?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await deleteDownloadedLesson(lessonId);
              await loadDownloads();
            } catch (error) {
              console.error('Error deleting lesson:', error);
              Alert.alert('Error', 'Failed to delete lesson');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Downloads',
      'Are you sure you want to delete all downloaded lessons?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await clearAllDownloads();
              await loadDownloads();
            } catch (error) {
              console.error('Error clearing downloads:', error);
              Alert.alert('Error', 'Failed to clear downloads');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderDownloadItem = ({ item }: { item: DownloadInfo }) => {
    if (!item || !item.lessonId) return null;

    return (
      <View style={styles.downloadItem}>
        <View style={styles.downloadInfo}>
          <Text style={styles.downloadTitle}>{item.title || 'Untitled Lesson'}</Text>
          <Text style={styles.downloadDetails}>
            {formatBytes(item.size || 0)} • Downloaded {formatDate(item.downloadDate)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteLesson(item.lessonId)}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Downloads</Text>
          <Text style={styles.headerSubtitle}>
            {downloads.length} lessons • {formatBytes(totalSize)} used
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6441A5" />
        </View>
      ) : downloads.length > 0 ? (
        <>
          <FlatList
            data={downloads}
            renderItem={renderDownloadItem}
            keyExtractor={(item) => item?.lessonId?.toString() || Math.random().toString()}
            contentContainerStyle={styles.downloadsList}
          />
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearAll}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            <Text style={styles.clearButtonText}>Clear All Downloads</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="download-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No downloaded lessons</Text>
          <Text style={styles.emptySubtext}>
            Downloaded lessons will appear here for offline access
          </Text>
        </View>
      )}
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
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  downloadsList: {
    padding: 16,
  },
  downloadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  downloadInfo: {
    flex: 1,
  },
  downloadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  downloadDetails: {
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFF2F2',
    margin: 16,
    borderRadius: 12,
  },
  clearButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
