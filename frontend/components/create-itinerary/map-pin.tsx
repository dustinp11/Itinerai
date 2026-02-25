import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { MapPin, Plus } from 'lucide-react-native';
import { View, Pressable } from 'react-native';

type MapPinProps = {
  type: 'pin' | 'add-new';
  count?: number;
  isActive?: boolean;
  onPress?: () => void;
};

export function MapPinComponent({ type, count = 0, isActive = false, onPress }: MapPinProps) {
  if (type === 'add-new') {
    return (
      <Pressable onPress={onPress} className="items-center justify-center">
        {({ pressed }) => (
          <View
            className={`h-12 w-12 items-center justify-center rounded-full border-2 border-foreground bg-background ${
              pressed ? 'opacity-70' : ''
            }`}>
            <Icon as={Plus} className="size-6 text-foreground" />
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} className="relative items-center justify-center">
      {({ pressed }) => (
        <>
          <Icon
            as={MapPin}
            className={`size-10 ${isActive ? 'text-primary' : 'text-foreground'} ${
              pressed ? 'opacity-70' : ''
            }`}
            fill={isActive ? 'currentColor' : 'currentColor'}
          />
          {count > 0 && (
            <View className="absolute -right-1 -top-1">
              <Badge variant="default" className="h-5 min-w-5 items-center justify-center px-1">
                <Text className="text-xs font-bold text-primary-foreground">{count}</Text>
              </Badge>
            </View>
          )}
        </>
      )}
    </Pressable>
  );
}
