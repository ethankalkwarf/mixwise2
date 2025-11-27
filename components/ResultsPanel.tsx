"use client";

import { useMemo, useState } from "react";
import { getMatchGroups } from "@/lib/matching";
import { Ingredient, Cocktail, SubstitutionRule } from "@/lib/types";
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

  // Static substitution rules for now. These can be expanded later or moved to the DB.
  const substitutions: SubstitutionRule[] = useMemo(
    () => [
      // Example: trivial self rule for bourbon (id 5); expand with real IDs later.
      { fromIngredientId: 5, toIngredientId: 5, strength: 1 },
    ],
    [],
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
      .filter((i) => !i.isOptional && !invSet.has(i.id))
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
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {makeNow.map(({ cocktail }) => (
            <div
              key={cocktail.id}
              onClick={() => openRecipe(cocktail)}
              className="cursor-pointer group flex items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-lime-500/50 hover:bg-slate-800 transition-all"
            >
              <div className="w-16 h-16 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0">
                {cocktail.image_url && (
                  <img
                    src={cocktail.image_url}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-slate-100 truncate">
                    {cocktail.name}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(cocktail.id);
                    }}
                    className={`text-lg ${
                      favoriteIds.includes(cocktail.id)
                        ? "text-red-500"
                        : "text-slate-600 hover:text-slate-400"
                    }`}
                  >
                    ♥
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {cocktail.ingredients.map((i) => i.name).join(", ")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. One Ingredient Away */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          🛍️ One Away
          <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
            {almostThere.length}
          </span>
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          {almostThere.map(({ cocktail, missingRequiredIngredientIds }) => {
            const missingId = missingRequiredIngredientIds[0];
            const missingName = allIngredients.find((i) => i.id === missingId)?.name;
            const inShoppingList = shoppingList.includes(missingId);

            return (
              <div
                key={cocktail.id}
                onClick={() => openRecipe(cocktail)}
                className="cursor-pointer group p-3 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-600 transition-all"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-slate-200">{cocktail.name}</h3>
                  <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden">
                    {cocktail.image_url && (
                      <img
                        src={cocktail.image_url}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between bg-black/20 p-2 rounded-lg">
                  <span className="text-xs text-red-300">
                    Missing: <span className="font-semibold">{missingName}</span>
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleShoppingList(missingId);
                    }}
                    className={`text-[10px] px-2 py-1 rounded border ${
                      inShoppingList
                        ? "bg-amber-500 text-black border-amber-600"
                        : "bg-transparent text-slate-400 border-slate-600 hover:border-slate-400"
                    }`}
                  >
                    {inShoppingList ? "In List" : "+ Shop"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Best Upgrades section removed for now; will be replaced with a new suggestion engine later. */}
    </section>
  );
}
