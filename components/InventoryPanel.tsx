"use client";

import { useMemo, useState } from "react";
import { Ingredient } from "@/lib/types";
import { Disclosure, Transition } from "@headlessui/react";
import { ChevronUpIcon } from "@heroicons/react/20/solid";

type Props = {
  ingredients: Ingredient[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
};

const CATEGORY_ORDER = [
  "Spirit", "Liqueur", "Wine", "Mixer", "Beer", "Bitters", "Garnish", "Syrup", "Citrus", "Other"
];

const TOP_SPIRITS = [
  "Vodka", "Gin", "Tequila", "White Rum", "Bourbon", "Whiskey", "Rum", "Mezcal", "Scotch"
];

const CATEGORY_ICONS: Record<string, string> = {
  "Spirit": "🥃", "Liqueur": "🏺", "Mixer": "🥤", "Garnish": "🍒",
  "Wine": "🍷", "Beer": "🍺", "Bitters": "💧", "Other": "📦",
  "Syrup": "🍯", "Citrus": "🍋"
};

export function InventoryPanel({ ingredients, selectedIds, onChange }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const selectedSet = useMemo(() => new Set<number>(selectedIds), [selectedIds]);

  const handleToggle = (id: number) => {
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  const { essentials, categorized, allCategories } = useMemo(() => {
    const essentialItems: Ingredient[] = [];
    const byCategory = new Map<string, Ingredient[]>();
    let filtered = ingredients;

    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = ingredients.filter(i => i.name.toLowerCase().includes(q));
    }

    if (activeFilter) {
        filtered = filtered.filter(i => i.category === activeFilter);
    }

    for (const ing of filtered) {
        if (TOP_SPIRITS.includes(ing.name) && !searchQuery && !activeFilter) {
            essentialItems.push(ing);
        }
        const key = ing.category || "Other";
        const list = byCategory.get(key) ?? [];
        list.push(ing);
        byCategory.set(key, list);
    }

    const sortedCategories = Array.from(byCategory.entries()).sort((a, b) => {
        const indexA = CATEGORY_ORDER.indexOf(a[0]);
        const indexB = CATEGORY_ORDER.indexOf(b[0]);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a[0].localeCompare(b[0]);
    });

    const allCats = Array.from(new Set(ingredients.map(i => i.category || "Other"))).sort((a, b) => {
         const indexA = CATEGORY_ORDER.indexOf(a);
         const indexB = CATEGORY_ORDER.indexOf(b);
         if (indexA !== -1 && indexB !== -1) return indexA - indexB;
         return a.localeCompare(b);
    });

    return { essentials: essentialItems, categorized: sortedCategories, allCategories: allCats };
  }, [ingredients, searchQuery, activeFilter]);

  return (
    <section className="bg-slate-900/50 border border-white/5 rounded-2xl flex flex-col h-[calc(100vh-6rem)] overflow-hidden shadow-xl shadow-black/20">
      
      <div className="p-4 space-y-3 border-b border-white/5 bg-slate-900/90 backdrop-blur z-20">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-serif font-bold text-slate-100 flex items-center gap-2">
                My Bar <span className="text-xs font-sans font-bold text-slate-900 bg-lime-400 px-2 py-0.5 rounded-full">{selectedIds.length}</span>
            </h2>
            {selectedIds.length > 0 && (
                <button onClick={() => onChange([])} className="text-xs font-medium text-slate-500 hover:text-red-400 transition-colors">
                    Reset
                </button>
            )}
        </div>
        
        <div className="relative group">
            <input 
                type="text" 
                placeholder="Find ingredients..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-slate-700 rounded-xl px-10 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-lime-500/50 focus:border-lime-500/50 transition-all"
            />
            <div className="absolute left-3 top-2.5 text-slate-600">🔍</div>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
            <button 
                onClick={() => setActiveFilter(null)} 
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all ${activeFilter === null ? "bg-lime-500 text-slate-900 border-lime-500" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"}`}
            >
                All
            </button>
            {allCategories.map(cat => (
                <button 
                    key={cat} 
                    onClick={() => setActiveFilter(cat === activeFilter ? null : cat)} 
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all ${activeFilter === cat ? "bg-lime-500 text-slate-900 border-lime-500" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"}`}
                >
                    {CATEGORY_ICONS[cat]} {cat}
                </button>
            ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-6">
        {!searchQuery && !activeFilter && essentials.length > 0 && (
            <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Essentials</h3>
                <div className="grid grid-cols-3 gap-2">
                    {essentials.map(ing => {
                        const isSelected = selectedSet.has(ing.id);
                        return (
                            <button
                                key={ing.id}
                                onClick={() => handleToggle(ing.id)}
                                className={`relative flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-200 ${
                                    isSelected
                                    ? "bg-lime-500/10 border-lime-500/50 text-lime-100 shadow-[0_0_10px_-2px_rgba(132,204,22,0.2)]"
                                    : "bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:border-slate-600"
                                }`}
                            >
                                <span className="text-2xl mb-1.5 filter drop-shadow-md transition-transform group-hover:scale-110">
                                    {ing.name === "Gin" ? "🌸" : ing.name === "Vodka" ? "🍸" : ing.name === "Tequila" ? "🌵" : (ing.name.includes("Whiskey") || ing.name.includes("Bourbon")) ? "🥃" : (ing.name.includes("Rum")) ? "🏴‍☠️" : "🍾"}
                                </span>
                                <span className="text-[10px] font-semibold leading-tight">{ing.name}</span>
                                {isSelected && (
                                    <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-lime-500 rounded-full shadow-[0_0_5px_rgba(132,204,22,0.8)]" />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>
        )}

        <div className="space-y-3">
            {categorized.map(([category, list]) => {
                const isSearching = searchQuery.length > 0 || activeFilter !== null;
                const hasSelection = list.some(i => selectedSet.has(i.id));

                return (
                    <Disclosure key={category} defaultOpen={isSearching || hasSelection}>
                        {({ open }) => (
                            <div className={`rounded-xl border transition-all duration-300 ${open ? 'bg-slate-900/50 border-slate-700' : 'bg-transparent border-transparent'}`}>
                                <Disclosure.Button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-800/50 transition-colors group">
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-lg opacity-80">{CATEGORY_ICONS[category] || "📦"}</span>
                                        <span className={`text-sm font-medium ${hasSelection ? 'text-lime-400' : 'text-slate-300 group-hover:text-white'}`}>
                                            {category}
                                        </span>
                                        {hasSelection && (
                                            <span className="bg-lime-500/10 text-lime-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                                {list.filter(i => selectedSet.has(i.id)).length}
                                            </span>
                                        )}
                                    </div>
                                    <ChevronUpIcon
                                        className={`${open ? 'rotate-180 transform' : ''} h-4 w-4 text-slate-500 transition-transform duration-200`}
                                    />
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
                                                 if (!searchQuery && !activeFilter && TOP_SPIRITS.includes(ing.name)) return null;
                                                 const isSelected = selectedSet.has(ing.id);
                                                 return (
                                                    <button
                                                        key={ing.id}
                                                        onClick={() => handleToggle(ing.id)}
                                                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left border ${
                                                            isSelected
                                                            ? 'bg-lime-500/10 border-lime-500/30 text-lime-100'
                                                            : 'bg-slate-950/40 border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                                        }`}
                                                    >
                                                        <span className="truncate pr-2">{ing.name}</span>
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
      </div>
    </section>
  );
}
