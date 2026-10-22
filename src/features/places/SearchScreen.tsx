import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Place } from '@/domain/types';
import { useLocale } from '@/lib/use-locale';
import { radii, spacing, touch, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { ErrorState } from '@/ui/ErrorState';
import { IconButton } from '@/ui/IconButton';
import { ScreenHeader } from '@/ui/ScreenHeader';

import { PlaceResultRow } from './PlaceResultRow';
import { useOpenPlace } from './use-open-place';
import { usePlaceSearch, type PlaceSearch } from './use-place-search';
import { usePlaces } from './use-places';

function Message({ title, hint }: { title: string; hint?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.message} accessibilityLiveRegion="polite">
      <Text style={[typography.headline, styles.centered, { color: colors.text }]}>{title}</Text>
      {hint ? (
        <Text style={[typography.body, styles.centered, { color: colors.textSecondary }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

interface ResultsProps {
  search: PlaceSearch;
  isSaved: (id: string) => boolean;
  onOpen: (place: Place) => void;
  onToggleSave: (place: Place) => void;
}

function Results({ search, isSaved, onOpen, onToggleSave }: ResultsProps) {
  const { messages } = useLocale();
  if (search.errorKind) return <ErrorState kind={search.errorKind} onRetry={search.retry} />;
  if (search.query === '') return <Message title={messages.search.prompt} />;
  if (search.results.length === 0) {
    return search.hasSearched ? (
      <Message title={messages.search.noResults} hint={messages.search.noResultsHint} />
    ) : (
      <Message title={messages.search.searching} />
    );
  }
  return (
    <FlatList
      data={search.results}
      keyExtractor={(place) => place.id}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => (
        <PlaceResultRow
          place={item}
          saved={isSaved(item.id)}
          onOpen={onOpen}
          onToggleSave={onToggleSave}
        />
      )}
    />
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  return (
    <View
      style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.controlBorder }]}
    >
      <TextInput
        accessibilityLabel={messages.common.searchForAPlace}
        placeholder={messages.search.placeholder}
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChange}
        autoFocus
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        style={[typography.body, styles.input, { color: colors.text }]}
      />
      {value.length > 0 ? (
        <IconButton
          icon="close"
          label={messages.search.clear}
          color={colors.textSecondary}
          onPress={() => onChange('')}
        />
      ) : null}
    </View>
  );
}

/** Search for a place by name; open a result or save it for later. */
export function SearchScreen() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const search = usePlaceSearch(input);
  const places = usePlaces();
  const openPlace = useOpenPlace();

  const toggleSave = (place: Place) =>
    places.isSaved(place.id) ? places.remove(place.id) : places.add(place);
  const padding = { paddingTop: insets.top, paddingBottom: insets.bottom };

  return (
    <View
      testID="search-screen"
      style={[styles.screen, { backgroundColor: colors.background }, padding]}
    >
      <ScreenHeader title={messages.common.search} />
      <SearchField value={input} onChange={setInput} />
      <View style={styles.results}>
        <Results
          search={search}
          isSaved={places.isSaved}
          onOpen={(place) => void openPlace(place)}
          onToggleSave={(place) => void toggleSave(place)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing.lg },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingLeft: spacing.lg,
    minHeight: touch.minTarget + spacing.sm,
  },
  input: { flex: 1, paddingVertical: spacing.sm },
  results: { flex: 1, marginTop: spacing.md },
  message: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xxl },
  centered: { textAlign: 'center' },
});
