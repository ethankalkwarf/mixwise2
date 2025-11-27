"use client";

import { useEffect, useState } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { InventoryPanel } from '@/components/InventoryPanel';
import { ResultsPanel } from '@/components/ResultsPanel';
import { Ingredient, Cocktail } from '@/lib/types';
import { loadInventory, saveInventory } from '@/lib/inventoryApi';

export default function HomePage() {
  const supabase = useSupabaseClient();
  const user = useUser();

  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [allCocktails, setAllCocktails] = useState<Cocktail[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [inventoryIds, setInventoryIds] = useState<number[]>([]);
  const [inventoryId, setInventoryId] = useState<number | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [shoppingList, setShoppingList] = useState<number[]>([]);

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
                measure: ci.measure
            }))
        }));
        setAllCocktails(formatted);
      }
      setDataLoading(false);
    }
    fetchData();
  }, [supabase]);

  useEffect(() => {
    if (!user) {
        setInventoryIds([]); 
        setFavoriteIds([]);
        setShoppingList([]);
        return;
    }

    async function loadUserData() {
        const { inventoryId: invId, ingredientIds } = await loadInventory(supabase);
        setInventoryId(invId);
        setInventoryIds(ingredientIds);

        const { data: favData } = await supabase.from('favorites').select('cocktail_id').eq('user_id', user.id);
        if (favData) setFavoriteIds(favData.map(f => f.cocktail_id));

        const { data: shopData } = await supabase.from('shopping_list').select('ingredient_id').eq('user_id', user.id);
        if (shopData) setShoppingList(shopData.map(s => s.ingredient_id));
    }
    loadUserData();
  }, [user, supabase]);

  const handleInventoryChange = async (newIds: number[]) => {
      setInventoryIds(newIds);
      if (user && inventoryId) {
          await saveInventory(supabase, inventoryId, newIds);
      }
  };

  const handleToggleFavorite = async (id: number) => {
      if (!user) return alert("Please sign in.");
      const isFav = favoriteIds.includes(id);
      if (isFav) {
          await supabase.from('favorites').delete().eq('user_id', user.id).eq('cocktail_id', id);
          setFavoriteIds(prev => prev.filter(i => i !== id));
      } else {
          await supabase.from('favorites').insert({ user_id: user.id, cocktail_id: id });
          setFavoriteIds(prev => [...prev, id]);
      }
  };

  const handleToggleShopping = async (id: number) => {
      if (!user) return alert("Please sign in.");
      const isShop = shoppingList.includes(id);
      if (isShop) {
          await supabase.from('shopping_list').delete().eq('user_id', user.id).eq('ingredient_id', id);
          setShoppingList(prev => prev.filter(i => i !== id));
      } else {
          await supabase.from('shopping_list').insert({ user_id: user.id, ingredient_id: id });
          setShoppingList(prev => [...prev, id]);
      }
  };

  if (dataLoading) return <div className="text-white text-center py-20">Loading MixWise...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid lg:grid-cols-[1fr_1.5fr] gap-8 items-start">
         <div className="lg:sticky lg:top-6">
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
                shoppingList={shoppingList}
                onToggleShoppingList={handleToggleShopping}
             />
         </div>
      </div>
    </div>
  );
}