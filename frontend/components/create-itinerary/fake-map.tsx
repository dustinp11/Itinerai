import { MapPinComponent } from './map-pin';
import { View, Dimensions, ScrollView, Pressable, SafeAreaView } from 'react-native';
import { useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, Check } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Pin = {
  id: string;
  placeCount: number;
  isActive: boolean;
};

// disable add new if places havent been added yet
// issue with badges and places calculated when add additional places

type FakeMapProps = {
  pins: Pin[];
  onPinPress?: (pinId: string) => void;
  onAddNewPress?: () => void;
  centerOnLastPin?: boolean;
  onBack?: () => void;
  onDone?: () => void;
};

export function FakeMap({ pins, onPinPress, onAddNewPress, centerOnLastPin, onBack, onDone }: FakeMapProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const mapContentHeight = Math.max(SCREEN_HEIGHT * 2, (pins.length + 1));

  // Calculate zig-zag positions
  const getPinPosition = (index: number) => {
    const verticalSpacing = 200;
    const horizontalOffset = (index % 2 === 0 ? SCREEN_WIDTH * 0.3 : SCREEN_WIDTH * 0.6);

    return {
      top: 100 + index * verticalSpacing,
      left: horizontalOffset,
    };
  };

  // Calculate line path for connecting pins
  const getLinePath = (index: number) => {
    if (index === 0) return null;

    const currentPos = getPinPosition(index);
    const prevPos = getPinPosition(index - 1);

    return {
      top: prevPos.top + 20,
      left: prevPos.left,
      width: Math.abs(currentPos.left - prevPos.left),
      height: currentPos.top - prevPos.top - 20,
      direction: currentPos.left > prevPos.left ? 'right' : 'left',
    };
  };

  // Auto-scroll to the last pin (add new button) when centerOnLastPin is true
  useEffect(() => {
    if (centerOnLastPin && scrollViewRef.current) {
      const lastPinPos = getPinPosition(pins.length);
      const scrollToY = Math.max(0, lastPinPos.top - SCREEN_HEIGHT / 3);
      scrollViewRef.current?.scrollTo({ y: scrollToY, animated: true });
    }
  }, [centerOnLastPin, pins.length]);

  return (
    <>
      {/* Header with Back and Done buttons */}
      <View className="flex-row items-center justify-between px-6 pt-4">
        <Pressable
          onPress={onBack}
          className="flex-row items-center gap-1.5 rounded-lg bg-white px-3 py-2">
          <Icon as={ArrowLeftIcon} className="size-4 text-foreground" />
          <Text className="text-sm font-medium">Back</Text>
        </Pressable>

        <Button
          size="sm"
          onPress={onDone}
          >
          <Icon as={Check} className="size-4 text-background" />
          <Text className="text-sm">Done</Text>
        </Button>
      </View>

      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}>
        <ScrollView
          showsHorizontalScrollIndicator={true}
          scrollEnabled={true}>
          <View style={{ height: mapContentHeight, width: SCREEN_WIDTH * 1.5 }} className="relative">
        {/* Render connecting lines */}
        {pins.map((pin, index) => {
          const linePath = getLinePath(index);
          if (!linePath) return null;

          return (
            <View
              key={`line-${pin.id}`}
              style={{
                position: 'absolute',
                top: linePath.top,
                left: linePath.direction === 'right' ? linePath.left : linePath.left - linePath.width,
                width: linePath.width,
                height: linePath.height,
              }}>
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: linePath.direction === 'right' ? 0 : linePath.width,
                  width: 2,
                  height: linePath.height * 0.5,
                  backgroundColor: '#666',
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  top: linePath.height * 0.5,
                  left: linePath.direction === 'right' ? 0 : 0,
                  width: linePath.width,
                  height: 2,
                  backgroundColor: '#666',
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  top: linePath.height * 0.5,
                  left: linePath.direction === 'right' ? linePath.width : 0,
                  width: 2,
                  height: linePath.height * 0.5,
                  backgroundColor: '#666',
                }}
              />
            </View>
          );
        })}

        {/* Render pins */}
        {pins.map((pin, index) => {
          const position = getPinPosition(index);
          return (
            <View
              key={pin.id}
              style={{
                position: 'absolute',
                top: position.top,
                left: position.left - 20,
              }}>
              <MapPinComponent
                type="pin"
                count={pin.placeCount}
                isActive={pin.isActive}
                onPress={() => onPinPress?.(pin.id)}
              />
            </View>
          );
        })}

        {/* Render add new button */}
        <View
          style={{
            position: 'absolute',
            top: getPinPosition(pins.length).top,
            left: getPinPosition(pins.length).left - 24,
          }}>
          <MapPinComponent type="add-new" onPress={onAddNewPress} />
        </View>

        {/* Line from last pin to add new button */}
        {pins.length > 0 && (() => {
          const linePath = getLinePath(pins.length);
          if (!linePath) return null;

          return (
            <View
              key="line-to-add-new"
              style={{
                position: 'absolute',
                top: linePath.top,
                left: linePath.direction === 'right' ? linePath.left : linePath.left - linePath.width,
                width: linePath.width,
                height: linePath.height,
              }}>
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: linePath.direction === 'right' ? 0 : linePath.width,
                  width: 2,
                  height: linePath.height * 0.5,
                  backgroundColor: '#666',
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  top: linePath.height * 0.5,
                  left: linePath.direction === 'right' ? 0 : 0,
                  width: linePath.width,
                  height: 2,
                  backgroundColor: '#666',
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  top: linePath.height * 0.5,
                  left: linePath.direction === 'right' ? linePath.width : 0,
                  width: 2,
                  height: linePath.height * 0.5,
                  backgroundColor: '#666',
                }}
              />
            </View>
          );
        })()}
          </View>
        </ScrollView>
      </ScrollView>
    </>
  );
}
