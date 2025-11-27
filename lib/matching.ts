import { Cocktail, MatchResult } from './types';

export type UpgradeSuggestion = {
  ingredientId: number;
  unlockCount: number;
};

export function getMatches(
  inventoryIds: number[],
  cocktails: Cocktail[],
  maxMissing: number
): MatchResult[] {
  const inventorySet = new Set(inventoryIds);
  const results: MatchResult[] = [];

  for (const c of cocktails) {
    const missing: number[] = [];
    if (!c.ingredients || c.ingredients.length === 0) continue;

    for (const ing of c.ingredients) {
      if (!inventorySet.has(ing.id)) {
        missing.push(ing.id);
        if (missing.length > maxMissing) break;
      }
    }

    if (missing.length <= maxMissing) {
      results.push({ cocktail: c, missingIds: missing });
    }
  }
  return results;
}

export function getUpgradeSuggestions(
  inventoryIds: number[],
  cocktails: Cocktail[],
  maxMissing = 1
): UpgradeSuggestion[] {
  const inventorySet = new Set(inventoryIds);
  const missingMap = new Map<number, { count: number; cocktails: Set<number> }>();

  for (const c of cocktails) {
    const missing: number[] = [];
    if (!c.ingredients) continue;

    for (const ing of c.ingredients) {
      if (!inventorySet.has(ing.id)) {
        missing.push(ing.id);
        if (missing.length > maxMissing) break;
      }
    }

    if (missing.length === 1) {
      const missingId = missing[0];
      const entry = missingMap.get(missingId) ?? {
        count: 0,
        cocktails: new Set<number>(),
      };
      if (!entry.cocktails.has(c.id)) {
        entry.cocktails.add(c.id);
        entry.count += 1;
      }
      missingMap.set(missingId, entry);
    }
  }

  const suggestions: UpgradeSuggestion[] = [];
  missingMap.forEach((entry, ingredientId) => {
    suggestions.push({ ingredientId, unlockCount: entry.count });
  });

  return suggestions.sort((a, b) => b.unlockCount - a.unlockCount);
}