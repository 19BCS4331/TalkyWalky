import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { fonts } from '@/constants/fonts';

export default function SettingsScreen() {
  const { colors, theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const { height: tabBarHeight } = useTabBarHeight();

  useEffect(() => {
    // Debug font loading
    console.log('Current fonts:', {
      sectionTitle: fonts.semiBold,
      settingTitle: fonts.medium,
      settingSubtitle: fonts.regular,
    });
  }, []);

  const renderSettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    rightElement 
  }: { 
    icon: keyof typeof MaterialCommunityIcons.glyphMap; 
    title: string; 
    subtitle?: string; 
    onPress?: () => void;
    rightElement?: React.ReactNode;
  }) => (
    <TouchableOpacity
      style={[styles.settingItem, { backgroundColor: colors.surface }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingContent}>
        <View style={styles.settingLeft}>
          <MaterialCommunityIcons name={icon} size={24} color={colors.primary} />
          <View style={styles.settingText}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
            {subtitle && (
              <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
            )}
          </View>
        </View>
        {rightElement}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: tabBarHeight + 20 }
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
        {renderSettingItem({
          icon: theme === 'dark' ? 'weather-night' : 'weather-sunny',
          title: 'Dark Mode',
          subtitle: theme === 'dark' ? 'Currently using dark theme' : 'Currently using light theme',
          rightElement: (
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor={Platform.OS === 'ios' ? '#fff' : colors.surface}
              ios_backgroundColor="#3e3e3e"
            />
          ),
        })}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
        {renderSettingItem({
          icon: 'account',
          title: 'Account Settings',
          subtitle: 'Manage your account details',
          onPress: () => {},
        })}
        {renderSettingItem({
          icon: 'bell',
          title: 'Notifications',
          subtitle: 'Configure notification preferences',
          onPress: () => {},
        })}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Support</Text>
        {renderSettingItem({
          icon: 'help-circle',
          title: 'Help Center',
          subtitle: 'Get help with TalkyWalky',
          onPress: () => {},
        })}
        {renderSettingItem({
          icon: 'information',
          title: 'About',
          subtitle: 'Learn more about TalkyWalky',
          onPress: () => {},
        })}

        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: colors.error }]}
          onPress={signOut}
        >
          <MaterialCommunityIcons name="logout" size={20} color="#fff" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    marginTop: 25,
    marginBottom: 10,
    marginLeft: 10,
  },
  settingItem: {
    borderRadius: 12,
    marginBottom: 8,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 15,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: fonts.medium,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    marginTop: 2,
    opacity: 0.7,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 30,
    marginTop: 30,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.semiBold,
    marginLeft: 8,
    letterSpacing: 0.5,
  },
});
