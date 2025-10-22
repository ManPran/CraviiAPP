import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { User } from '../App';

interface ProfileScreenProps {
  user: User;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ user }) => {
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => {
          // Handle logout logic here
          console.log('User logged out');
        }},
      ]
    );
  };

  const settingsItems = [
    {
      icon: 'restaurant-menu',
      title: 'Dietary Preferences',
      description: 'Update your food preferences and restrictions',
      onPress: () => console.log('Dietary preferences'),
    },
    {
      icon: 'notifications',
      title: 'Notifications',
      description: 'Manage your notification settings',
      onPress: () => console.log('Notifications'),
    },
    {
      icon: 'language',
      title: 'Language',
      description: 'Change app language',
      onPress: () => console.log('Language'),
    },
    {
      icon: 'help',
      title: 'Help & Support',
      description: 'Get help or contact support',
      onPress: () => console.log('Help'),
    },
    {
      icon: 'info',
      title: 'About',
      description: 'App version and information',
      onPress: () => console.log('About'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* User Info */}
        <View style={styles.userSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.email.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userEmail}>{user.email}</Text>
          <Text style={styles.userStatus}>Active Cook</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Recipes Saved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Meals Cooked</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Ingredients Used</Text>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.settingsContainer}>
          <Text style={styles.sectionTitle}>Settings</Text>
          {settingsItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.settingItem}
              onPress={item.onPress}
            >
              <Icon name={item.icon} size={24} color="#DC2626" />
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{item.title}</Text>
                <Text style={styles.settingDescription}>{item.description}</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Icon name="logout" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>Cravii Mobile v1.0.0</Text>
          <Text style={styles.copyright}>© 2025 Cravii. All rights reserved.</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  userSection: {
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 30,
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  userEmail: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e9ecef',
    marginHorizontal: 10,
  },
  settingsContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
    gap: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  logoutContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  appInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  appVersion: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  copyright: {
    fontSize: 12,
    color: '#999',
  },
});

export default ProfileScreen;