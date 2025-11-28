 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/components/ResultsPanel.tsx b/components/ResultsPanel.tsx
index 099a759879cf87b7cd9856bc6caf7d50ebdbeb41..5c0cf38299344945b4d6268b722eef8a0eeb2c8c 100644
--- a/components/ResultsPanel.tsx
+++ b/components/ResultsPanel.tsx
@@ -1,96 +1,96 @@
 "use client";
 
 import { useMemo, useState } from "react";
-import { getMatchGroups } from "@/lib/matching";
-import { Ingredient, Cocktail, SubstitutionRule } from "@/lib/types";
+import {
+  buildSubstitutionRulesFromIngredients,
+  getMatchGroups,
+  isLikelyOptionalIngredient,
+} from "@/lib/matching";
+import { Ingredient, Cocktail } from "@/lib/types";
 import { RecipeDialog } from "./RecipeDialog";
 
 // This version of ResultsPanel uses the new matching engine.
 // It:
 // - Treats is_staple ingredients as always available.
 // - Uses getMatchGroups to get "Ready to Mix" and "One Away".
 // - Drops the old Best Upgrades section for now.
 
 type Props = {
   inventoryIds: number[];
   allCocktails: Cocktail[];
   allIngredients: Ingredient[];
   shoppingList: number[];
   onToggleShoppingList: (id: number) => void;
   favoriteIds: number[];
   onToggleFavorite: (cocktailId: number) => void;
 };
 
 export function ResultsPanel({
   inventoryIds,
   allCocktails,
   allIngredients,
   shoppingList,
   onToggleShoppingList,
   favoriteIds,
   onToggleFavorite,
 }: Props) {
   const [selectedCocktail, setSelectedCocktail] = useState<Cocktail | null>(null);
   const [modalOpen, setModalOpen] = useState(false);
 
   // IDs of ingredients treated as always available (staples)
   const stapleIds = useMemo(
     () => allIngredients.filter((i) => i.is_staple).map((i) => i.id),
     [allIngredients],
   );
 
-  // Static substitution rules for now. These can be expanded later or moved to the DB.
-  const substitutions: SubstitutionRule[] = useMemo(
-    () => [
-      // Example: trivial self rule for bourbon (id 5); expand with real IDs later.
-      { fromIngredientId: 5, toIngredientId: 5, strength: 1 },
-    ],
-    [],
+  const substitutions = useMemo(
+    () => buildSubstitutionRulesFromIngredients(allIngredients),
+    [allIngredients],
   );
 
   const { makeNow, almostThere } = useMemo(
     () =>
       getMatchGroups({
         cocktails: allCocktails,
         ownedIngredientIds: inventoryIds,
         stapleIngredientIds: stapleIds,
         substitutions,
       }),
     [allCocktails, inventoryIds, stapleIds, substitutions],
   );
 
   function openRecipe(cocktail: Cocktail) {
     setSelectedCocktail(cocktail);
     setModalOpen(true);
   }
 
   const missingForSelected = useMemo(() => {
     if (!selectedCocktail) return [];
     const invSet = new Set(inventoryIds);
     return selectedCocktail.ingredients
-      .filter((i) => !i.isOptional && !invSet.has(i.id))
+      .filter((i) => !isLikelyOptionalIngredient(i) && !invSet.has(i.id))
       .map((i) => i.id);
   }, [selectedCocktail, inventoryIds]);
 
   return (
     <section className="space-y-8 pb-20">
       <RecipeDialog
         isOpen={modalOpen}
         onClose={() => setModalOpen(false)}
         cocktail={selectedCocktail}
         missingIngredientIds={missingForSelected}
         inventoryIds={inventoryIds}
       />
 
       {/* 1. Ready to Mix */}
       <div>
         <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
           ✅ Ready to Mix
           <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
             {makeNow.length}
           </span>
         </h2>
 
         {makeNow.length === 0 && (
           <div className="p-6 border border-dashed border-slate-700 rounded-xl text-center text-slate-500 text-sm">
             Add ingredients to your bar to see what you can make!
 
EOF
)
