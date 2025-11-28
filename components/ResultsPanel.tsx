"use client";

import { useMemo, useState } from "react";
import { getMatchGroups } from "@/lib/matching";
import { Ingredient, Cocktail } from "@/lib/types";
import { CocktailDialog } from "./CocktailDialog";
import { PlusIcon } from "@heroicons/react/20/solid";

type Props = {
  inventoryIds: number[];
  allCocktails: Cocktail[];
  allIngredients: Ingredient[];
  favoriteIds: number[];
  onToggleFavorite: (cocktailId: number) => void;
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

  // --- MATCHING ENGINE ---
  const { makeNow, almostThere } = useMemo(
    () =>
      getMatchGroups({
        cocktails: allCocktails,
        ownedIngredientIds: inventoryIds,
        stapleIngredientIds: [], 
        substitutions: [],
      }),
    [allCocktails, inventoryIds]
  );

  // --- SORTING & UNLOCK LOGIC ---
  const sortedMakeNow = useMemo(() => {
    return [...makeNow].sort((a, b) => {
      // Popular drinks first
      if (a.cocktail.is_popular && !b.cocktail.is_popular) return -1;
      if (!a.cocktail.is_popular && b.cocktail.is_popular) return 1;
      // Then alphabetical
      return a.cocktail.name.localeCompare(b.cocktail.name);
    });
  }, [makeNow]);

  const unlockPotential = useMemo(() => {
    const immediateUnlockCounts = new Map<number, { count: number; drinks: string[] }>();
    almostThere.forEach(match => {
        const missingId = match.missingRequiredIngredientIds[0];
        if (!missingId) return;
        const current = immediateUnlockCounts.get(missingId) || { count: 0, drinks: [] };
        current.count += 1;
        if (current.drinks.length < 3) current.drinks.push(match.cocktail.name);
        immediateUnlockCounts.set(missingId, current);
    });

    const totalUsageCounts = new Map<number, number>();
    allCocktails.forEach(c => {
        c.ingredients.forEach(ing => {
            totalUsageCounts.set(ing.id, (totalUsageCounts.get(ing.id) || 0) + 1);
        });
    });

    return Array.from(immediateUnlockCounts.entries())
        .map(([id, data]) => {
            const ing = allIngredients.find(i => i.id === id);
            return {
                id,
                name: ing?.name || "Unknown",
                count: data.count,
                totalUsage: totalUsageCounts.get(id) || 0,
                drinks: data.drinks
            };
        })
        .sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count;
            return b.totalUsage - a.totalUsage;
        });

  }, [almostThere, allCocktails, allIngredients]);

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
    <section className="space-y-10 pb-24">
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
                    {sortedMakeNow.length}
                </div>
            </div>
        </div>

        {sortedMakeNow.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-800 rounded-2xl bg-slate-900/30 text-center">
            <div className="text-5xl mb-4 opacity-80">🍸</div>
            <h3 className="text-slate-200 font-semibold mb-2 text-lg">Your bar is looking a bit dry</h3>
            <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
                Add ingredients from the panel on the left to discover what you can make.
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedMakeNow.map(({cocktail}) => (
            <div
              key={cocktail.id}
              onClick={() => openRecipe(cocktail)}
              className="cursor-pointer group relative flex flex-col overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 hover:border-lime-500/40 hover:shadow-xl hover:shadow-lime-900/10 transition-all duration-300"
            >
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
                
                {/* Popular Badge - Text changed to FAVORITE */}
                {cocktail.is_popular && (
                    <div className="absolute top-3 left-3 bg-amber-500/90 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded shadow-lg backdrop-blur-sm flex items-center gap-1 z-20">
                        ★ FAVORITE
                    </div>
                )}

                <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(cocktail.id);
                    }}
                    className="absolute top-3 right-3 p-2 rounded-full bg-black/40 backdrop-blur hover:bg-black/60 transition-colors text-white/80 hover:text-red-500 z-20"
                >
                    {favoriteIds.includes(cocktail.id) ? "♥" : "♡"}
                </button>
              </div>
              
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

      {/* 2. Unlock Opportunities */}
      {unlockPotential.length > 0 && (
      <div className="mt-12 pt-8 border-t border-slate-800/50">
        <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-serif font-bold text-white">Smart Additions</h2>
            <span className="text-sm text-slate-500">Items that unlock the most new drinks</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
             {unlockPotential.map(item => (
                 // Updated padding here (p-2 pr-3) to prevent button overflow
                 <div key={item.id} className="group flex items-center justify-between p-2 pr-3 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-all">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="bg-slate-800 h-16 w-16 rounded-xl flex flex-col items-center justify-center border border-white/5 group-hover:bg-slate-800/80 transition-colors flex-shrink-0">
                             <span className="text-lg font-bold text-lime-400">+{item.count}</span>
                             <span className="text-[9px] text-slate-500 uppercase tracking-wide">New</span>
                        </div>
                        <div className="py-1 min-w-0 flex-1">
                            <h4 className="font-bold text-slate-200 group-hover:text-white transition-colors truncate">{item.name}</h4>
                            <div className="flex flex-col gap-0.5">
                                <p className="text-[10px] text-slate-500 truncate">
                                    Unlocks: {item.drinks.slice(0, 1).join("")} {item.drinks.length > 1 && `& ${item.drinks.length - 1} more`}
                                </p>
                                <p className="text-[10px] text-slate-600">
                                    Used in {item.totalUsage} total recipes
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <button
                        onClick={() => onAddToInventory(item.id)}
                        className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 ml-2 rounded-lg bg-lime-500/10 text-lime-400 text-xs font-bold border border-lime-500/20 hover:bg-lime-500 hover:text-slate-900 hover:border-lime-500 transition-all"
                    >
                        <PlusIcon className="w-3 h-3" /> Add
                    </button>
                 </div>
             ))}
        </div>
      </div>
      )}
    </section>
  );
}
