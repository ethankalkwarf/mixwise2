"use client";

import { useMemo, useState } from "react";
import { getMatchGroups } from "@/lib/matching";
import { Ingredient, Cocktail, SubstitutionRule } from "@/lib/types";
import { CocktailDialog } from "./CocktailDialog";

type Props = {
  inventoryIds: number[];
  allCocktails: Cocktail[];
  allIngredients: Ingredient[];
  shoppingList: number[];
  onToggleShoppingList: (id: number) => void;
  favoriteIds: number[];
  onToggleFavorite: (cocktailId: number) => void;
};

function normalizeName(name: string): string {
  return name.toLowerCase().trim();
}

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

  const stapleIds = useMemo(
    () => allIngredients.filter((i) => i.is_staple).map((i) => i.id),
    [allIngredients],
  );

  const substitutions: SubstitutionRule[] = useMemo(() => {
    const byName = new Map<string, Ingredient[]>();
    for (const ing of allIngredients) {
      const key = normalizeName(ing.name);
      const list = byName.get(key) ?? [];
      list.push(ing);
      byName.set(key, list);
    }
    const rules: SubstitutionRule[] = [];
    byName.forEach((list) => {
      if (list.length < 2) return;
      for (let i = 0; i < list.length; i++) {
        for (let j = 0; j < list.length; j++) {
          if (i === j) continue;
          rules.push({
            fromIngredientId: list[i].id,
            toIngredientId: list[j].id,
            strength: 1,
          });
        }
      }
    });
    return rules;
  }, [allIngredients]);

  const { makeNow, almostThere: almostThereGroups } = useMemo(
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
      .filter((i) => !i.isOptional && !invSet.has(i.id))
      .map((i) => i.id);
  }, [selectedCocktail, inventoryIds]);

  return (
    <section className="space-y-10 pb-20">
      <RecipeDialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        cocktail={selectedCocktail}
        missingIngredientIds={missingForSelected}
        inventoryIds={inventoryIds}
      />

      {/* 1. Ready to Mix */}
      <div>
        <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-serif font-bold text-white">Ready to Mix</h2>
            <div className="bg-lime-500/10 border border-lime-500/20 text-lime-400 px-3 py-0.5 rounded-full text-sm font-medium">
                {makeNow.length} Available
            </div>
        </div>

        {makeNow.length === 0 && (
          <div className="flex flex-col items-center justify-center p-10 border border-dashed border-slate-800 rounded-2xl bg-slate-900/30 text-center">
            <div className="text-4xl mb-3">🍸</div>
            <h3 className="text-slate-300 font-medium mb-1">Your bar is looking a bit dry</h3>
            <p className="text-slate-500 text-sm max-w-sm">
                Add ingredients from the panel on the left to discover recipes you can mix right now.
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
              <div className="relative h-48 w-full overflow-hidden bg-slate-800">
                {cocktail.image_url ? (
                  <>
                  <img
                    src={cocktail.image_url}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100"
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
                    className="absolute top-3 right-3 p-2 rounded-full bg-black/40 backdrop-blur hover:bg-black/60 transition-colors"
                >
                    <span className={`text-lg ${favoriteIds.includes(cocktail.id) ? "text-red-500" : "text-white/70"}`}>
                        {favoriteIds.includes(cocktail.id) ? "♥" : "♡"}
                    </span>
                </button>
              </div>
              
              <div className="p-4 flex-1 flex flex-col relative z-10 -mt-8">
                <div className="bg-slate-900/90 backdrop-blur rounded-xl p-3 border border-white/5 shadow-lg flex-1">
                    <h3 className="font-serif font-bold text-lg text-slate-100 mb-1 leading-tight">
                        {cocktail.name}
                    </h3>
                    <p className="text-xs text-lime-400 font-medium tracking-wide uppercase mb-2">
                        {cocktail.category}
                    </p>
                    <p className="text-xs text-slate-400 line-clamp-2">
                        {cocktail.ingredients.map((i) => i.name).join(", ")}
                    </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. One Ingredient Away */}
      {almostThereGroups.length > 0 && (
      <div>
        <div className="flex items-center gap-3 mb-6 mt-12 pt-8 border-t border-slate-800/50">
            <h2 className="text-2xl font-serif font-bold text-white">One Bottle Away</h2>
            <div className="bg-slate-800 text-slate-400 px-3 py-0.5 rounded-full text-sm font-medium">
                {almostThereGroups.length} Recipes
            </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {almostThereGroups.map(({ cocktail, missingRequiredIngredientIds }) => {
            const missingId = missingRequiredIngredientIds[0];
            const missingName = allIngredients.find(
              (i) => i.id === missingId,
            )?.name;
            const inShoppingList = shoppingList.includes(missingId);

            return (
              <div
                key={cocktail.id}
                onClick={() => openRecipe(cocktail)}
                className="cursor-pointer group flex flex-col rounded-2xl bg-slate-900/40 border border-slate-800 hover:bg-slate-900 hover:border-slate-600 transition-all duration-300"
              >
                 <div className="p-4 flex items-start justify-between gap-4">
                    <div>
                        <h3 className="font-bold text-slate-200 group-hover:text-white transition-colors">
                            {cocktail.name}
                        </h3>
                         <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                            With: {cocktail.ingredients.map((i) => i.name).join(", ")}
                        </p>
                    </div>
                    {cocktail.image_url && (
                        <img 
                            src={cocktail.image_url} 
                            className="w-12 h-12 rounded-lg object-cover bg-slate-800"
                            alt="" 
                        />
                    )}
                 </div>

                 <div className="mt-auto px-4 pb-4">
                    <div className="flex items-center justify-between bg-slate-950/50 rounded-lg p-2 border border-slate-800/50">
                        <div className="text-xs">
                            <span className="text-slate-500">Missing: </span>
                            <span className="text-red-400 font-medium">{missingName}</span>
                        </div>
                        <button
                            onClick={(e) => {
                            e.stopPropagation();
                            onToggleShoppingList(missingId);
                            }}
                            className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                            inShoppingList
                                ? "bg-amber-500/20 text-amber-500 border border-amber-500/20"
                                : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
                            }`}
                        >
                            {inShoppingList ? "On List" : "+ Shop"}
                        </button>
                    </div>
                 </div>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </section>
  );
}
