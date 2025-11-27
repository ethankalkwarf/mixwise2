export type Cocktail = {
  id: number;
  name: string;
  slug: string;
  category: string;
  ingredientIds: number[];
  instructions: string;
};

export const cocktails: Cocktail[] = [
  {
    id: 1,
    name: 'Whiskey Sour',
    slug: 'whiskey-sour',
    category: 'sour',
    ingredientIds: [5, 21, 30], // Bourbon, Lemon, Simple
    instructions:
      'Shake all ingredients with ice, strain into a rocks glass with ice. Garnish with a cherry and orange slice.',
  },
  {
    id: 2,
    name: 'Margarita',
    slug: 'margarita',
    category: 'sour',
    ingredientIds: [3, 11, 20, 30], // Tequila, Triple Sec, Lime, Simple
    instructions:
      'Shake with ice, strain into a salt-rimmed glass over fresh ice.',
  },
  {
    id: 3,
    name: 'Vodka Ginger Highball',
    slug: 'vodka-ginger-highball',
    category: 'highball',
    ingredientIds: [1, 40, 20], // Vodka, Ginger Ale, Lime
    instructions:
      'Build in a highball glass over ice. Squeeze lime and drop in.',
  },
  {
    id: 4,
    name: 'Negroni',
    slug: 'negroni',
    category: 'stirred',
    ingredientIds: [2, 12, 13], // Gin, Campari, Sweet Vermouth
    instructions:
      'Stir with ice, strain into a rocks glass with a large cube. Garnish with orange peel.',
  },
  {
    id: 5,
    name: 'Black Russian',
    slug: 'black-russian',
    category: 'spirit-forward',
    ingredientIds: [1, 10], // Vodka, Coffee Liqueur
    instructions: 'Build over ice in a rocks glass, stir gently.',
  },
];