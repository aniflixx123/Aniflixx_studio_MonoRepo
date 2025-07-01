import React from 'react';
import { View, StyleSheet } from 'react-native';

interface VideoProgressBarProps {
  progress: number;
  bottomOffset?: number;
  progressColor?: string; // Added color prop
}

const VideoProgressBar = ({ progress, bottomOffset = 0, progressColor = '#ff3366' }: VideoProgressBarProps) => {
  return (
    <View style={[styles.container, { bottom: bottomOffset }]}>
      <View style={styles.background}>
        <View 
          style={[
            styles.progress, 
            { width: `${progress}%`, backgroundColor: progressColor }
          ]} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 12,
  },
  background: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: 1.5,
  },
});

export default VideoProgressBar;