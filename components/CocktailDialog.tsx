"use client";

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Cocktail } from '@/lib/types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  cocktail: Cocktail | null;
  missingIngredientIds: number[];
  inventoryIds: number[];
};

export function CocktailDialog({ isOpen, onClose, cocktail, missingIngredientIds }: Props) {
  if (!cocktail) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 text-left align-middle shadow-xl transition-all">
                <div className="relative h-64 w-full bg-slate-800">
                    {cocktail.image_url ? (
                        <img 
                            src={cocktail.image_url} 
                            alt={cocktail.name} 
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center text-slate-600">No Image</div>
                    )}
                    <button 
                        onClick={onClose}
                        className="absolute top-3 right-3 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6">
                  <Dialog.Title as="h3" className="text-2xl font-bold leading-6 text-white mb-1">
                    {cocktail.name}
                  </Dialog.Title>
                  <p className="text-xs text-slate-400 mb-6 uppercase tracking-wider">{cocktail.category} • {cocktail.glass}</p>

                  <div className="space-y-6">
                    <div>
                        <h4 className="text-sm font-semibold text-slate-200 mb-3 border-b border-slate-800 pb-2">Ingredients</h4>
                        <ul className="space-y-2">
                            {cocktail.ingredients.map((ing) => {
                                const isMissing = missingIngredientIds.includes(ing.id);
                                return (
                                    <li key={ing.id} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-3">
                                            <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${isMissing ? 'bg-red-500/20 text-red-400' : 'bg-lime-500/20 text-lime-400'}`}>
                                                {isMissing ? '✕' : '✓'}
                                            </span>
                                            <span className={isMissing ? 'text-slate-400' : 'text-slate-200 font-medium'}>
                                                {ing.name}
                                            </span>
                                        </div>
                                        <span className="text-slate-500 text-xs">{ing.measure}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                    <div>
                         <h4 className="text-sm font-semibold text-slate-200 mb-3 border-b border-slate-800 pb-2">Instructions</h4>
                         <p className="text-sm text-slate-300 leading-relaxed">{cocktail.instructions}</p>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
