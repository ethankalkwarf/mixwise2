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

// Prioritized Category Order
const CATEGORY_ORDER = [
  "Spirit",
  "Liqueur",
  "Wine",
  "Mixer",
  "Beer",
  "Bitters",
  "Garnish",
  "Syrup",
  "Citrus",
  "Other"
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
        // Essentials logic
        if (TOP_SPIRITS.includes(ing.name) && !searchQuery && !activeFilter) {
            essentialItems.push(ing);
        }
        
        const key = ing.category || "Other";
        const list = byCategory.get(key) ?? [];
        list.push(ing);
        byCategory.set(key, list);
    }

    // Sort Categories by defined order
    const sortedCategories = Array.from(byCategory.entries()).sort((a, b) => {
        const indexA = CATEGORY_ORDER.indexOf(a[0]);
        const indexB = CATEGORY_ORDER.indexOf(b[0]);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a[0].localeCompare(b[0]);
    });

    // Sort filter chips
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
      
      {/* Header & Search */}
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
                className="w-full bg-black/40 border border-slate-700 rounded-xl px-10
