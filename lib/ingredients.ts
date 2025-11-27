export type IngredientType =
  | 'spirit'
  | 'liqueur'
  | 'mixer'
  | 'citrus'
  | 'syrup'
  | 'bitters';

export type Ingredient = {
  id: number;
  name: string;
  slug: string;
  type: IngredientType;
};

export const ingredients: Ingredient[] = [
  { id: 1, name: 'Vodka', slug: 'vodka', type: 'spirit' },
  { id: 2, name: 'Gin', slug: 'gin', type: 'spirit' },
  { id: 3, name: 'Tequila', slug: 'tequila', type: 'spirit' },
  { id: 4, name: 'White Rum', slug: 'white-rum', type: 'spirit' },
  { id: 5, name: 'Bourbon', slug: 'bourbon', type: 'spirit' },
  { id: 10, name: 'Coffee Liqueur', slug: 'coffee-liqueur', type: 'liqueur' },
  { id: 11, name: 'Triple Sec', slug: 'triple-sec', type: 'liqueur' },
  { id: 12, name: 'Campari', slug: 'campari', type: 'liqueur' },
  { id: 13, name: 'Sweet Vermouth', slug: 'sweet-vermouth', type: 'liqueur' },
  { id: 14, name: 'Dry Vermouth', slug: 'dry-vermouth', type: 'liqueur' },
  { id: 20, name: 'Lime Juice', slug: 'lime-juice', type: 'citrus' },
  { id: 21, name: 'Lemon Juice', slug: 'lemon-juice', type: 'citrus' },
  { id: 30, name: 'Simple Syrup', slug: 'simple-syrup', type: 'syrup' },
  { id: 40, name: 'Ginger Ale', slug: 'ginger-ale', type: 'mixer' },
  { id: 41, name: 'Club Soda', slug: 'club-soda', type: 'mixer' },
  { id: 42, name: 'Tonic Water', slug: 'tonic-water', type: 'mixer' },
  { id: 50, name: 'Angostura Bitters', slug: 'angostura-bitters', type: 'bitters' },
];