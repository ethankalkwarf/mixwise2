"use client";

import { useEffect, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { InventoryPanel } from '@/components/InventoryPanel';
import { ResultsPanel } from '@/components/ResultsPanel';
import { Ingredient, Cocktail } from '@/lib/types';
import { loadInventory, saveInventory } from '@/lib/inventoryApi';

export default function HomePage() {
  const supabase = useSupabaseClient();
  
  // State
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [allCocktails, setAllCocktails] = useState<Cocktail[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [inventoryIds, setInventoryIds] = useState<number[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);

  // 1. Load Static Data (Public)
  useEffect(() => {
    async function fetchData() {
      const { data: ingData } = await supabase.from('ingredients').select('*').order('name');
      if (ingData) setAllIngredients(ingData);

      const { data: drinkData } = await supabase
        .from('cocktails')
        .select(`
          *,
          cocktail_ingredients!inner (
            measure,
            ingredient:ingredients ( id, name )
          )
        `);

      if (drinkData) {
        const formatted: Cocktail[] = drinkData.map((d: any) => ({
          id: d.id,
          name: d.name,
          instructions: d.instructions,
          category: d.category,
          image_url: d.image_url,
          glass: d.glass,
          ingredients: d.cocktail_ingredients.map((ci: any) => ({
            id: ci.ingredient.id,
            name: ci.ingredient.name,
            measure: ci.measure,
          })),
        }));
        setAllCocktails(formatted);
      }
      setDataLoading(false);
    }
    fetchData();
  }, [supabase]);

  // 2. Load Local User Data (No Login Required)
  useEffect(() => {
    async function loadLocal() {
      const { ingredientIds } = await loadInventory(supabase);
      setInventoryIds(ingredientIds);
      // Future: Load favorites from local storage too
    }
    loadLocal();
  }, []);

  // 3. Actions
  const handleInventoryChange = async (newIds: number[]) => {
    setInventoryIds(newIds);
    await saveInventory(supabase, 0, newIds);
  };

  const handleAddToInventory = (id: number) => {
    if (!inventoryIds.includes(id)) {
        const next = [...inventoryIds, id];
        handleInventoryChange(next);
    }
  };

  const handleToggleFavorite = (id: number) => {
      if (favoriteIds.includes(id)) {
          setFavoriteIds(prev => prev.filter(f => f !== id));
      } else {
          setFavoriteIds(prev => [...prev, id]);
      }
      // TODO: Save favorites to local storage
  };

  if (dataLoading)
    return <div className="text-white text-center py-20 animate-pulse">Loading MixWise...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid lg:grid-cols-[1fr_1.5fr] gap-8 items-start">
        <div className="lg:sticky lg:top-24">
          <InventoryPanel
            ingredients={allIngredients}
            selectedIds={inventoryIds}
            onChange={handleInventoryChange}
          />
        </div>
        <div>
          <ResultsPanel
            inventoryIds={inventoryIds}
            allCocktails={allCocktails}
            allIngredients={allIngredients}
            favoriteIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
            onAddToInventory={handleAddToInventory}
          />
        </div>
      </div>
    </div>
  );
}
