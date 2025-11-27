import {
  Cocktail,
  CocktailIngredient,
  SubstitutionRule,
  MatchResult,
} from './types';

/**
 * Parameters supplied to the matching engine. This wrapper object makes
 * it easy to add new inputs in the future without breaking call
 * signatures.
 */
export type MatchEngineParams = {
  /** The full list of cocktails to consider. */
  cocktails: Cocktail[];
  /** IDs of ingredients that the user currently owns. */
  ownedIngredientIds: number[];
  /** IDs of ingredients that are always considered available (staples). */
  stapleIngredientIds: number[];
  /**
   * A list of substitution rules. When a required ingredient is not
   * present in the user’s inventory, the engine looks for rules where
   * `fromIngredientId` matches the missing ingredient and
   * `toIngredientId` is present in the user’s inventory. If the rule’s
   * strength is greater than or equal to `substitutionThreshold`, the
   * required ingredient is considered covered by the substitute.
   */
  substitutions: SubstitutionRule[];
  /**
   * The minimum strength required for a substitution to count. Values
   * should be between 0 and 1. Defaults to 0.7.
   */
  substitutionThreshold?: number;
};

export type MatchGroups = {
  /** Cocktails that the user can make immediately (no missing required ingredients). */
  makeNow: MatchResult[];
  /** Cocktails where the user is exactly one ingredient away. */
  almostThere: MatchResult[];
  /** All considered cocktails with scores and missing ingredient info. */
  all: MatchResult[];
};

/**
 * Determine which cocktails can be made from the user’s inventory. The
 * engine respects optional ingredients, staple ingredients, and
 * substitution rules. Results are grouped into “make now” and
 * “almost there”. All results also include a score indicating
 * completeness.
 */
export function getMatchGroups(params: MatchEngineParams): MatchGroups {
  const {
    cocktails,
    ownedIngredientIds,
    stapleIngredientIds,
    substitutions,
    substitutionThreshold = 0.7,
  } = params;

  // Precompute sets for fast lookup
  const owned = new Set<number>(ownedIngredientIds);
  const staples = new Set<number>(stapleIngredientIds);

  // Build a map from missing ingredient -> possible substitutes with strength
  const substitutionMap = new Map<number, SubstitutionRule[]>();
  for (const rule of substitutions) {
    const list = substitutionMap.get(rule.fromIngredientId) ?? [];
    list.push(rule);
    substitutionMap.set(rule.fromIngredientId, list);
  }

  const makeNow: MatchResult[] = [];
  const almostThere: MatchResult[] = [];
  const all: MatchResult[] = [];

  // Iterate over each cocktail and compute its match result
  for (const cocktail of cocktails) {
    const requiredTotal: number = cocktail.ingredients.filter(
      (ing: CocktailIngredient) => !ing.isOptional && !staples.has(ing.id),
    ).length;

    let requiredCovered = 0;
    const missingRequired: number[] = [];
    const missingNames: string[] = [];
    const coveredBySubstitutions: Record<number, number> = {};

    // Iterate through each ingredient, tracking coverage
    for (const ing of cocktail.ingredients) {
      // Skip optional ingredients from required set
      const isRequired = !ing.isOptional && !staples.has(ing.id);
      if (!isRequired) {
        continue;
      }

      const id = ing.id;

      // Owned directly or covered by staples
      if (owned.has(id) || staples.has(id)) {
        requiredCovered += 1;
        continue;
      }

      // Not owned; check substitutions
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

    // Calculate score
    const score = requiredTotal === 0 ? 1 : requiredCovered / requiredTotal;

    const result: MatchResult = {
      cocktail,
      score,
      missingRequiredIngredientIds: missingRequired,
      missingRequiredIngredientNames: missingNames,
      coveredBySubstitutions,
    };

    all.push(result);

    // Populate groups
    if (missingRequired.length === 0) {
      makeNow.push(result);
    } else if (missingRequired.length === 1) {
      almostThere.push(result);
    }
  }

  // Sort groups for reproducibility: by descending score then name
  const sortFn = (a: MatchResult, b: MatchResult) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.cocktail.name.localeCompare(b.cocktail.name);
  };

  makeNow.sort(sortFn);
  almostThere.sort(sortFn);
  all.sort(sortFn);

  return { makeNow, almostThere, all };
}

/**
 * Legacy wrapper around the new matching engine. This retains the
 * previous function signature of getMatches(inventoryIds, cocktails, maxMissing)
 * while delegating to the more flexible getMatchGroups. It always
 * considers staples to be empty and does not apply substitutions. It
 * returns only the list of cocktails with at most `maxMissing` missing
 * ingredients (regardless of optional/staples) to preserve backwards
 * compatibility for any existing callers.
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
