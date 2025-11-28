"use client";

import { useMemo, useState } from "react";
import { Ingredient } from "@/lib/types";
import { Disclosure, Transition } from "@headlessui/react";

type Props = {
  ingredients: Ingredient[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
};

// Common ingredients to feature at the top for quick access
const TOP_SPIRITS = [
  "Vodka",
  "Gin",
  "Tequila",
  "White Rum",
  "Bourbon",
  "Whiskey",
  "Rum",
  "Mezcal",
  "Scotch"
];

// Helper icon mapping for categories
const CATEGORY_ICONS: Record<string, string> = {
  "Spirit": "🥃",
  "Liqueur": "🏺",
  "Mixer": "🥤",
  "Garnish": "🍒",
  "Wine": "🍷",
  "Beer": "🍺",
  "Bitters": "💧",
  "Other": "📦"
};

export function InventoryPanel({ ingredients, selectedIds, onChange }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const selectedSet = useMemo(
    () => new Set<number>(selectedIds),
    [selectedIds],
  );

  const handleToggle = (id: number) => {
    const next = new Set(selectedSet);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(Array.from(next));
  };

  // Separate "Essentials" from the rest
  const { essentials, categorized } = useMemo(() => {
    const essentialItems: Ingredient[] = [];
    const byCategory = new Map<string, Ingredient[]>();

    // 1. Filter by Search
    let filtered = ingredients;
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = ingredients.filter(i => i.name.toLowerCase().includes(q));
    }

    // 2. Filter by Chip/Pill
    if (activeFilter) {
        filtered = filtered.filter(i => i.category === activeFilter);
    }

    for (const ing of filtered) {
        // Check if it's a "Top Spirit" (exact match or close enough for now)
        if (TOP_SPIRITS.includes(ing.name) && !searchQuery && !activeFilter) {
            essentialItems.push(ing);
        }

        const key = ing.category || "Other";
        const list = byCategory.get(key) ?? [];
        list.push(ing);
        byCategory.set(key, list);
    }

    // Sort essentials by our predefined list order
    essentialItems.sort((a, b) => TOP_SPIRITS.indexOf(a.name) - TOP_SPIRITS.indexOf(b.name));

    return { 
        essentials: essentialItems,
        categorized: Array.from(byCategory.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    };
  }, [ingredients, searchQuery, activeFilter]);

  // Available categories for filter chips
  const allCategories = useMemo(() => {
      const cats = new Set(ingredients.map(i => i.category || "Other"));
      return Array.from(cats).sort();
  }, [ingredients]);

  return (
    <section className="bg-slate-900/50 border border-white/5 rounded-2xl flex flex-col h-[calc(100vh-6rem)] overflow-hidden">
      
      {/* --- HEADER & SEARCH --- */}
      <div className="p-4 space-y-4 border-b border-white/5 bg-slate-900/80 backdrop-blur z-20">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-serif font-bold text-slate-100 flex items-center gap-2">
                My Bar <span className="text-xs font-sans font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{selectedIds.length}</span>
            </h2>
            {selectedIds.length > 0 && (
                <button 
                    onClick={() => onChange([])}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                    Clear All
                </button>
            )}
        </div>
        
        <div className="relative group">
            <input 
                type="text" 
                placeholder="Search ingredients..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/50 focus:border-transparent transition-all"
            />
            <div className="absolute right-3 top-2.5 text-slate-600 group-focus-within:text-lime-500 transition-colors">
                🔍
            </div>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            <button
                onClick={() => setActiveFilter(null)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    activeFilter === null 
                    ? "bg-lime-500/10 border-lime-500/50 text-lime-400" 
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                }`}
            >
                All
            </button>
            {allCategories.map(cat => (
                <button
                    key={cat}
                    onClick={() => setActiveFilter(cat === activeFilter ? null : cat)}
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                        activeFilter === cat 
                        ? "bg-lime-500/10 border-lime-500/50 text-lime-400" 
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                    }`}
                >
                    {CATEGORY_ICONS[cat]} {cat}
                </button>
            ))}
        </div>
      </div>

      {/* --- SCROLLABLE CONTENT --- */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-6">
        
        {/* Essentials Grid (Only show if no search/filter active) */}
        {!searchQuery && !activeFilter && essentials.length > 0 && (
            <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">
                    Essentials
                </h3>
                <div className="grid grid-cols-3 gap-2">
                    {essentials.map(ing => {
                        const isSelected = selectedSet.has(ing.id);
                        return (
                            <button
                                key={ing.id}
                                onClick={() => handleToggle(ing.id)}
                                className={`relative flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                                    isSelected
                                    ? "bg-lime-500/20 border-lime-500/50 text-lime-100 shadow-[0_0_15px_-3px_rgba(132,204,22,0.3)]"
                                    : "bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-600"
                                }`}
                            >
                                <span className="text-2xl mb-1 filter drop-shadow-lg">
                                    {ing.name === "Vodka" ? "🍸" : 
                                     ing.name === "Gin" ? "🌲" :
                                     ing.name === "Tequila" ? "🌵" :
                                     ing.name === "Whiskey" || ing.name === "Bourbon" ? "🥃" :
                                     ing.name === "Rum" || ing.name === "White Rum" ? "🏴‍☠️" : "🍾"}
                                </span>
                                <span className="text-[10px] font-medium leading-tight">{ing.name}</span>
                                {isSelected && (
                                    <div className="absolute top-1 right-1 w-2 h-2 bg-lime-500 rounded-full shadow-sm" />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>
        )}

        {/* Categorized Lists (Accordions) */}
        <div className="space-y-3">
            {categorized.map(([category, list]) => {
                // Skip if empty
                if(list.length === 0) return null;
                
                // Count selected in this category
                const selectedCount = list.filter(i => selectedSet.has(i.id)).length;
                const isExpandedDefault = searchQuery.length > 0 || activeFilter !== null;

                return (
                    <Disclosure key={category} defaultOpen={isExpandedDefault || selectedCount > 0}>
                        {({ open }) => (
                            <div className={`rounded-xl border transition-all ${open ? 'bg-slate-900 border-slate-700' : 'bg-transparent border-transparent'}`}>
                                <Disclosure.Button className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors group">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{CATEGORY_ICONS[category] || "📦"}</span>
                                        <span className={`text-sm font-medium ${selectedCount > 0 ? 'text-lime-400' : 'text-slate-300'}`}>
                                            {category}
                                        </span>
                                        {selectedCount > 0 && (
                                            <span className="bg-lime-500/20 text-lime-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                                {selectedCount}
                                            </span>
                                        )}
                                    </div>
                                    <span className={`text-slate-600 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
                                </Disclosure.Button>

                                <Transition
                                    enter="transition duration-100 ease-out"
                                    enterFrom="transform scale-95 opacity-0"
                                    enterTo="transform scale-100 opacity-100"
                                    leave="transition duration-75 ease-out"
                                    leaveFrom="transform scale-100 opacity-100"
                                    leaveTo="transform scale-95 opacity-0"
                                >
                                    <Disclosure.Panel className="px-3 pb-3 pt-1">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                            {list.map(ing => {
                                                const isSelected = selectedSet.has(ing.id);
                                                // Don't duplicate items shown in Essentials grid unless searching
                                                if (!searchQuery && !activeFilter && TOP_SPIRITS.includes(ing.name)) return null;

                                                return (
                                                    <button
                                                        key={ing.id}
                                                        onClick={() => handleToggle(ing.id)}
                                                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all text-left border ${
                                                            isSelected
                                                            ? 'bg-lime-500/10 border-lime-500/30 text-lime-100'
                                                            : 'bg-slate-950/30 border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                                        }`}
                                                    >
                                                        <span className="truncate">{ing.name}</span>
                                                        {isSelected && <span className="text-lime-500">✓</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </Disclosure.Panel>
                                </Transition>
                            </div>
                        )}
                    </Disclosure>
                );
            })}
        </div>

        {categorized.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-sm">
                No ingredients found matching "{searchQuery}"
            </div>
        )}
      </div>
    </section>
  );
}
