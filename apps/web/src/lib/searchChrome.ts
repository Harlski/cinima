/**
 * The lookup prompt stays on screen, in gold, until the person has a recent
 * search or a last-looked-up title. Once either list has a row, it returns
 * to a hover and focus hint.
 */
export function searchHintPinned(input: {
  showingHistory: boolean;
  recentSearchCount: number;
  lookupCount: number;
}): boolean {
  return (
    input.showingHistory &&
    input.recentSearchCount === 0 &&
    input.lookupCount === 0
  );
}
