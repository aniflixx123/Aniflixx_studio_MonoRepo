import React from 'react';
import { StyleSheet, Text, TouchableOpacity, Animated, ViewStyle } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface ActionButtonProps {
  iconName: string;
  count?: number;
  onPress: () => void;
  scale?: Animated.Value;
  vertical?: boolean;
  customStyle?: ViewStyle;
  disabled?: boolean; // Added disabled prop
}

const ActionButton = ({ 
  iconName, 
  count, 
  onPress, 
  scale, 
  vertical = false,
  customStyle,
  disabled = false // Default to enabled
}: ActionButtonProps) => {
  const AnimatedIcon = Animated.createAnimatedComponent(Ionicons);
  
  // Helper function to format large numbers
  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };
  
  const handlePress = () => {
    if (!disabled) {
      onPress();
    }
  };
  
  if (vertical) {
    // Vertical layout (icon on top, count below)
    return (
      <TouchableOpacity 
        style={[styles.buttonVertical, customStyle]} 
        onPress={handlePress} 
        activeOpacity={disabled ? 1 : 0.7}
        disabled={disabled}
      >
        {scale ? (
          <Animated.View style={{ transform: [{ scale }] }}>
            <AnimatedIcon name={iconName} size={28} color={disabled ? "#999" : "#fff"} />
          </Animated.View>
        ) : (
          <Ionicons name={iconName} size={28} color={disabled ? "#999" : "#fff"} />
        )}
        {count !== undefined && (
          <Text style={[styles.countVertical, disabled && styles.disabledText]}>
            {formatCount(count)}
          </Text>
        )}
      </TouchableOpacity>
    );
  }
  
  // Horizontal layout (original)
  return (
    <TouchableOpacity 
      style={[styles.button, customStyle]} 
      onPress={handlePress} 
      activeOpacity={disabled ? 1 : 0.7}
      disabled={disabled}
    >
      {scale ? (
        <Animated.View style={{ transform: [{ scale }] }}>
          <AnimatedIcon name={iconName} size={26} color={disabled ? "#999" : "#fff"} />
        </Animated.View>
      ) : (
        <Ionicons name={iconName} size={26} color={disabled ? "#999" : "#fff"} />
      )}
      {count !== undefined && (
        <Text style={[styles.count, disabled && styles.disabledText]}>
          {formatCount(count)}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  count: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  buttonVertical: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  countVertical: {
    color: '#fff',
    fontSize: 12,
    marginTop: 3,
    fontWeight: '600',
  },
  disabledText: {
    color: '#999',
  }
});

export default ActionButton;