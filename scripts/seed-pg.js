// scripts/seed-pg.js
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const COCKTAIL_DB_BASE = 'https://www.thecocktaildb.com/api/json/v1/1';

const CATEGORY_MAP = {
  'Ordinary Drink': 'Cocktail',
  'Cocktail': 'Cocktail',
  'Milk / Float / Shake': 'Rich & Creamy',
  'Cocoa': 'Rich & Creamy',
  'Shot': 'Shot',
  'Coffee / Tea': 'Coffee',
  'Homemade Liqueur': 'Liqueur',
  'Punch / Party Drink': 'Punch',
  'Beer': 'Beer',
  'Soft Drink': 'Non-Alcoholic',
  'Other / Unknown': 'Other',
};

const STAPLES = [
  'Vodka',
  'Gin',
  'Rum',
  'Tequila',
  'Bourbon',
  'Lemon Juice',
  'Lime Juice',
  'Simple Syrup',
  'Sugar',
  'Ice',
  'Water',
];

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL missing in .env.local');
  process.exit(1);
}

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function fetchCocktailsByLetter(letter) {
  const res = await fetch(`${COCKTAIL_DB_BASE}/search.php?f=${letter}`);
  const data = await res.json();
  return data.drinks || [];
}

async function seed() {
  console.log('🍹 Starting MixWise Seeder via pg...');

  await client.connect();
  console.log('🔌 Connected to Postgres via DATABASE_URL');

  const allDrinks = [];
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');

  for (const char of alphabet) {
    console.log(`Fetching letter: ${char}...`);
    const drinks = await fetchCocktailsByLetter(char);
    allDrinks.push(...drinks);
  }

  console.log(`Found ${allDrinks.length} cocktails.`);

  const ingredientMap = new Map();

  allDrinks.forEach((drink) => {
    for (let i = 1; i <= 15; i++) {
      const ingName = drink[`strIngredient${i}`];
      if (ingName) {
        const cleanName = ingName.trim();
        if (!ingredientMap.has(cleanName)) {
          let category = 'Mixer';
          const n = cleanName.toLowerCase();

          if (
            n.includes('vodka') ||
            n.includes('gin') ||
            n.includes('rum') ||
            n.includes('tequila') ||
            n.includes('whiskey') ||
            n.includes('bourbon') ||
            n.includes('brandy')
          ) {
            category = 'Spirit';
          } else if (
            n.includes('liqueur') ||
            n.includes('schnapps') ||
            n.includes('triple sec') ||
            n.includes('vermouth')
          ) {
            category = 'Liqueur';
          } else if (
            n.includes('juice') ||
            n.includes('syrup') ||
            n.includes('soda') ||
            n.includes('water')
          ) {
            category = 'Mixer';
          } else if (n.includes('bitters')) {
            category = 'Bitters';
          } else if (
            n.includes('garnish') ||
            n.includes('peel') ||
            n.includes('wedge') ||
            n.includes('slice')
          ) {
            category = 'Garnish';
          }

          ingredientMap.set(cleanName, {
            name: cleanName,
            category,
            image_url: `https://www.thecocktaildb.com/images/ingredients/${encodeURIComponent(
              cleanName,
            )}-Small.png`,
            is_staple: STAPLES.includes(cleanName),
          });
        }
      }
    }
  });

  console.log(`Identified ${ingredientMap.size} unique ingredients.`);

  // Upsert ingredients via SQL
  const ingredients = Array.from(ingredientMap.values());

  for (const ing of ingredients) {
    await client.query(
      `
      INSERT INTO public.ingredients (name, category, image_url, is_staple)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (name)
      DO UPDATE SET
        category = EXCLUDED.category,
        image_url = EXCLUDED.image_url,
        is_staple = EXCLUDED.is_staple;
    `,
      [ing.name, ing.category, ing.image_url, ing.is_staple],
    );
  }

  console.log('✅ Ingredients upserted.');

  // Build ingredient ID map
  const { rows: ingredientRows } = await client.query(
    'SELECT id, name FROM public.ingredients;',
  );
  const ingIdMap = {};
  ingredientRows.forEach((row) => {
    ingIdMap[row.name] = row.id;
  });

  console.log('Inserting cocktails and cocktail_ingredients...');

  for (const drink of allDrinks) {
    if (!drink) continue;

    const category =
      CATEGORY_MAP[drink.strCategory] || 'Other';

    // Upsert cocktail
    const result = await client.query(
      `
      INSERT INTO public.cocktails (name, instructions, category, image_url, glass)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (name)
      DO UPDATE SET
        instructions = EXCLUDED.instructions,
        category = EXCLUDED.category,
        image_url = EXCLUDED.image_url,
        glass = EXCLUDED.glass
      RETURNING id;
    `,
      [
        drink.strDrink,
        drink.strInstructions,
        category,
        drink.strDrinkThumb,
        drink.strGlass,
      ],
    );

    const cocktailId = result.rows[0].id;
    const junctionInserts = [];

    for (let i = 1; i <= 15; i++) {
      const ingName = drink[`strIngredient${i}`];
      const measure = drink[`strMeasure${i}`];

      if (ingName && ingIdMap[ingName.trim()]) {
        junctionInserts.push({
          cocktail_id: cocktailId,
          ingredient_id: ingIdMap[ingName.trim()],
          measure: measure ? measure.trim() : null,
        });
      }
    }

    for (const row of junctionInserts) {
      await client.query(
        `
        INSERT INTO public.cocktail_ingredients (cocktail_id, ingredient_id, measure)
        VALUES ($1, $2, $3)
        ON CONFLICT (cocktail_id, ingredient_id)
        DO UPDATE SET
          measure = EXCLUDED.measure;
      `,
        [row.cocktail_id, row.ingredient_id, row.measure],
      );
    }
  }

  console.log('✅ Cocktails and ingredients seeded successfully.');

  await client.end();
  console.log('🔌 Disconnected from Postgres.');
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  client.end().catch(() => {});
  process.exit(1);
});

