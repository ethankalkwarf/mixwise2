export type Ingredient = {
  id: number;
  name: string;
  category: string;
  image_url: string | null;
  is_staple: boolean;
};

export type Cocktail = {
  id: number;
  name: string;
  instructions: string;
  category: string;
  image_url: string | null;
  glass: string | null;
  ingredients: {
    id: number;
    name: string;
    measure: string | null;
  }[];
};

export type MatchResult = {
  cocktail: Cocktail;
  missingIds: number[];
};