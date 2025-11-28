"use client";

import { useMemo } from "react";
import { Ingredient } from "@/lib/types";

type Props = {
  ingredients: Ingredient[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
};

export function InventoryPanel({ ingredients, selectedIds, onChange }: Props) {
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
    for (const ing of ingredients) {
      const key = ing.category || "Other";
      const list = byCategory.get(key) ?? [];
      list.push(ing);
      byCategory.set(key, list);
    }
    return Array.from(byCategory.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  }, [ingredients]);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-white mb-2">My Bar</h2>
      <p className="text-xs text-slate-400 mb-2">
        Select the bottles and mixers you have on hand. MixWise will show you
        which cocktails you can make and which ones you&apos;re one bottle away from.
      </p>

      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {grouped.map(([category, list]) => (
          <div key={category}>
            <h3 className="text-xs font-semibold text-slate-400 uppercase mb-1">
              {category}
            </h3>
            <div className="space-y-1">
              {list.map((ing) => {
                const checked = selectedSet.has(ing.id);
                return (
                  <label
                    key={ing.id}
                    className="flex items-center gap-2 text-sm text-slate-100 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="h-3 w-3 rounded border-slate-500 bg-slate-900"
                      checked={checked}
                      onChange={() => handleToggle(ing.id)}
                    />
                    <span className="truncate">{ing.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
