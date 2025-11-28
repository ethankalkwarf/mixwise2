// scripts/seed-pg.js
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const COCKTAIL_DB_BASE = 'https://www.thecocktaildb.com/api/json/v1/1';

// Helper to force Title Case (e.g. "triple sec" -> "Triple Sec")
function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

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
  'Vodka', 'Gin', 'Rum', 'Tequila', 'Bourbon', 'Lemon Juice', 'Lime Juice', 
  'Simple Syrup', 'Sugar', 'Ice', 'Water', 'Club Soda', 'Tonic Water'
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
  try {
    const res = await fetch(`${COCKTAIL_DB_BASE}/search.php?f=${letter}`);
    const data = await res.json();
    return data.drinks || [];
  } catch (e) {
    console.error(`Failed to fetch letter ${letter}`);
    return [];
  }
}

async function seed() {
  console.log('🍹 Starting MixWise Seeder via pg...');

  await client.connect();
  console.log('🔌 Connected to Postgres.');

  const allDrinks = [];
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');

  for (const char of alphabet) {
    console.log(`Fetching letter: ${char}...`);
    const drinks = await fetchCocktailsByLetter(char);
    allDrinks.push(...drinks);
  }

  console.log(`Found ${allDrinks.length} cocktails.`);

  // Map to track unique ingredients by their NORMALIZED name
  const ingredientMap = new Map();

  allDrinks.forEach((drink) => {
    for (let i = 1; i <= 15; i++) {
      const rawName = drink[`strIngredient${i}`];
      if (rawName) {
        // CLEANUP STEP: Trim and Title Case
        const cleanName = toTitleCase(rawName.trim());
        
        if (!ingredientMap.has(cleanName)) {
          let category = 'Mixer';
          const n = cleanName.toLowerCase();

          if (
            n.includes('vodka') || n.includes('gin') || n.includes('rum') || 
            n.includes('tequila') || n.includes('whiskey') || n.includes('bourbon') || 
            n.includes('brandy') || n.includes('scotch') || n.includes('cognac')
          ) {
            category = 'Spirit';
          } else if (
            n.includes('liqueur') || n.includes('schnapps') || n.includes('triple sec') || 
            n.includes('vermouth') || n.includes('amaretto') || n.includes('campari') || 
            n.includes('aperol')
          ) {
            category = 'Liqueur';
          } else if (
            n.includes('wine') || n.includes('champagne') || n.includes('prosecco')
          ) {
            category = 'Wine';
          } else if (
            n.includes('juice') || n.includes('syrup') || n.includes('soda') || 
            n.includes('water') || n.includes('cola') || n.includes('tonic')
          ) {
            category = 'Mixer';
          } else if (n.includes('bitters')) {
            category = 'Bitters';
          } else if (
            n.includes('garnish') || n.includes('peel') || n.includes('wedge') || 
            n.includes('slice') || n.includes('mint') || n.includes('olive')
          ) {
            category = 'Garnish';
          }

          ingredientMap.set(cleanName, {
            name: cleanName,
            category,
            image_url: `https://www.thecocktaildb.com/images/ingredients/${encodeURIComponent(cleanName)}-Small.png`,
            is_staple: STAPLES.includes(cleanName),
          });
        }
      }
    }
  });

  console.log(`Identified ${ingredientMap.size} unique ingredients.`);

  // 1. Upsert Ingredients
  const ingredients = Array.from(ingredientMap.values());
  for (const ing of ingredients) {
    // ON CONFLICT (name): Ensure your DB has a UNIQUE constraint on the 'name' column for this to work perfectly.
    // If not, the script relies on the fact that we deduped in JS first.
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
      [ing.name, ing.category, ing.image_url, ing.is_staple]
    );
  }

  // 2. Build Map of Name -> ID
  const { rows: ingredientRows } = await client.query('SELECT id, name FROM public.ingredients;');
  const ingIdMap = {};
  ingredientRows.forEach((row) => {
    ingIdMap[row.name] = row.id;
  });

  console.log('Inserting cocktails...');

  // 3. Insert Cocktails & Junctions
  for (const drink of allDrinks) {
    if (!drink) continue;

    const category = CATEGORY_MAP[drink.strCategory] || 'Other';

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
      [drink.strDrink, drink.strInstructions, category, drink.strDrinkThumb, drink.strGlass]
    );

    const cocktailId = result.rows[0].id;

    for (let i = 1; i <= 15; i++) {
      const rawName = drink[`strIngredient${i}`];
      const measure = drink[`strMeasure${i}`];

      if (rawName) {
        // Ensure we look up using the same normalization logic
        const cleanName = toTitleCase(rawName.trim());
        const ingId = ingIdMap[cleanName];

        if (ingId) {
          await client.query(
            `
            INSERT INTO public.cocktail_ingredients (cocktail_id, ingredient_id, measure)
            VALUES ($1, $2, $3)
            ON CONFLICT (cocktail_id, ingredient_id) 
            DO UPDATE SET measure = EXCLUDED.measure;
          `,
            [cocktailId, ingId, measure ? measure.trim() : null]
          );
        }
      }
    }
  }

  console.log('✅ Seeding complete!');
  await client.end();
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  client.end().catch(() => {});
  process.exit(1);
});
