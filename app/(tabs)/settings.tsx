import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VoiceSettings from '../components/VoiceSettings';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { useScreenAnimation } from '@/hooks/useScreenAnimation';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { supabase } from '@/lib/supabase';

const SettingSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const SettingRow = ({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
}) => (
  <TouchableOpacity style={styles.settingRow} onPress={onPress}>
    <View style={styles.settingIcon}>
      <Ionicons name={icon as any} size={24} color="#6441A5" />
    </View>
    <View style={styles.settingContent}>
      <Text style={styles.settingTitle}>{title}</Text>
      {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={20} color="#999" />
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const router = useRouter();
  const { height: tabBarHeight } = useTabBarHeight();
  const appVersion = '1.0.0';
  const { animationKey } = useScreenAnimation();

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <MotiView
        key={animationKey}
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: 'timing',
          duration: 500,
          delay: 100,
        }}
        style={styles.content}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: tabBarHeight }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSubtitle}>Customize your learning experience</Text>
          </View>

          <SettingSection title="Voice & Audio">
            <Text style={styles.sectionDescription}>
              Choose your preferred voice for each language
            </Text>
            <VoiceSettings />
          </SettingSection>

          <SettingSection title="App Settings">
            <SettingRow
              icon="download-outline"
              title="Downloads"
              subtitle="Manage downloaded lessons"
              onPress={() => router.push('/downloads')}
            />
            <SettingRow
              icon="notifications-outline"
              title="Notifications"
              subtitle="Manage reminder preferences"
              onPress={() => {/* Handle notifications settings */}}
            />
            <SettingRow
              icon="color-palette-outline"
              title="Appearance"
              subtitle="Dark mode and theme settings"
              onPress={() => {/* Handle appearance settings */}}
            />
          </SettingSection>

          <SettingSection title="Account">
            <SettingRow
              icon="log-out-outline"
              title="Sign Out"
              subtitle="Log out of your account"
              onPress={signOut}
            />
          </SettingSection>

          <SettingSection title="Support">
            <SettingRow
              icon="help-circle-outline"
              title="Help Center"
              onPress={() => Linking.openURL('https://help.example.com')}
            />
            <SettingRow
              icon="mail-outline"
              title="Contact Support"
              onPress={() => Linking.openURL('mailto:support@example.com')}
            />
            <SettingRow
              icon="star-outline"
              title="Rate the App"
              onPress={() => {/* Handle app rating */}}
            />
          </SettingSection>

          <View style={styles.footer}>
            <Text style={styles.version}>Version {appVersion}</Text>
            <TouchableOpacity onPress={() => {/* Handle terms */}}>
              <Text style={styles.footerLink}>Terms of Service</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {/* Handle privacy */}}>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </MotiView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
  section: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
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
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0ebf7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  version: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  footerLink: {
    fontSize: 14,
    color: '#6441A5',
    marginVertical: 4,
    textDecorationLine: 'underline',
  },
});
