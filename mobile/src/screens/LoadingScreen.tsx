import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';

const LoadingScreen: React.FC = () => {
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>🍳</Text>
          <Text style={styles.brandName}>Cravii</Text>
        </View>
        <Text style={styles.tagline}>
          Discover recipes with{'\n'}ingredients you have
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    fontSize: 60,
    marginBottom: 10,
  },
  brandName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default LoadingScreen;