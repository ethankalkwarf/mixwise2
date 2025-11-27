// This file defines the core domain types used by the MixWise app.

export type Ingredient = {
  /**
   * Unique identifier for the ingredient.
   */
  id: number;
  /**
   * Human-readable ingredient name (e.g. “Tequila Blanco”).
   */
  name: string;
  /**
   * Broad category for the ingredient. Useful for grouping and filtering in the UI.
   */
  category: string;
  /**
   * Optional URL pointing to an image representation of the ingredient.
   */
  image_url: string | null;
  /**
   * Flag indicating whether this ingredient should be treated as always available
   * (for example: ice, water, simple syrup). When true, missing this ingredient
   * will not block a cocktail from being “Ready to Mix”.
   */
  is_staple: boolean;
};

export type CocktailIngredient = {
  /**
   * The canonical ingredient ID.
   */
  id: number;
  /**
   * Name of the ingredient as it appears in the recipe. This is redundant
   * with the name on the Ingredient but stored here for convenience.
   */
  name: string;
  /**
   * A free-form measurement string (e.g. “2 oz”, “1 dash”). May be null
   * if the recipe does not specify an amount.
   */
  measure: string | null;
  /**
   * Whether this ingredient is optional (e.g. garnish, twist, decorative item).
   * Optional ingredients do not count against the required set when matching
   * cocktails to a user’s inventory.
   */
  isOptional?: boolean;
};

export type Cocktail = {
  /**
   * Unique identifier for the cocktail.
   */
  id: number;
  /**
   * Human-readable cocktail name (e.g. “Whiskey Sour”).
   */
  name: string;
  /**
   * Full preparation instructions for the cocktail.
   */
  instructions: string;
  /**
   * Broad category for the cocktail (e.g. “sour”, “highball”).
   */
  category: string;
  /**
   * Optional URL pointing to an image of the completed drink.
   */
  image_url: string | null;
  /**
   * Suggested glass type for serving (e.g. “rocks”, “highball”).
   */
  glass: string | null;
  /**
   * Ingredients that make up this cocktail. Each entry includes the
   * canonical ingredient ID and an optional measure and optional flag.
   */
  ingredients: CocktailIngredient[];
  /**
   * Automatically derived tags describing the cocktail (primary spirit,
   * difficulty, vibes, etc.). Populated in later phases but defined now
   * for forward compatibility.
   */
  tags?: string[];
  /**
   * Automatically derived primary spirit for the drink (e.g. “bourbon”).
   */
  primarySpirit?: string;
  /**
   * Derived difficulty rating: “easy”, “moderate”, or “advanced”.
   */
  difficulty?: 'easy' | 'moderate' | 'advanced';
  /**
   * Short descriptors capturing the mood or flavor of the drink (e.g.
   * ["summer", "citrus"]).
   */
  vibes?: string[];
};

export type SubstitutionRule = {
  /**
   * Ingredient required by a recipe.
   */
  fromIngredientId: number;
  /**
   * Ingredient that the user may own which can serve as a substitute.
   */
  toIngredientId: number;
  /**
   * A value between 0 and 1 indicating how good this substitution is. A
   * higher value means the substitute is closer to the original. The
   * matching engine uses a threshold (e.g. 0.7) to decide whether a
   * substitution counts.
   */
  strength: number;
};

export type MatchResult = {
  /** The cocktail being considered. */
  cocktail: Cocktail;
  /**
   * Score from 0 to 1 indicating the fraction of required ingredients the
   * user has (taking into account staples and substitutions).
   */
  score: number;
  /**
   * IDs of required ingredients that the user does not have after taking
   * substitutions into account. An empty array means the drink is fully
   * makeable now.
   */
  missingRequiredIngredientIds: number[];
  /**
   * Human-readable names for the missing required ingredients.
   */
  missingRequiredIngredientNames: string[];
  /**
   * A map from required ingredient ID to the substitute ingredient ID used.
   * Only includes entries for ingredients covered via substitution rules.
   */
  coveredBySubstitutions: Record<number, number>;
};
