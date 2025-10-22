import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { User, UserPreferences } from '../App';

interface HomeScreenProps {
  user: User;
  userPreferences: UserPreferences;
  onStartSwiping: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ 
  user, 
  userPreferences, 
  onStartSwiping 
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getCurrentMeal = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'breakfast';
    if (hour < 16) return 'lunch';
    return 'dinner';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}!</Text>
            <Text style={styles.userName}>Ready to cook something delicious?</Text>
          </View>
          <View style={styles.logo}>
            <Text style={styles.logoEmoji}>🍳</Text>
          </View>
        </View>

        {/* Current Meal Suggestion */}
        <View style={styles.mealCard}>
          <Text style={styles.mealTitle}>Perfect for {getCurrentMeal()}</Text>
          <Text style={styles.mealDescription}>
            Let's find recipes with ingredients you already have
          </Text>
          <TouchableOpacity 
            style={styles.startButton}
            onPress={onStartSwiping}
          >
            <Icon name="restaurant" size={24} color="white" />
            <Text style={styles.startButtonText}>Start Swiping</Text>
          </TouchableOpacity>
        </View>

        {/* User Preferences */}
        <View style={styles.preferencesCard}>
          <Text style={styles.sectionTitle}>Your Preferences</Text>
          <View style={styles.preferencesGrid}>
            <View style={styles.preferenceItem}>
              <Icon name="schedule" size={20} color="#DC2626" />
              <Text style={styles.preferenceText}>{userPreferences.prepTime} min</Text>
            </View>
            <View style={styles.preferenceItem}>
              <Icon name="restaurant-menu" size={20} color="#DC2626" />
              <Text style={styles.preferenceText}>{userPreferences.course}</Text>
            </View>
            <View style={styles.preferenceItem}>
              <Icon name="local-dining" size={20} color="#DC2626" />
              <Text style={styles.preferenceText}>{userPreferences.taste}</Text>
            </View>
            <View style={styles.preferenceItem}>
              <Icon name="kitchen" size={20} color="#DC2626" />
              <Text style={styles.preferenceText}>{userPreferences.appliances.length} appliances</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={onStartSwiping}
            >
              <Icon name="swipe" size={30} color="#DC2626" />
              <Text style={styles.actionButtonText}>Swipe Ingredients</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Icon name="history" size={30} color="#DC2626" />
              <Text style={styles.actionButtonText}>Recent Recipes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Icon name="favorite" size={30} color="#DC2626" />
              <Text style={styles.actionButtonText}>Saved Recipes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Icon name="settings" size={30} color="#DC2626" />
              <Text style={styles.actionButtonText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.sectionTitle}>💡 Cooking Tip</Text>
          <Text style={styles.tipText}>
            Start with a main ingredient like chicken, beef, or tofu, then swipe through 
            complementary ingredients to build your perfect recipe!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  userName: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  logo: {
    width: 50,
    height: 50,
    backgroundColor: '#DC2626',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoEmoji: {
    fontSize: 24,
  },
  mealCard: {
    backgroundColor: '#DC2626',
    margin: 20,
    marginTop: 0,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  mealTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  mealDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 20,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'white',
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  preferencesCard: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  preferencesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
  },
  preferenceText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  quickActions: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionButtonText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  tipsCard: {
    backgroundColor: '#fff3cd',
    margin: 20,
    marginTop: 0,
    marginBottom: 40,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  tipText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
});

export default HomeScreen;