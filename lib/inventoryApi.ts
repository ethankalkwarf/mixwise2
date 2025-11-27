import { SupabaseClient } from '@supabase/supabase-js';

// Load or create an inventory for the current user and return its ingredient IDs
export async function loadInventory(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { inventoryId: null, ingredientIds: [] as number[] };
  const { data: inv, error: invError } = await supabase
    .from('inventories')
    .select('id')
    .eq('user_id', user.id)
    .single();
  let inventoryId: number | null = inv?.id ?? null;
  if (invError && invError.code !== 'PGRST116') {
    throw invError;
  }
  if (!inventoryId) {
    const { data: newInv, error: newInvError } = await supabase
      .from('inventories')
      .insert({ user_id: user.id, name: 'My Home Bar' })
      .select('id')
      .single();
    if (newInvError) throw newInvError;
    inventoryId = newInv!.id;
  }
  const { data: items, error: itemsError } = await supabase
    .from('inventory_items')
    .select('ingredient_id')
    .eq('inventory_id', inventoryId);
  if (itemsError) throw itemsError;
  const ingredientIds: number[] = items?.map((i) => i.ingredient_id) ?? [];
  return { inventoryId, ingredientIds };
}

// Replace the inventory items with the provided ingredient IDs
export async function saveInventory(
  supabase: SupabaseClient,
  inventoryId: number,
  ingredientIds: number[],
) {
  // Delete current items
  const { error: delError } = await supabase
    .from('inventory_items')
    .delete()
    .eq('inventory_id', inventoryId);
  if (delError) throw delError;
  if (ingredientIds.length === 0) return;
  const rows = ingredientIds.map((id) => ({
    inventory_id: inventoryId,
    ingredient_id: id,
  }));
  const { error: insError } = await supabase
    .from('inventory_items')
    .insert(rows);
  if (insError) throw insError;
}