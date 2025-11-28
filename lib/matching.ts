import {
  Cocktail,
  CocktailIngredient,
  SubstitutionRule,
  MatchResult,
} from "./types";

export type MatchEngineParams = {
  cocktails: Cocktail[];
  ownedIngredientIds: number[];
  stapleIngredientIds: number[];
  substitutions: SubstitutionRule[];
  substitutionThreshold?: number;
};

export type MatchGroups = {
  makeNow: MatchResult[];
  almostThere: MatchResult[];
  all: MatchResult[];
};

export function getMatchGroups(params: MatchEngineParams): MatchGroups {
  const {
    cocktails,
    ownedIngredientIds,
    stapleIngredientIds,
    substitutions,
    substitutionThreshold = 0.7,
  } = params;

  const owned = new Set<number>(ownedIngredientIds);
  const staples = new Set<number>(stapleIngredientIds);

  const substitutionMap = new Map<number, SubstitutionRule[]>();
  for (const rule of substitutions) {
    const list = substitutionMap.get(rule.fromIngredientId) ?? [];
    list.push(rule);
    substitutionMap.set(rule.fromIngredientId, list);
  }

  const makeNow: MatchResult[] = [];
  const almostThere: MatchResult[] = [];
  const all: MatchResult[] = [];

  for (const cocktail of cocktails) {
    const requiredTotal: number = cocktail.ingredients.filter(
      (ing: CocktailIngredient) => !ing.isOptional && !staples.has(ing.id),
    ).length;

    let requiredCovered = 0;
    const missingRequired: number[] = [];
    const missingNames: string[] = [];
    const coveredBySubstitutions: Record<number, number> = {};

    for (const ing of cocktail.ingredients) {
      const isRequired = !ing.isOptional && !staples.has(ing.id);
      if (!isRequired) continue;

      const id = ing.id;

      if (owned.has(id) || staples.has(id)) {
        requiredCovered += 1;
        continue;
      }

      let substituted = false;
      const possibleSubs = substitutionMap.get(id) ?? [];
      for (const rule of possibleSubs) {
        if (rule.strength >= substitutionThreshold && owned.has(rule.toIngredientId)) {
          requiredCovered += 1;
          coveredBySubstitutions[id] = rule.toIngredientId;
          substituted = true;
          break;
        }
      }

      if (!substituted) {
        missingRequired.push(id);
        missingNames.push(ing.name);
      }
    }

    const score =
      requiredTotal === 0 ? 1 : requiredCovered / Math.max(requiredTotal, 1);

    const result: MatchResult = {
      cocktail,
      score,
      missingRequiredIngredientIds: missingRequired,
      missingRequiredIngredientNames: missingNames,
      coveredBySubstitutions,
    };

    all.push(result);

    if (missingRequired.length === 0) {
      makeNow.push(result);
    } else if (missingRequired.length === 1) {
      almostThere.push(result);
    }
  }

  const sortFn = (a: MatchResult, b: MatchResult) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.cocktail.name.localeCompare(b.cocktail.name);
  };

  makeNow.sort(sortFn);
  almostThere.sort(sortFn);
  all.sort(sortFn);

  return { makeNow, almostThere, all };
}

/**
 * Legacy wrapper to keep old callers compiling.
 * It ignores staples and substitutions and just filters by missing count.
 */
export function getMatches(
  inventoryIds: number[],
  cocktails: Cocktail[],
  maxMissing: number,
): MatchResult[] {
  const result = getMatchGroups({
    cocktails,
    ownedIngredientIds: inventoryIds,
    stapleIngredientIds: [],
    substitutions: [],
    substitutionThreshold: 1,
  }).all;

  return result.filter(
    (res) => res.missingRequiredIngredientIds.length <= maxMissing,
  );
}
