import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import DiaryScreen from '../screens/DiaryScreen'
import PhotoLogScreen from '../screens/PhotoLogScreen'
import ManualLogScreen from '../screens/ManualLogScreen'
import ProfileScreen from '../screens/ProfileScreen'
import { colors } from '../theme/colors'

export type MainTabParamList = {
    Diary: undefined
    'Photo Log': undefined
    'Manual Log': undefined
    Profile: undefined
}

const Tab = createBottomTabNavigator<MainTabParamList>()

export default function MainTabs() {
    return (
        <Tab.Navigator screenOptions={{
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
          }}>
            <Tab.Screen name="Diary" component={DiaryScreen} />
            <Tab.Screen name="Photo Log" component={PhotoLogScreen} />
            <Tab.Screen name="Manual Log" component={ManualLogScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    )
}