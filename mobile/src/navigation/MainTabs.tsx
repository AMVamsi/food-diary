import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import DiaryScreen from '../screens/DiaryScreen'
import PhotoLogScreen from '../screens/PhotoLogScreen'
import ManualLogScreen from '../screens/ManualLogScreen'
import ProfileScreen from '../screens/ProfileScreen'

export type MainTabParamList = {
    Diary: undefined
    'Photo Log': undefined
    'Manual Log': undefined
    Profile: undefined
}

const Tab = createBottomTabNavigator<MainTabParamList>()

export default function MainTabs() {
    return (
        <Tab.Navigator screenOptions={{ headerShown: true }}>
            <Tab.Screen name="Diary" component={DiaryScreen} />
            <Tab.Screen name="Photo Log" component={PhotoLogScreen} />
            <Tab.Screen name="Manual Log" component={ManualLogScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    )
}