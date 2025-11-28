 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/app/page.tsx b/app/page.tsx
index 2ceebeb49c3b7a6009fcb12f9632a05e79ae7093..799cedbabf9181ed7e665c187e429551bf72d465 100644
--- a/app/page.tsx
+++ b/app/page.tsx
@@ -1,79 +1,87 @@
 "use client";
 
 import { useEffect, useState } from 'react';
 import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
 import { InventoryPanel } from '@/components/InventoryPanel';
 import { ResultsPanel } from '@/components/ResultsPanel';
 import { Ingredient, Cocktail } from '@/lib/types';
 import { loadInventory, saveInventory } from '@/lib/inventoryApi';
+import { isLikelyOptionalIngredient } from '@/lib/matching';
 
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
 
   // Load ingredient + cocktail data
   useEffect(() => {
     async function fetchData() {
       const { data: ingData } = await supabase
         .from('ingredients')
         .select('*')
         .order('name');
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
-          ingredients: d.cocktail_ingredients.map((ci: any) => ({
-            id: ci.ingredient.id,
-            name: ci.ingredient.name,
-            measure: ci.measure,
-          })),
+          ingredients: d.cocktail_ingredients.map((ci: any) => {
+            const ingredient = {
+              id: ci.ingredient.id,
+              name: ci.ingredient.name,
+              measure: ci.measure,
+            } as const;
+
+            return {
+              ...ingredient,
+              isOptional: isLikelyOptionalIngredient(ingredient),
+            };
+          }),
         }));
         setAllCocktails(formatted);
       }
 
       setDataLoading(false);
     }
 
     fetchData();
   }, [supabase]);
 
   // Load user-specific data (inventory, favorites, shopping list)
   useEffect(() => {
     if (!user) {
       setInventoryIds([]);
       setFavoriteIds([]);
       setShoppingList([]);
       return;
     }
 
     // ✅ FIX: Extract userId OUTSIDE async function so TS knows it's non-null
     const userId = user.id;
 
     async function loadUserData() {
       const { inventoryId: invId, ingredientIds } = await loadInventory(supabase);
       setInventoryId(invId);
 
EOF
)
