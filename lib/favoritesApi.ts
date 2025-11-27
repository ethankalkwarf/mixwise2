import { SupabaseClient } from '@supabase/supabase-js';

// Functions for loading and updating user favorites.

/**
 * Load the current user's favorite cocktail IDs from Supabase.
 * If no user is signed in, returns an empty array.
 */
export async function loadFavorites(
  supabase: SupabaseClient,
): Promise<number[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('favorites')
    .select('cocktail_id')
    .eq('user_id', user.id);
  if (error) throw error;
  return data?.map((row: any) => row.cocktail_id) ?? [];
}

/**
 * Add a cocktail to the current user's favorites.
 * Throws if the user is not signed in.
 */
export async function addFavorite(
  supabase: SupabaseClient,
  cocktailId: number,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not logged in');
  const { error } = await supabase.from('favorites').insert({
    user_id: user.id,
    cocktail_id: cocktailId,
  });
  if (error) throw error;
}

/**
 * Remove a cocktail from the current user's favorites.
 * Throws if the user is not signed in.
 */
export async function removeFavorite(
  supabase: SupabaseClient,
  cocktailId: number,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not logged in');
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('cocktail_id', cocktailId);
  if (error) throw error;
}