import { View, Dimensions, PanResponder, Animated } from 'react-native';
import { ReactNode, useRef, useState, useEffect, memo } from 'react';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type ResizableModalProps = {
  children: ReactNode;
  snapPoints?: number[];
  defaultSnapPoint?: number;
  onSnapPointChange?: (snapPoint: number) => void;
  targetSnapPoint?: number; // Programmatically control snap point
  visible?: boolean;
};

function ResizableModalBase({
  children,
  snapPoints = [0.3, 0.6, 0.8],
  defaultSnapPoint = 0.6,
  onSnapPointChange,
  targetSnapPoint,
  visible = true,
}: ResizableModalProps) {
  const [currentSnapIndex, setCurrentSnapIndex] = useState(
    snapPoints.indexOf(defaultSnapPoint) !== -1 ? snapPoints.indexOf(defaultSnapPoint) : 1
  );
  const modalHeight = useRef(new Animated.Value(SCREEN_HEIGHT * snapPoints[currentSnapIndex])).current;
  const lastHeight = useRef(SCREEN_HEIGHT * snapPoints[currentSnapIndex]);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Slide in/out animation when visible changes
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : SCREEN_HEIGHT,
      useNativeDriver: false,
      damping: 20,
      stiffness: 200,
    }).start();
  }, [visible, slideAnim]);

  // Update last height when snap index changes
  useEffect(() => {
    lastHeight.current = SCREEN_HEIGHT * snapPoints[currentSnapIndex];
  }, [currentSnapIndex, snapPoints]);

  // Programmatically animate to target snap point
  useEffect(() => {
    if (targetSnapPoint !== undefined) {
      const targetIndex = snapPoints.indexOf(targetSnapPoint);
      if (targetIndex !== -1 && targetIndex !== currentSnapIndex) {
        const targetHeight = SCREEN_HEIGHT * snapPoints[targetIndex];
        lastHeight.current = targetHeight;
        setCurrentSnapIndex(targetIndex);
        onSnapPointChange?.(snapPoints[targetIndex]);

        Animated.spring(modalHeight, {
          toValue: targetHeight,
          useNativeDriver: false,
          damping: 20,
          stiffness: 200,
        }).start();
      }
    }
  }, [targetSnapPoint, snapPoints, currentSnapIndex, modalHeight, onSnapPointChange]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only handle vertical movements with a threshold
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        // Stop any ongoing animations
        modalHeight.stopAnimation(() => {
          modalHeight.setOffset(lastHeight.current);
          modalHeight.setValue(0);
        });
      },
      onPanResponderMove: (_, gestureState) => {
        const newHeight = -gestureState.dy;
        // Clamp the value to prevent going below minimum or above maximum
        const minHeight = SCREEN_HEIGHT * snapPoints[0];
        const maxHeight = SCREEN_HEIGHT * snapPoints[snapPoints.length - 1];
        const clampedHeight = Math.max(minHeight - lastHeight.current, Math.min(maxHeight - lastHeight.current, newHeight));
        modalHeight.setValue(clampedHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        modalHeight.flattenOffset();

        const currentHeight = lastHeight.current - gestureState.dy;
        const velocityThreshold = 0.5;
        const isSwipeUp = gestureState.vy < -velocityThreshold;
        const isSwipeDown = gestureState.vy > velocityThreshold;

        let targetSnapIndex = currentSnapIndex;

        if (isSwipeUp && currentSnapIndex < snapPoints.length - 1) {
          targetSnapIndex = currentSnapIndex + 1;
        } else if (isSwipeDown && currentSnapIndex > 0) {
          targetSnapIndex = currentSnapIndex - 1;
        } else {
          const distances = snapPoints.map((snap) =>
            Math.abs(currentHeight - SCREEN_HEIGHT * snap)
          );
          targetSnapIndex = distances.indexOf(Math.min(...distances));
        }

        const targetHeight = SCREEN_HEIGHT * snapPoints[targetSnapIndex];
        lastHeight.current = targetHeight;
        setCurrentSnapIndex(targetSnapIndex);
        onSnapPointChange?.(snapPoints[targetSnapIndex]);

        Animated.spring(modalHeight, {
          toValue: targetHeight,
          useNativeDriver: false,
          damping: 20,
          stiffness: 200,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: modalHeight,
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        transform: [{ translateY: slideAnim }],
      }}>
      {/* Drag handle */}
      <View
        {...panResponder.panHandlers}
        className="items-center justify-center py-6"
        hitSlop={{ top: 20, bottom: 20, left: 50, right: 50 }}>
        <View className="h-1 w-12 rounded-full bg-gray-300" />
      </View>

      {/* Content */}
      <View className="flex-1">{children}</View>
    </Animated.View>
  );
}

export const ResizableModal = memo(ResizableModalBase);
