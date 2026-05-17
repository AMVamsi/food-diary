import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import DiaryScreen from '../screens/DiaryScreen';
import PhotoLogScreen from '../screens/PhotoLogScreen';
import ManualLogScreen from '../screens/ManualLogScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { colors } from '../theme/colors';

export type MainTabParamList = {
  Diary: undefined;
  'Photo Log': undefined;
  'Manual Log': undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.bgGradientStart,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '500',
          fontSize: 17,
        },
        tabBarStyle: {
          backgroundColor: colors.bgGradientStart,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.gradientEnd,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Diary"
        component={DiaryScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="book-open" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Photo Log"
        component={PhotoLogScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="camera" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Manual Log"
        component={ManualLogScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="edit-2" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
