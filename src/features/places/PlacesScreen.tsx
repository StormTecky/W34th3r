import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Place } from '@/domain/types';
import { useLocale } from '@/lib/use-locale';
import { radii, spacing, touch, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { EnterView } from '@/ui/EnterView';
import { PressableScale } from '@/ui/PressableScale';
import { ScreenHeader } from '@/ui/ScreenHeader';

import { SavedPlaceRow } from './SavedPlaceRow';
import { useOpenPlace } from './use-open-place';
import { usePlaces } from './use-places';

/** The current location is pinned as the first entry; null stands for it in the list data. */
type Entry = Place | null;

function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.textButton}
    >
      <Text style={[typography.bodyStrong, { color: colors.accent }]}>{label}</Text>
    </PressableScale>
  );
}

/** The title, with an Edit/Done toggle once there is something to edit. */
function PlacesHeader(props: { canEdit: boolean; editing: boolean; onToggle: () => void }) {
  const { messages } = useLocale();
  const label = props.editing ? messages.common.done : messages.common.edit;
  const toggle = props.canEdit ? <TextButton label={label} onPress={props.onToggle} /> : null;
  return <ScreenHeader title={messages.places.title} right={toggle} />;
}

function Footer({ empty, onSearch }: { empty: boolean; onSearch: () => void }) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { emptyTitle, emptyBody } = messages.places;
  return (
    <View style={styles.footer}>
      {empty ? (
        <View style={styles.empty}>
          <Text style={[typography.headline, { color: colors.text }]}>{emptyTitle}</Text>
          <Text style={[typography.body, styles.centered, { color: colors.textSecondary }]}>
            {emptyBody}
          </Text>
        </View>
      ) : null}
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={messages.common.searchForAPlace}
        onPress={onSearch}
        style={[styles.searchButton, { backgroundColor: colors.accentFill }]}
      >
        <Text style={[typography.bodyStrong, { color: colors.onAccent }]}>
          {messages.common.searchForAPlace}
        </Text>
      </PressableScale>
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

interface PlaceListProps {
  data: Entry[];
  editing: boolean;
  places: ReturnType<typeof usePlaces>;
}

/** The list itself, easing in after the header; the footer offers search. */
function PlaceList({ data, editing, places }: PlaceListProps) {
  const router = useRouter();
  const openPlace = useOpenPlace();
  return (
    <EnterView testID="places-enter" order={1} style={styles.list}>
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
    </EnterView>
  );
}

/** Saved places, with the current location pinned first and an editing mode for order/removal. */
export function PlacesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const places = usePlaces();
  const [editing, setEditing] = useState(false);

  const data: Entry[] = [null, ...places.places];
  const padding = { paddingTop: insets.top, paddingBottom: insets.bottom };

  return (
    <View
      testID="places-screen"
      style={[styles.screen, { backgroundColor: colors.background }, padding]}
    >
      <PlacesHeader
        canEdit={places.places.length > 0}
        editing={editing}
        onToggle={() => setEditing((on) => !on)}
      />
      <PlaceList data={data} editing={editing} places={places} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing.lg },
  list: { flex: 1 },
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
