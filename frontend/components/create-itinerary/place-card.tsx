import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { PlusIcon, TagIcon, Check } from 'lucide-react-native';
import { View, Pressable } from 'react-native';

type PlaceCardProps = {
  name: string;
  address: string;
  priceLevel: number;
  onAdd: () => void;
  isAdded?: boolean;
};

export function PlaceCard({ name, address, priceLevel, onAdd, isAdded }: PlaceCardProps) {
  const getPriceSymbol = (level: number) => {
    return '$'.repeat(Math.min(Math.max(level, 1), 4));
  };

  return (
    <Pressable onPress={onAdd} className="w-full">
      {({ pressed }) => (
        <Card
          className={`flex-col items-start gap-1 py-0 transition-colors ${pressed ? 'bg-accent' : ''} ${isAdded ? 'shadow-md shadow-primary/20' : ''}`}>
          {/* Image placeholder */}
          <View className="h-40 w-full flex-shrink-0 rounded-t-lg bg-[#9C8B84]" />

          {/* Content */}
          <CardContent className="flex w-full flex-1 justify-between gap-2 p-4">
            {/* Badges and title */}
            <View className="flex-1 gap-1.5">
              <View className="flex-row gap-1">
                <Badge className="bg-foreground">
                  <Icon as={TagIcon} className="size-3 text-background" />
                  <Text className="text-background">Label</Text>
                </Badge>
                <Badge className="bg-foreground">
                  <Text className="text-background">{getPriceSymbol(priceLevel)}</Text>
                </Badge>
              </View>

              <View>
                <Text className="text-base font-semibold">{name}</Text>
                <Text className="text-sm text-muted-foreground">{address}</Text>
              </View>
            </View>

            {/* Add button */}
            <View className="self-end">
              <Button
                size="sm"
                onPress={onAdd}
                className="h-8 rounded-md">
                <Icon
                  as={isAdded ? Check : PlusIcon}
                  className="size-3.5 text-primary-foreground"
                />
                <Text className="text-sm">{isAdded ? 'Added' : 'Add'}</Text>
              </Button>
            </View>
          </CardContent>
        </Card>
      )}
    </Pressable>
  );
}
