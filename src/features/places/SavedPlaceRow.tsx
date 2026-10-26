import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatTemperature } from '@/domain/units';
import { useLocale } from '@/lib/use-locale';
import { useCachedWeather } from '@/features/current/use-cached-weather';
import { usePreferences } from '@/features/settings/use-preferences';
import { spacing, touch, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { IconButton } from '@/ui/IconButton';

import { placeLabel, placeSubtitle } from './place-label';
import type { Place } from '@/domain/types';

export interface SavedPlaceRowProps {
  /** Null for the pinned current-location row. */
  place: Place | null;
  editing: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onOpen: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

function EditControls(props: SavedPlaceRowProps & { name: string }) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { name } = props;
  return (
    <View style={styles.controls}>
      <IconButton
        icon="arrow-up"
        label={messages.places.moveUp(name)}
        disabled={!props.canMoveUp}
        color={colors.text}
        onPress={props.onMoveUp}
      />
      <IconButton
        icon="arrow-down"
        label={messages.places.moveDown(name)}
        disabled={!props.canMoveDown}
        color={colors.text}
        onPress={props.onMoveDown}
      />
      <IconButton
        icon="trash"
        label={messages.places.remove(name)}
        color={colors.danger}
        onPress={props.onRemove}
      />
    </View>
  );
}

/** Name, region line, cached temperature and the spoken description of one place. */
function useRowContent(place: Place | null) {
  const { preferences } = usePreferences();
  const { messages } = useLocale();
  const cached = useCachedWeather(place?.id ?? 'current');
  const label = place ? placeLabel(place) : messages.common.currentLocation;
  const temperature = cached
    ? formatTemperature(cached.current.temperature, preferences.temperatureUnit)
    : null;
  return {
    name: place?.name ?? messages.common.currentLocation,
    subtitle: place ? placeSubtitle(place) : '',
    temperature,
    spoken: temperature
      ? `${label}, ${messages.spoken.degrees(temperature.replace('°', ''))}`
      : label,
  };
}

/** One row of the places list, with editing controls for saved places while editing. */
export function SavedPlaceRow(props: SavedPlaceRowProps) {
  const { colors } = useTheme();
  const { name, subtitle, temperature, spoken } = useRowContent(props.place);

  return (
    <View style={styles.row}>
      <Pressable
        testID="place-row"
        accessibilityRole="button"
        accessibilityLabel={spoken}
        onPress={props.onOpen}
        style={({ pressed }) => [styles.main, { opacity: pressed ? 0.6 : 1 }]}
      >
        <View style={styles.names}>
          <Text style={[typography.bodyStrong, { color: colors.text }]}>{name}</Text>
          {subtitle ? (
            <Text style={[typography.caption, { color: colors.textSecondary }]}>{subtitle}</Text>
          ) : null}
        </View>
        {temperature ? (
          <Text style={[typography.headline, { color: colors.text }]}>{temperature}</Text>
        ) : null}
      </Pressable>
      {props.editing && props.place ? <EditControls {...props} name={name} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: touch.minTarget + spacing.md },
  main: {
    flex: 1,
    minHeight: touch.minTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  names: { flex: 1, gap: spacing.xxs },
  controls: { flexDirection: 'row' },
});
