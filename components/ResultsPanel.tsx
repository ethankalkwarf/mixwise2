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

  // --- SORTING ---
  const sortedMakeNow = useMemo(() => {
    return [...makeNow].sort((a, b) => {
      // 1. Popularity
      if (a.cocktail.is_popular && !b.cocktail.is_popular) return -1;
      if (!a.cocktail.is_popular && b.cocktail.is_popular) return 1;
      // 2. Alphabetical
      return a.cocktail.name.localeCompare(b.cocktail.name);
    });
  }, [makeNow]);

  // --- SMART ADDITIONS LOGIC ---
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
    <section className="space-y-12 pb-24">
      <CocktailDialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        cocktail={selectedCocktail}
        missingIngredientIds={missingForSelected}
        inventoryIds={inventoryIds}
      />

      {/* 1. READY TO MIX */}
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

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sortedMakeNow.map(({cocktail}) => (
            <div
              key={cocktail.id}
              onClick={() => openRecipe(cocktail)}
              className="cursor-pointer group relative flex flex-col overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 hover:border-lime-500/40 hover:shadow-xl hover:shadow-lime-900/10 transition-all duration-300"
            >
              <div className="relative h-56 w-full overflow-hidden bg-slate-800">
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
                
                {/* FAVORITE LABEL */}
                {cocktail.is_popular && (
                    <div className="absolute top-3 left-3 bg-amber-500 text-slate-950 text-[10px] font-bold px-2 py-1 rounded shadow-lg backdrop-blur-sm flex items-center gap-1 z-20 tracking-wider">
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
              
              <div className="p-5 flex-1 flex flex-col relative z-10 -mt-16">
                <div className="bg-slate-950/80 backdrop-blur-md rounded-xl p-4 border border-white/10 shadow-lg flex-1 flex flex-col">
                    <div className="mb-2">
                        <p className="text-[10px] text-lime-400 font-bold tracking-widest uppercase mb-1">
                            {cocktail.category}
                        </p>
                        <h3 className="font-serif font-bold text-xl text-slate-100 leading-tight">
                            {cocktail.name}
                        </h3>
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

      {/* 2. SMART ADDITIONS (Refined Design) */}
      {unlockPotential.length > 0 && (
      <div className="border-t border-slate-800/50 pt-10">
        <div className="mb-6">
            <h2 className="text-2xl font-serif font-bold text-white mb-1">Smart Additions</h2>
            <p className="text-sm text-slate-400">Buy these bottles to unlock the most new recipes immediately.</p>
        </div>

        {/* Changed grid to 2 cols for more width, cards are now flex-row */}
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
             {unlockPotential.map(item => (
                 <div key={item.id} className="group relative flex flex-row items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-600 transition-all overflow-hidden">
                    
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* UNLOCKS BADGE */}
                        <div className="relative flex-shrink-0 w-16 h-16 bg-slate-800 rounded-xl flex flex-col items-center justify-center border border-white/5">
                             <span className="text-xl font-bold text-lime-400 leading-none">+{item.count}</span>
                             <span className="text-[9px] font-bold text-slate-500 uppercase mt-1">Unlocks</span>
                        </div>
                        
                        {/* TEXT INFO */}
                        <div className="flex flex-col min-w-0 pr-2">
                            <h4 className="font-bold text-slate-100 text-base leading-snug whitespace-normal break-words">
                                {item.name}
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-1 truncate">
                                <span className="text-lime-500/80">Makes:</span> {item.drinks.slice(0, 2).join(", ")}{item.drinks.length > 2 && "..."}
                            </p>
                            <p className="text-[10px] text-slate-600 mt-0.5">
                                Used in {item.totalUsage} total recipes
                            </p>
                        </div>
                    </div>
                    
                    {/* ACTION BUTTON - Explicit Text */}
                    <button
                        onClick={() => onAddToInventory(item.id)}
                        className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-lime-500/10 text-lime-400 border border-lime-500/20 hover:bg-lime-500 hover:text-slate-900 hover:border-lime-500 transition-all font-bold text-xs uppercase tracking-wide group-hover:shadow-lg group-hover:shadow-lime-500/20"
                    >
                        <PlusIcon className="w-4 h-4" /> 
                        Add to Bar
                    </button>
                 </div>
             ))}
        </div>
      </div>
      )}
    </section>
  );
}
