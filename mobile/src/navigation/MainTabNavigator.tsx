import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import RecipesScreen from '../screens/RecipesScreen';
import ProfileScreen from '../screens/ProfileScreen';

import { User, UserPreferences } from '../App';

const Tab = createBottomTabNavigator();

interface MainTabNavigatorProps {
  user: User;
  userPreferences: UserPreferences;
  onStartSwiping: () => void;
}

const MainTabNavigator: React.FC<MainTabNavigatorProps> = ({ 
  user, 
  userPreferences, 
  onStartSwiping 
}) => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Recipes') {
            iconName = 'restaurant';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          } else {
            iconName = 'circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#DC2626',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: styles.tabBar,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home">
        {() => (
          <HomeScreen 
            user={user}
            userPreferences={userPreferences}
            onStartSwiping={onStartSwiping}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Recipes">
        {() => <RecipesScreen user={user} />}
      </Tab.Screen>
      <Tab.Screen name="Profile">
        {() => <ProfileScreen user={user} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingBottom: 5,
    paddingTop: 5,
    height: 60,
  },
});

export default MainTabNavigator;