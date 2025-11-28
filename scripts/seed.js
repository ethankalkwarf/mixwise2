const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use the public URL plus the SERVICE ROLE key for seeding.
// This runs on your machine only and is not exposed to the browser.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
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
  'Other / Unknown': 'Other'
};

// UPDATED: Spirits removed so they are treated as inventory items.
// Only true basics (Ice, Water, Sugar, etc.) remain as staples.
const STAPLES = [
  'Lemon Juice',
  'Lime Juice',
  'Simple Syrup',
  'Sugar',
  'Ice',
  'Water',
];

async function fetchCocktailsByLetter(letter) {
  const res = await fetch(`${COCKTAIL_DB_BASE}/search.php?f=${letter}`);
  const data = await res.json();
  return data.drinks || [];
}

async function seed() {
  console.log('🍹 Starting MixWise Seeder...');

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
          )
            category = 'Spirit';
          else if (
            n.includes('liqueur') ||
            n.includes('schnapps') ||
            n.includes('triple sec') ||
            n.includes('vermouth')
          )
            category = 'Liqueur';
          else if (
            n.includes('juice') ||
            n.includes('syrup') ||
            n.includes('soda') ||
            n.includes('water')
          )
            category = 'Mixer';
          else if (n.includes('bitters')) category = 'Bitters';
          else if (
            n.includes('garnish') ||
            n.includes('peel') ||
            n.includes('wedge') ||
            n.includes('slice')
          )
            category = 'Garnish';

          ingredientMap.set(cleanName, {
            name: cleanName,
            category: category,
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

  const { data: insertedIngredients, error: ingError } = await supabase
    .from('ingredients')
    .upsert(Array.from(ingredientMap.values()), { onConflict: 'name' })
    .select();

  if (ingError) {
    console.error('Error inserting ingredients:', ingError);
    return;
  }

  const ingIdMap = {};
  insertedIngredients.forEach((i) => {
    ingIdMap[i.name] = i.id;
  });

  console.log('Inserting cocktails...');

  for (const drink of allDrinks) {
    const { data: cocktailData, error: cError } = await supabase
      .from('cocktails')
      .upsert(
        {
          name: drink.strDrink,
          instructions: drink.strInstructions,
          category: CATEGORY_MAP[drink.strCategory] || 'Other',
          image_url: drink.strDrinkThumb,
          glass: drink.strGlass,
        },
        { onConflict: 'name' },
      )
      .select()
      .single();

    if (cError) {
      console.error(`Failed to insert ${drink.strDrink}:`, cError.message);
      continue;
    }

    const cocktailId = cocktailData.id;
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

    if (junctionInserts.length > 0) {
      await supabase
        .from('cocktail_ingredients')
        .upsert(junctionInserts, { ignoreDuplicates: true });
    }
  }

  console.log('✅ Seeding complete!');
}

seed();
