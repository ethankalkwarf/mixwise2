// ... existing imports

export type Cocktail = {
  id: number;
  name: string;
  instructions: string;
  category: string;
  image_url: string | null;
  glass: string | null;
  ingredients: CocktailIngredient[];
  // 👇 Add this new field
  is_popular?: boolean; 
  
  // ... keep existing optional fields
  tags?: string[];
  primarySpirit?: string;
  difficulty?: 'easy' | 'moderate' | 'advanced';
  vibes?: string[];
};

// ... rest of the file remains the same
export type Ingredient = {
  id: number;
  name: string;
  category: string;
  image_url: string | null;
  is_staple: boolean;
};

export type CocktailIngredient = {
  id: number;
  name: string;
  measure: string | null;
  isOptional?: boolean;
};

export type SubstitutionRule = {
  fromIngredientId: number;
  toIngredientId: number;
  strength: number;
};

export type MatchResult = {
  cocktail: Cocktail;
  score: number;
  missingRequiredIngredientIds: number[];
  missingRequiredIngredientNames: string[];
  coveredBySubstitutions: Record<number, number>;
};
