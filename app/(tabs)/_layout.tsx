import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HapticTab } from '@/components/HapticTab';
import { useTheme } from '../../context/ThemeContext';
import { BlurView } from 'expo-blur';

const windowWidth = Dimensions.get('window').width;
const MARGIN = windowWidth * 0.025; // 5% margin on each side

export default function TabLayout() {
  const { colors, theme } = useTheme();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarButton: HapticTab,
          tabBarStyle: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            marginHorizontal: MARGIN,
            height: Platform.OS === 'ios' ? 85 : 65,
            backgroundColor: colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            borderRadius: 0,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingBottom: Platform.OS === 'ios' ? 20 : 10,
            elevation: 0,
            ...Platform.select({
              ios: {
                shadowColor: theme === 'dark' ? '#000' : '#666',
                shadowOffset: {
                  width: 0,
                  height: -4,
                },
                shadowOpacity: theme === 'dark' ? 0.5 : 0.1,
                shadowRadius: 8,
              },
              android: {
                elevation: 8,
                shadowColor: theme === 'dark' ? '#000' : '#666',
              },
            }),
          },
          tabBarBackground: () => (
            <BlurView
              tint={theme === 'dark' ? 'dark' : 'light'}
              intensity={theme === 'dark' ? 60 : 80}
              style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                overflow: 'hidden',
              }}
            />
          ),
          tabBarItemStyle: {
            padding: 6,
            height: Platform.OS === 'ios' ? 50 : 45,
          },
          tabBarIconStyle: {
            marginBottom: 4,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Languages',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
                <Ionicons 
                  name={focused ? "language" : "language-outline"} 
                  size={24} 
                  color={color}
                />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
                <Ionicons 
                  name={focused ? "person" : "person-outline"} 
                  size={24} 
                  color={color}
                />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
                <Ionicons 
                  name={focused ? "settings" : "settings-outline"} 
                  size={24} 
                  color={color}
                />
              </View>
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIconContainer: {
    backgroundColor: 'rgba(100, 65, 165, 0.1)',
  },
});
