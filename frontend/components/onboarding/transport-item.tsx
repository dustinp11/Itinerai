import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

type TransportItemProps = {
  label: string;
  icon: LucideIcon;
  rank: number | null;
  onPress: () => void;
};

export function TransportItem({ label, icon, rank, onPress }: TransportItemProps) {
  const isRanked = rank !== null;

  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'flex-row items-center self-start gap-2 rounded-full border px-4 py-2.5',
        isRanked ? 'border-primary bg-primary/5' : 'border-border bg-background'
      )}
    >
      <Icon as={icon} className={cn('size-4', isRanked ? 'text-primary' : 'text-foreground')} />
      <Text className={cn('text-sm font-medium', isRanked && 'text-primary')}>
        {label}
      </Text>
      {isRanked && (
        <View className="ml-1 size-5 items-center justify-center rounded border border-primary/30 bg-primary/10">
          <Text className="text-xs font-semibold text-primary">{rank}</Text>
        </View>
      )}
    </Pressable>
  );
}
