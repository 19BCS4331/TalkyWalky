import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HapticTab } from '@/components/HapticTab';

const windowWidth = Dimensions.get('window').width;
const MARGIN = windowWidth * 0.025; // 5% margin on each side

export default function TabLayout() {
  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#6441A5',
          tabBarInactiveTintColor: '#666',
          tabBarButton: HapticTab,
          tabBarStyle: {
            position: 'absolute',
            bottom: 0,
            marginHorizontal: MARGIN,
            height: Platform.OS === 'ios' ? 85 : 65,
            backgroundColor: 'white',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            borderRadius: 0,
            borderTopWidth: 0,
            paddingBottom: Platform.OS === 'ios' ? 20 : 10,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: {
                  width: 0,
                  height: -4,
                },
                shadowOpacity: 0.1,
                shadowRadius: 8,
              },
              android: {
                elevation: 5,
              },
            }),
          },
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
