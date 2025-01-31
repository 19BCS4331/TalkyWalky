import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface CircularProgressProps {
  percentage: number;
  radius?: number;
  strokeWidth?: number;
  duration?: number;
  color: string;
  textColor?: string;
  delay?: number;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  radius = 60,
  strokeWidth = 10,
  duration = 1500,
  color,
  textColor = '#FFFFFF',
  delay = 0,
}) => {
  const animated = new Animated.Value(0);
  const circleRef = React.useRef<any>();
  const [displayValue, setDisplayValue] = React.useState(0);
  
  const size = radius * 2;
  const circumference = 2 * Math.PI * (radius - strokeWidth / 2);

  useEffect(() => {
    animated.addListener((v) => {
      if (circleRef?.current) {
        const strokeDashoffset = circumference - (circumference * Math.min(v.value, 100)) / 100;
        circleRef.current.setNativeProps({
          strokeDashoffset,
        });
      }
      setDisplayValue(Math.round(v.value));
    });

    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(animated, {
        toValue: percentage,
        duration,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      animated.removeAllListeners();
    };
  }, [percentage]);

  return (
    <View style={styles.container}>
      <View style={[styles.circleContainer, { width: size, height: size }]}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Circle
            cx={radius}
            cy={radius}
            r={radius - strokeWidth / 2}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            opacity={0.2}
          />
          <Circle
            ref={circleRef}
            cx={radius}
            cy={radius}
            r={radius - strokeWidth / 2}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            strokeLinecap="round"
            transform={`rotate(-90 ${radius} ${radius})`}
          />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.textContainer]}>
          <Text style={[styles.text, { color: textColor }]}>
            {displayValue}%
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleContainer: {
    position: 'relative',
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default CircularProgress;
