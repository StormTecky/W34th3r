import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Place } from '@/domain/types';
import { spacing, touch, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { IconButton } from '@/ui/IconButton';

import { placeLabel, placeSubtitle } from './place-label';

export interface PlaceResultRowProps {
  place: Place;
  saved: boolean;
  onOpen: (place: Place) => void;
  onToggleSave: (place: Place) => void;
}

/** A search result: open it to see its weather, or save/unsave it with the trailing button. */
export function PlaceResultRow({ place, saved, onOpen, onToggleSave }: PlaceResultRowProps) {
  const { colors } = useTheme();
  const label = placeLabel(place);
  const subtitle = placeSubtitle(place);

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => onOpen(place)}
        style={({ pressed }) => [styles.main, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={[typography.bodyStrong, { color: colors.text }]}>{place.name}</Text>
        {subtitle ? (
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </Pressable>
      <IconButton
        icon="bookmark"
        filled={saved}
        color={saved ? colors.accent : colors.textSecondary}
        label={saved ? `Remove ${label} from saved places` : `Save ${label}`}
        onPress={() => onToggleSave(place)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: touch.minTarget + spacing.md },
  main: {
    flex: 1,
    minHeight: touch.minTarget,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xxs,
  },
});
