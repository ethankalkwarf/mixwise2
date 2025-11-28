"use client";

import { useMemo, useState } from "react";
import { getMatchGroups } from "@/lib/matching";
import { Ingredient, Cocktail, SubstitutionRule } from "@/lib/types";
import { CocktailDialog } from "./CocktailDialog";

type Props = {
  inventoryIds: number[];
  allCocktails: Cocktail[];
  allIngredients: Ingredient[];
  // Removed old shopping list props as we are switching to "Unlock" logic
  // shoppingList: number[];
  // onToggleShoppingList: (id: number) => void;
  favoriteIds: number[];
  onToggleFavorite: (cocktailId: number) => void;
  // Added ability to add to inventory from here
  onAddToInventory: (id: number) => void;
};

export function ResultsPanel({
  inventoryIds,
  allCocktails,
  allIngredients,
  favoriteIds,
  onToggleFavorite,
  onAddToInventory,
}: Props) {
  const [selectedCocktail, setSelectedCocktail] = useState<Cocktail | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Assuming staples logic is handled DB-side now (is_staple = true)
  // But we pass empty here for matching to rely on the DB flag logic if implemented in matching.ts
  // Or if matching.ts still expects stapleIds, we can fetch them.
  // For this "Unlock" view, we focus on non-staples.
  
  const { makeNow, almostThere } = useMemo(
    () =>
      getMatchGroups({
        cocktails: allCocktails,
        ownedIngredientIds: inventoryIds,
        stapleIngredientIds: [], // Staples should be marked in DB now
        substitutions: [], // Simplification for now
      }),
    [allCocktails, inventoryIds]
  );

  // --- "UNLOCK" LOGIC ---
  // Calculate which missing ingredients unlock the most drinks
  const unlockPotential = useMemo(() => {
    const counts = new Map<number, { count: number; drinks: string[] }>();

    almostThere.forEach(match => {
        const missingId = match.missingRequiredIngredientIds[0];
        if (!missingId) return;

        const current = counts.get(missingId) || { count: 0, drinks: [] };
        current.count += 1;
        if (current.drinks.length < 3) {
            current.drinks.push(match.cocktail.name);
        }
        counts.set(missingId, current);
    });

    // Convert to array and sort by impact
    return Array.from(counts.entries())
        .map(([id, data]) => {
            const ing = allIngredients.find(i => i.id === id);
            return {
                id,
                name: ing?.name || "Unknown",
                category: ing?.category || "Other",
                count: data.count,
                drinks: data.drinks
            };
        })
        .sort((a, b) => b.count - a.count); // Highest impact first

  }, [almostThere, allIngredients]);


  function openRecipe(cocktail: Cocktail) {
    setSelectedCocktail(cocktail);
    setModalOpen(true);
  }

  const missingForSelected = useMemo(() => {
    if (!selectedCocktail) return [];
    const invSet = new Set(inventoryIds);
    return selectedCocktail.ingredients
      .filter((i) => !i.isOptional && !invSet.has(i.id))
      .map((i) => i.id);
  }, [selectedCocktail, inventoryIds]);

  return (
    <section className="space-y-8 pb-24">
      <CocktailDialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        cocktail={selectedCocktail}
        missingIngredientIds={missingForSelected}
        inventoryIds={inventoryIds}
      />

      {/* 1. Ready to Mix */}
      <div>
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <h2 className="text-2xl font-serif font-bold text-white">Ready to Mix</h2>
                <div className="bg-lime-500/10 border border-lime-500/20 text-lime-400 px-3 py-0.5 rounded-full text-sm font-bold font-mono">
                    {makeNow.length}
                </div>
            </div>
        </div>

        {makeNow.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-800 rounded-2xl bg-slate-900/30 text-center">
            <div className="text-5xl mb-4 opacity-80">🍸</div>
            <h3 className="text-slate-200 font-semibold mb-2 text-lg">Your bar is looking a bit dry</h3>
            <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
                Add ingredients from the panel on the left to discover what you can make.
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {makeNow.map(({cocktail}) => (
            <div
              key={cocktail.id}
              onClick={() => openRecipe(cocktail)}
              className="cursor-pointer group relative flex flex-col overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 hover:border-lime-500/40 hover:shadow-xl hover:shadow-lime-900/10 transition-all duration-300"
            >
              {/* Image Area */}
              <div className="relative h-48 w-full overflow-hidden bg-slate-800">
                {cocktail.image_url ? (
                  <>
                  <img
                    src={cocktail.image_url}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />
                  </>
                ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-700 text-4xl">🥃</div>
                )}
                <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(cocktail.id);
                    }}
                    className="absolute top-3 right-3 p-2 rounded-full bg-black/40 backdrop-blur hover:bg-black/60 transition-colors text-white/80 hover:text-red-500"
                >
                    {favoriteIds.includes(cocktail.id) ? "♥" : "♡"}
                </button>
              </div>
              
              {/* Content Area */}
              <div className="p-4 flex-1 flex flex-col relative z-10 -mt-12">
                <div className="bg-slate-900/95 backdrop-blur-md rounded-xl p-4 border border-white/5 shadow-lg flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <p className="text-[10px] text-lime-400 font-bold tracking-wide uppercase mb-1">
                                {cocktail.category}
                            </p>
                            <h3 className="font-serif font-bold text-lg text-slate-100 leading-tight">
                                {cocktail.name}
                            </h3>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-auto">
                        {cocktail.ingredients.map((i) => i.name).join(", ")}
                    </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Unlock Opportunities (Replaces Shop) */}
      {unlockPotential.length > 0 && (
      <div className="mt-12 pt-8 border-t border-slate-800/50">
        <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-serif font-bold text-white">Smart Additions</h2>
            <span className="text-sm text-slate-500">Items that unlock the most new drinks</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
             {unlockPotential.map(item => (
                 <div key={item.id} className="group flex items-center justify-between p-1 pr-2 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-800 h-16 w-16 rounded-l-xl flex items-center justify-center text-2xl border-r border-white/5 group-hover:bg-slate-800/80 transition-colors">
                             <span className="text-lg font-bold text-lime-400">+{item.count}</span>
                        </div>
                        <div className="py-2">
                            <h4 className="font-bold text-slate-200 group-hover:text-white transition-colors">{item.name}</h4>
                            <p className="text-[10px] text-slate-500">
                                Unlocks: {item.drinks.slice(0, 2).join(", ")} {item.drinks.length > 2 && "& more"}
                            </p>
                        </div>
                    </div>
                    
                    <button
                        onClick={() => onAddToInventory(item.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-lime-500/10 text-lime-400 text-xs font-bold border border-lime-500/20 hover:bg-lime-500 hover:text-slate-900 hover:border-lime-500 transition-all"
                    >
                        Add
                    </button>
                 </div>
             ))}
        </div>
      </div>
      )}
    </section>
  );
}
