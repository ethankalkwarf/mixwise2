"use client";

import { useMemo, useState } from 'react';
import { Ingredient } from '@/lib/types';

type Props = {
  ingredients: Ingredient[];
  selectedIds: number[];
  onChange: (nextIds: number[]) => void;
};

const CATEGORIES = ['Spirit', 'Liqueur', 'Mixer', 'Citrus', 'Garnish', 'Others'];

export function InventoryPanel({ ingredients, selectedIds, onChange }: Props) {
  const [activeTab, setActiveTab] = useState('Spirit');
  const [search, setSearch] = useState('');

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filteredIngredients = useMemo(() => {
    return ingredients.filter(ing => {
      if (search) {
        return ing.name.toLowerCase().includes(search.toLowerCase());
      }
      if (activeTab === 'Others') {
        return !['Spirit', 'Liqueur', 'Mixer', 'Citrus', 'Garnish'].includes(ing.category || '');
      }
      return ing.category === activeTab;
    });
  }, [ingredients, activeTab, search]);

  function toggle(id: number) {
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  }

  return (
    <section className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden h-fit">
      <div className="p-4 border-b border-slate-800 bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-100 mb-4">My Bar Inventory</h2>
        
        <input 
            type="text" 
            placeholder="Search ingredients..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-lime-500 mb-4"
        />

        {!search && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map(cat => (
                <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    activeTab === cat 
                    ? 'bg-lime-500 text-slate-950' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
                >
                {cat}
                </button>
            ))}
            </div>
        )}
      </div>

      <div className="p-4 max-h-[60vh] overflow-y-auto">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 gap-3">
          {filteredIngredients.map((ing) => {
            const isSelected = selectedSet.has(ing.id);
            return (
              <button
                key={ing.id}
                onClick={() => toggle(ing.id)}
                className={`group relative flex flex-col items-center p-3 rounded-xl border text-center transition-all ${
                  isSelected
                    ? 'bg-lime-500/10 border-lime-500/50'
                    : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="relative w-10 h-10 mb-2 opacity-90 group-hover:opacity-100 transition-opacity">
                    {ing.image_url ? (
                        <img src={ing.image_url} alt={ing.name} className="object-contain w-full h-full" />
                    ) : (
                        <div className="w-full h-full bg-slate-700 rounded-full" />
                    )}
                    {isSelected && (
                        <div className="absolute -top-1 -right-1 bg-lime-500 text-slate-950 rounded-full p-0.5">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    )}
                </div>
                <span className={`text-[10px] font-medium leading-tight ${isSelected ? 'text-lime-200' : 'text-slate-400'}`}>
                    {ing.name}
                </span>
              </button>
            );
          })}
        </div>
        
        {filteredIngredients.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-xs">
                No ingredients found.
            </div>
        )}
      </div>
      
      <div className="p-3 bg-slate-900 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between">
          <span>{selectedSet.size} items in bar</span>
          <button onClick={() => onChange([])} className="hover:text-red-400">Clear All</button>
      </div>
    </section>
  );
}