"use client";

import { useMemo, useState } from "react";
import { Ingredient } from "@/lib/types";

type Props = {
  ingredients: Ingredient[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
};

export function InventoryPanel({ ingredients, selectedIds, onChange }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  
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

  const grouped = useMemo(() => {
    const byCategory = new Map<string, Ingredient[]>();
    // Filter first
    const filtered = ingredients.filter(i => 
      i.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    for (const ing of filtered) {
      const key = ing.category || "Other";
      const list = byCategory.get(key) ?? [];
      list.push(ing);
      byCategory.set(key, list);
    }
    
    // Sort categories, but keep "Other" last if you prefer
    return Array.from(byCategory.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  }, [ingredients, searchQuery]);

  return (
    <section className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 lg:h-[calc(100vh-6rem)] flex flex-col">
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-serif font-bold text-slate-100">My Bar</h2>
            <span className="text-xs font-medium text-slate-500 bg-slate-800 px-2 py-1 rounded-full">
                {selectedIds.length} Selected
            </span>
        </div>
        
        <div className="relative">
            <input 
                type="text" 
                placeholder="Search ingredients..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/50"
            />
             <svg className="w-4 h-4 absolute right-3 top-2.5 text-slate-600 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin space-y-6">
        {grouped.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No ingredients found.</p>
        ) : grouped.map(([category, list]) => (
          <div key={category}>
            <h3 className="sticky top-0 bg-slate-900/95 backdrop-blur py-2 text-xs font-bold tracking-wider text-lime-400 uppercase z-10 border-b border-white/5 mb-2">
              {category}
            </h3>
            <div className="grid grid-cols-1 gap-1">
              {list.map((ing) => {
                const checked = selectedSet.has(ing.id);
                return (
                  <button
                    key={ing.id}
                    onClick={() => handleToggle(ing.id)}
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all text-left ${
                        checked 
                        ? 'bg-lime-500/10 text-lime-100' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span className="truncate">{ing.name}</span>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        checked ? 'bg-lime-500 border-lime-500' : 'border-slate-700 group-hover:border-slate-500'
                    }`}>
                        {checked && <svg className="w-3 h-3 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
