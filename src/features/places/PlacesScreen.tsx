import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Place } from '@/domain/types';
import { radii, spacing, touch, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { ScreenHeader } from '@/ui/ScreenHeader';

import { SavedPlaceRow } from './SavedPlaceRow';
import { useOpenPlace } from './use-open-place';
import { usePlaces } from './use-places';

/** The current location is pinned as the first entry; null stands for it in the list data. */
type Entry = Place | null;

function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.textButton, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Text style={[typography.bodyStrong, { color: colors.accent }]}>{label}</Text>
    </Pressable>
  );
}

function Footer({ empty, onSearch }: { empty: boolean; onSearch: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.footer}>
      {empty ? (
        <View style={styles.empty}>
          <Text style={[typography.headline, { color: colors.text }]}>No saved places yet</Text>
          <Text style={[typography.body, styles.centered, { color: colors.textSecondary }]}>
            Search for a city and tap the bookmark to keep it here.
          </Text>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search for a place"
        onPress={onSearch}
        style={({ pressed }) => [
          styles.searchButton,
          { backgroundColor: colors.accentFill, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Text style={[typography.bodyStrong, { color: colors.onAccent }]}>Search for a place</Text>
      </Pressable>
    </View>
  );
}

interface ListRowProps {
  entry: Entry;
  index: number;
  count: number;
  editing: boolean;
  places: ReturnType<typeof usePlaces>;
  onOpen: (place: Place | null) => void;
}

/** Wires one list entry to the store actions; index 0 is the pinned current location. */
function ListRow({ entry, index, count, editing, places, onOpen }: ListRowProps) {
  const id = entry?.id;
  return (
    <SavedPlaceRow
      place={entry}
      editing={editing}
      canMoveUp={index > 1}
      canMoveDown={index < count - 1}
      onOpen={() => onOpen(entry)}
      onMoveUp={() => void (id && places.move(id, 'up'))}
      onMoveDown={() => void (id && places.move(id, 'down'))}
      onRemove={() => void (id && places.remove(id))}
    />
  );
}

/** Saved places, with the current location pinned first and an editing mode for order/removal. */
export function PlacesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const places = usePlaces();
  const openPlace = useOpenPlace();
  const [editing, setEditing] = useState(false);

  const data: Entry[] = [null, ...places.places];
  const padding = { paddingTop: insets.top, paddingBottom: insets.bottom };
  const editButton =
    places.places.length > 0 ? (
      <TextButton label={editing ? 'Done' : 'Edit'} onPress={() => setEditing((on) => !on)} />
    ) : null;

  return (
    <View
      testID="places-screen"
      style={[styles.screen, { backgroundColor: colors.background }, padding]}
    >
      <ScreenHeader title="Places" right={editButton} />
      <FlatList
        testID="places-list"
        data={data}
        keyExtractor={(entry) => entry?.id ?? 'current'}
        renderItem={({ item, index }) => (
          <ListRow
            entry={item}
            index={index}
            count={data.length}
            editing={editing}
            places={places}
            onOpen={(place) => void openPlace(place)}
          />
        )}
        ListFooterComponent={
          <Footer empty={places.places.length === 0} onSearch={() => router.push('/search')} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing.lg },
  textButton: {
    minHeight: touch.minTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  footer: { paddingTop: spacing.xl, gap: spacing.lg },
  empty: { alignItems: 'center', gap: spacing.sm },
  centered: { textAlign: 'center' },
  searchButton: {
    minHeight: touch.minTarget,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
