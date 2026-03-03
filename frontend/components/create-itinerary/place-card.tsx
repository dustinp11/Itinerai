import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { PlusIcon, Check } from 'lucide-react-native';
import { View, Image } from 'react-native';
import { memo } from 'react';

function formatType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

type PlaceCardProps = {
  name: string;
  address: string;
  priceLevel: number | null;
  onAdd: () => void;
  isAdded?: boolean;
  imageUrl?: string;
  tags?: string[];
  recommended?: boolean;
  recommendedReason?: string;
  rating?: number;
  ratingCount?: number;
  distanceKm?: number;
  score?: number;
};

export const PlaceCard = memo(function PlaceCard({
  name,
  address,
  priceLevel,
  onAdd,
  isAdded,
  imageUrl,
  tags,
  recommended,
  recommendedReason,
  rating,
  ratingCount,
  distanceKm,
  score,
}: PlaceCardProps) {
  const getPriceSymbol = (level: number) => {
    const symbols = ['', '$', '$$', '$$$', '$$$$'];
    return symbols[Math.min(Math.max(level, 0), 4)];
  };

  const priceSymbol = priceLevel != null ? getPriceSymbol(priceLevel) : '';

  return (
    <Card className={`w-full flex-col items-start gap-1 py-0 ${isAdded ? 'shadow-md shadow-primary/20' : ''}`}>
      {/* Image */}
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          className="h-40 w-full flex-shrink-0 rounded-t-lg"
          resizeMode="cover"
        />
      ) : (
        <View className="h-40 w-full flex-shrink-0 rounded-t-lg bg-[#9C8B84]" />
      )}

      {/* Content */}
      <CardContent className="flex w-full flex-1 justify-between gap-2 p-4">
        <View className="flex-1 gap-1.5">
          {/* Badges */}
          <View className="flex-row flex-wrap gap-1">
            {recommended && (
              <Badge className="bg-primary">
                <Text className="text-primary-foreground text-xs font-medium">Recommended</Text>
              </Badge>
            )}
            {tags && tags.map((tag) => (
              <Badge key={tag} className="bg-foreground">
                <Text className="text-background text-xs font-medium">{formatType(tag)}</Text>
              </Badge>
            ))}
            {priceSymbol ? (
              <Badge className="bg-foreground">
                <Text className="text-background">{priceSymbol}</Text>
              </Badge>
            ) : null}
          </View>

          {/* Recommendation reason */}
          {recommended && recommendedReason && (
            <Text className="text-xs italic text-muted-foreground">{recommendedReason}</Text>
          )}

          <View>
            <Text className="text-base font-semibold">{name}</Text>
            {(rating != null || distanceKm != null || score != null) && (
              <View className="flex-row items-center gap-1.5 mt-0.5">
                {rating != null && (
                  <Text className="text-xs text-muted-foreground">
                    ★ {rating.toFixed(1)}{ratingCount != null ? ` (${ratingCount})` : ''}
                  </Text>
                )}
                {rating != null && distanceKm != null && (
                  <Text className="text-xs text-muted-foreground">·</Text>
                )}
                {distanceKm != null && (
                  <Text className="text-xs text-muted-foreground">
                    {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}
                  </Text>
                )}
                {score != null && (rating != null || distanceKm != null) && (
                  <Text className="text-xs text-muted-foreground">·</Text>
                )}
                {score != null && (
                  <Text className="text-xs text-muted-foreground">
                    Score: {Math.round(score * 100)}%
                  </Text>
                )}
              </View>
            )}
            <Text className="text-sm text-muted-foreground">{address}</Text>
          </View>
        </View>

        {/* Add button */}
        <View className="self-end">
          <Button size="sm" onPress={onAdd} className="h-8 rounded-md">
            <Icon
              as={isAdded ? Check : PlusIcon}
              className="size-3.5 text-primary-foreground"
            />
            <Text className="text-sm">{isAdded ? 'Added' : 'Add'}</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
});
