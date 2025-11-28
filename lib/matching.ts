 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/lib/matching.ts b/lib/matching.ts
index e6732c8b86eb2f6af85335c75154a6854c53f4d3..e267bb2a6177238050d32a76eb0bd5d62cdf0d74 100644
--- a/lib/matching.ts
+++ b/lib/matching.ts
@@ -1,32 +1,162 @@
 import {
   Cocktail,
   CocktailIngredient,
-  SubstitutionRule,
+  Ingredient,
   MatchResult,
+  SubstitutionRule,
 } from './types';
 
+// Common aliases that should collapse into a single normalized ingredient name.
+// Keys and values should already be lowercase and trimmed.
+const NAME_ALIASES: Record<string, string> = {
+  'fresh lime juice': 'lime juice',
+  'lime cordial': 'lime juice',
+  'lime juice cordial': 'lime juice',
+  'fresh lemon juice': 'lemon juice',
+  'lemon wedge': 'lemon',
+  'lime wedge': 'lime',
+  'castor sugar': 'sugar',
+  'granulated sugar': 'sugar',
+  'powdered sugar': 'sugar',
+  'confectioners sugar': 'sugar',
+  'simple syrup': 'syrup',
+  'sugar syrup': 'syrup',
+  'gomme syrup': 'syrup',
+  'agave syrup': 'syrup',
+  'angostura bitters': 'bitters',
+  'aromatic bitters': 'bitters',
+  'orange bitters': 'bitters',
+  'cointreau': 'triple sec',
+  'grand marnier': 'triple sec',
+  'curaçao': 'curacao',
+  'curacao': 'triple sec',
+  'gold tequila': 'tequila',
+  'silver tequila': 'tequila',
+  'blanco tequila': 'tequila',
+  'tequila blanco': 'tequila',
+  'reposado tequila': 'tequila',
+  'añejo tequila': 'tequila',
+  'white rum': 'rum',
+  'light rum': 'rum',
+  'gold rum': 'rum',
+  'dark rum': 'rum',
+  'spiced rum': 'rum',
+  'overproof rum': 'rum',
+  'cachaça': 'cachaca',
+  'cachaca': 'rum',
+};
+
+const OPTIONAL_KEYWORDS = [
+  'garnish',
+  'twist',
+  'wedge',
+  'slice',
+  'wheel',
+  'peel',
+  'rim',
+  'salt',
+  'sugar',
+  'olive',
+  'cherry',
+  'mint leaf',
+  'mint leaves',
+  'sprig',
+  'zest',
+];
+
+/**
+ * Normalize ingredient names to reduce duplicates (case, punctuation, small
+ * descriptors). The result is used both for display deduplication and for
+ * substitution groups in the matching engine.
+ */
+export function normalizeIngredientName(name: string): string {
+  let normalized = name.toLowerCase();
+  normalized = normalized.replace(/\(.*?\)/g, '');
+  normalized = normalized.replace(/[^a-z0-9\s]/g, ' ');
+  normalized = normalized
+    .replace(/\b(fresh|freshly|squeezed|of|the|a|an)\b/g, ' ')
+    .replace(/\s+/g, ' ')
+    .trim();
+
+  if (NAME_ALIASES[normalized]) {
+    normalized = NAME_ALIASES[normalized];
+  }
+
+  return normalized;
+}
+
+/**
+ * Group ingredients by their normalized name.
+ */
+export function groupIngredientsByNormalizedName(
+  ingredients: Ingredient[],
+): Record<string, Ingredient[]> {
+  return ingredients.reduce<Record<string, Ingredient[]>>((acc, ing) => {
+    const key = normalizeIngredientName(ing.name);
+    acc[key] = acc[key] ? [...acc[key], ing] : [ing];
+    return acc;
+  }, {});
+}
+
+/**
+ * Build substitution rules so that all ingredients with the same normalized
+ * name can substitute for each other. This helps bridge CocktailDB
+ * duplication (e.g. "Tequila" vs "Tequila Blanco").
+ */
+export function buildSubstitutionRulesFromIngredients(
+  ingredients: Ingredient[],
+): SubstitutionRule[] {
+  const groups = groupIngredientsByNormalizedName(ingredients);
+  const rules: SubstitutionRule[] = [];
+
+  Object.values(groups).forEach((ings) => {
+    for (let i = 0; i < ings.length; i++) {
+      for (let j = 0; j < ings.length; j++) {
+        if (i === j) continue;
+        rules.push({
+          fromIngredientId: ings[i].id,
+          toIngredientId: ings[j].id,
+          strength: 1,
+        });
+      }
+    }
+  });
+
+  return rules;
+}
+
+/**
+ * Heuristic to decide if an ingredient should be treated as optional (i.e.
+ * not required to make the drink). Garnishes and rims fall into this bucket.
+ */
+export function isLikelyOptionalIngredient(ing: CocktailIngredient): boolean {
+  if (ing.isOptional) return true;
+  const normalized = normalizeIngredientName(ing.name);
+  return OPTIONAL_KEYWORDS.some((kw) => normalized.includes(kw));
+}
+
 /**
  * Parameters supplied to the matching engine. This wrapper object makes
  * it easy to add new inputs in the future without breaking call
  * signatures.
  */
 export type MatchEngineParams = {
   /** The full list of cocktails to consider. */
   cocktails: Cocktail[];
   /** IDs of ingredients that the user currently owns. */
   ownedIngredientIds: number[];
   /** IDs of ingredients that are always considered available (staples). */
   stapleIngredientIds: number[];
   /**
    * A list of substitution rules. When a required ingredient is not
    * present in the user’s inventory, the engine looks for rules where
    * `fromIngredientId` matches the missing ingredient and
    * `toIngredientId` is present in the user’s inventory. If the rule’s
    * strength is greater than or equal to `substitutionThreshold`, the
    * required ingredient is considered covered by the substitute.
    */
   substitutions: SubstitutionRule[];
   /**
    * The minimum strength required for a substitution to count. Values
    * should be between 0 and 1. Defaults to 0.7.
    */
@@ -54,80 +184,83 @@ export function getMatchGroups(params: MatchEngineParams): MatchGroups {
     cocktails,
     ownedIngredientIds,
     stapleIngredientIds,
     substitutions,
     substitutionThreshold = 0.7,
   } = params;
 
   // Precompute sets for fast lookup
   const owned = new Set<number>(ownedIngredientIds);
   const staples = new Set<number>(stapleIngredientIds);
 
   // Build a map from missing ingredient -> possible substitutes with strength
   const substitutionMap = new Map<number, SubstitutionRule[]>();
   for (const rule of substitutions) {
     const list = substitutionMap.get(rule.fromIngredientId) ?? [];
     list.push(rule);
     substitutionMap.set(rule.fromIngredientId, list);
   }
 
   const makeNow: MatchResult[] = [];
   const almostThere: MatchResult[] = [];
   const all: MatchResult[] = [];
 
   // Iterate over each cocktail and compute its match result
   for (const cocktail of cocktails) {
-    const requiredTotal: number = cocktail.ingredients.filter(
-      (ing: CocktailIngredient) => !ing.isOptional && !staples.has(ing.id),
-    ).length;
+    const requiredTotal: number = cocktail.ingredients.filter((ing: CocktailIngredient) => {
+      const optional = isLikelyOptionalIngredient(ing);
+      return !optional && !staples.has(ing.id);
+    }).length;
 
     let requiredCovered = 0;
     const missingRequired: number[] = [];
     const missingNames: string[] = [];
     const coveredBySubstitutions: Record<number, number> = {};
 
     // Iterate through each ingredient, tracking coverage
     for (const ing of cocktail.ingredients) {
       // Skip optional ingredients from required set
-      const isRequired = !ing.isOptional && !staples.has(ing.id);
+      const isRequired = !isLikelyOptionalIngredient(ing) && !staples.has(ing.id);
       if (!isRequired) {
         continue;
       }
 
       const id = ing.id;
 
       // Owned directly or covered by staples
       if (owned.has(id) || staples.has(id)) {
         requiredCovered += 1;
         continue;
       }
 
       // Not owned; check substitutions
       let substituted = false;
       const possibleSubs = substitutionMap.get(id) ?? [];
       for (const rule of possibleSubs) {
-        if (rule.strength >= substitutionThreshold && owned.has(rule.toIngredientId)) {
+        const substituteOwned =
+          owned.has(rule.toIngredientId) || staples.has(rule.toIngredientId);
+        if (rule.strength >= substitutionThreshold && substituteOwned) {
           requiredCovered += 1;
           coveredBySubstitutions[id] = rule.toIngredientId;
           substituted = true;
           break;
         }
       }
 
       if (!substituted) {
         missingRequired.push(id);
         missingNames.push(ing.name);
       }
     }
 
     // Calculate score
     const score = requiredTotal === 0 ? 1 : requiredCovered / requiredTotal;
 
     const result: MatchResult = {
       cocktail,
       score,
       missingRequiredIngredientIds: missingRequired,
       missingRequiredIngredientNames: missingNames,
       coveredBySubstitutions,
     };
 
     all.push(result);
 
EOF
)
