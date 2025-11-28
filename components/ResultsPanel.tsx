"use client";

import { useMemo, useState } from "react";
import { getMatchGroups } from "@/lib/matching";
import { Ingredient, Cocktail } from "@/lib/types";
import { CocktailDialog } from "./CocktailDialog";
import { PlusIcon, MagnifyingGlassIcon } from "@heroicons/react/20/solid";

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
  
  // New State for Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // --- DERIVE STAPLES ---
  const stapleIds = useMemo(() => {
    return allIngredients
      .filter((i) => i.is_staple)
      .map((i) => i.id);
  }, [allIngredients]);

  // --- MATCHING ENGINE ---
  const { makeNow, almostThere } = useMemo(
    () =>
      getMatchGroups({
        cocktails: allCocktails,
        ownedIngredientIds: inventoryIds,
        stapleIngredientIds: stapleIds,
        substitutions: [],
      }),
    [allCocktails, inventoryIds, stapleIds]
  );

  // --- EXTRACT CATEGORIES ---
  // Get unique categories from the "makeNow" list so we only show relevant filters
  const availableCategories = useMemo(() => {
    const cats = new Set(makeNow.map(m => m.cocktail.category));
    return Array.from(cats).sort();
  }, [makeNow]);

  // --- SORTING & FILTERING ---
  const filteredAndSortedMakeNow = useMemo(() => {
    let results = [...makeNow];

    // 1. Filter by Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(r => r.cocktail.name.toLowerCase().includes(q));
    }

    // 2. Filter by Category
    if (activeCategory) {
      results = results.filter(r => r.cocktail.category === activeCategory);
    }

    // 3. Sort
    return results.sort((a, b) => {
      // Favorite drinks first
      if (a.cocktail.is_popular && !b.cocktail.is_popular) return -1;
      if (!a.cocktail.is_popular && b.cocktail.is_popular) return 1;
      // Then alphabetical
      return a.cocktail.name.localeCompare(b.cocktail.name);
    });
  }, [makeNow, searchQuery, activeCategory]);

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
                category: ing?.category || "Other",
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
    const stapleSet = new Set(stapleIds);
    
    return selectedCocktail.ingredients
      .filter((i) => !i.isOptional && !invSet.has(i.id) && !stapleSet.has(i.id))
      .map((i) => i.id);
  }, [selectedCocktail, inventoryIds, stapleIds]);

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
                <h2 className="text-2xl font-serif font-bold text-white">Ready to Mix</h2>
                <div className="bg-lime-500/10 border border-lime-500/20 text-lime-400 px-3 py-0.5 rounded-full text-sm font-bold font-mono">
                    {filteredAndSortedMakeNow.length}
                </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
                <input 
                    type="text" 
                    placeholder="Search cocktails..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-lime-500/50 transition-all"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-600" />
            </div>
        </div>

        {/* Category Filters */}
        {availableCategories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-4 -mx-1 px-1">
                <button 
                    onClick={() => setActiveCategory(null)} 
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${activeCategory === null ? "bg-lime-500 text-slate-900 border-lime-500" : "bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800"}`}
                >
                    All
                </button>
                {availableCategories.map(cat => (
                    <button 
                        key={cat} 
                        onClick={() => setActiveCategory(cat === activeCategory ? null : cat)} 
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${activeCategory === cat ? "bg-lime-500 text-slate-900 border-lime-500" : "bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800"}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
        )}

        {/* Empty State */}
        {filteredAndSortedMakeNow.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-800 rounded-2xl bg-slate-900/30 text-center">
            <div className="text-5xl mb-4 opacity-80">🍸</div>
            <h3 className="text-slate-200 font-semibold mb-2 text-lg">
                {makeNow.length === 0 ? "Your bar is looking a bit dry" : "No matches found"}
            </h3>
            <p className="text-slate-500 text-sm max-w-sm leading-relaxed mx-auto">
                {makeNow.length === 0 
                    ? "Add ingredients from the panel on the left to discover what you can make." 
                    : "Try adjusting your search or filters to see more results."}
            </p>
          </div>
        )}

        {/* Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedMakeNow.map(({cocktail}) => (
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

      {/* 2. SMART ADDITIONS */}
      {unlockPotential.length > 0 && (
      <div className="border-t border-slate-800/50 pt-10">
        <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-serif font-bold text-white">Smart Additions</h2>
            <span className="text-sm text-slate-500">Unlocks new recipes</span>
        </div>

        {/* 2 Columns Wide */}
        <div className="grid gap-4 sm:grid-cols-2">
             {unlockPotential.map(item => (
                 <div key={item.id} className="group flex flex-col p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-lime-500/30 transition-all h-full">
                    
                    <div className="flex items-start gap-4 mb-4">
                        {/* UNLOCKS BADGE */}
                        <div className="flex-shrink-0 w-14 h-14 bg-slate-800 rounded-xl flex flex-col items-center justify-center border border-white/5 group-hover:bg-slate-800/80 transition-colors">
                             <span className="text-xl font-bold text-lime-400 leading-none">+{item.count}</span>
                             <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Drinks</span>
                        </div>
                        
                        {/* NAME & CATEGORY */}
                        <div className="flex flex-col min-w-0 pt-1">
                            <h4 className="font-bold text-slate-100 text-lg leading-tight break-words">
                                {item.name}
                            </h4>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                                {item.category}
                            </span>
                        </div>
                    </div>
                    
                    {/* ADD BUTTON */}
                    <button
                        onClick={() => onAddToInventory(item.id)}
                        className="mt-auto w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-lime-500/10 text-lime-400 border border-lime-500/20 hover:bg-lime-500 hover:text-slate-900 hover:border-lime-500 transition-all font-bold text-xs uppercase tracking-wide"
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
