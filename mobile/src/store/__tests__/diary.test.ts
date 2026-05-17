import { Ingredient, useDiaryStore } from '../diary';
import type { DiaryDay } from '../diary';

// ── Pure helpers that mirror ManualLogScreen logic ────────────────────────

/**
 * Case-insensitive substring filter on ingredient names.
 * An empty query returns all ingredients unchanged.
 */
function filterIngredients(ingredients: Ingredient[], query: string): Ingredient[] {
  const q = query.toLowerCase().trim();
  if (!q) return ingredients;
  return ingredients.filter((i) => i.name.toLowerCase().includes(q));
}

interface BasketItem {
  ingredient: Ingredient;
  grams: number;
  kcal: number | null;
}

/**
 * Toggle: adds the ingredient if absent, removes it if already present.
 */
function toggleBasket(basket: BasketItem[], ingredient: Ingredient): BasketItem[] {
  const exists = basket.some((item) => item.ingredient.id === ingredient.id);
  if (exists) {
    return basket.filter((item) => item.ingredient.id !== ingredient.id);
  }
  return [...basket, { ingredient, grams: 100, kcal: null }];
}

/**
 * Update grams for an item; clears any previously computed kcal value.
 */
function setGrams(basket: BasketItem[], id: number, grams: number): BasketItem[] {
  return basket.map((item) => (item.ingredient.id === id ? { ...item, grams, kcal: null } : item));
}

// ── Fixtures ──────────────────────────────────────────────────────────────

const makeIngredient = (id: number, name: string): Ingredient => ({
  id,
  name,
  avg_quantity: null,
  modifier_type: null,
  state: 'solid',
  unit: 'g',
});

const sampleIngredients: Ingredient[] = [
  makeIngredient(1, 'Chicken Breast'),
  makeIngredient(2, 'Brown Rice'),
  makeIngredient(3, 'Broccoli'),
  makeIngredient(4, 'Chicken Thigh'),
];

// ── filterIngredients tests ───────────────────────────────────────────────

describe('filterIngredients', () => {
  it('lowercase query returns matching ingredients', () => {
    const result = filterIngredients(sampleIngredients, 'chicken');
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.name)).toContain('Chicken Breast');
    expect(result.map((i) => i.name)).toContain('Chicken Thigh');
  });

  it('uppercase query is case-insensitive', () => {
    const result = filterIngredients(sampleIngredients, 'CHICKEN');
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.name)).toContain('Chicken Breast');
  });

  it('query with no match returns empty array', () => {
    const result = filterIngredients(sampleIngredients, 'xyz');
    expect(result).toHaveLength(0);
  });

  it('empty query returns all ingredients', () => {
    const result = filterIngredients(sampleIngredients, '');
    expect(result).toHaveLength(sampleIngredients.length);
  });
});

// ── Zustand store action tests ────────────────────────────────────────────

describe('useDiaryStore', () => {
  beforeEach(() => {
    // Reset store to initial state between tests
    useDiaryStore.setState({ days: [], ingredients: [], ingredientsFetchedAt: null });
  });

  it('setIngredients updates the ingredients list and fetchedAt timestamp', () => {
    const now = new Date().toISOString();
    useDiaryStore.getState().setIngredients(sampleIngredients, now);
    const state = useDiaryStore.getState();
    expect(state.ingredients).toHaveLength(sampleIngredients.length);
    expect(state.ingredientsFetchedAt).toBe(now);
  });

  it('setDays updates diary days', () => {
    const days: DiaryDay[] = [{ date: '2026-05-16', total_kcal: 500, entries: [] }];
    useDiaryStore.getState().setDays(days);
    expect(useDiaryStore.getState().days).toHaveLength(1);
    expect(useDiaryStore.getState().days[0].total_kcal).toBe(500);
  });

  it('initial state has empty days and ingredients', () => {
    const state = useDiaryStore.getState();
    expect(state.days).toEqual([]);
    expect(state.ingredients).toEqual([]);
    expect(state.ingredientsFetchedAt).toBeNull();
  });
});

// ── basket toggle tests ───────────────────────────────────────────────────

describe('basket toggle', () => {
  const chicken = makeIngredient(1, 'Chicken Breast');
  const rice = makeIngredient(2, 'Brown Rice');

  it('adding an ingredient yields one basket entry', () => {
    const basket = toggleBasket([], chicken);
    expect(basket).toHaveLength(1);
    expect(basket[0].ingredient.id).toBe(1);
  });

  it('adding the same ingredient again removes it (toggle off)', () => {
    const basket = toggleBasket([{ ingredient: chicken, grams: 100, kcal: null }], chicken);
    expect(basket).toHaveLength(0);
  });

  it('adding two different ingredients yields two entries', () => {
    let basket = toggleBasket([], chicken);
    basket = toggleBasket(basket, rice);
    expect(basket).toHaveLength(2);
  });

  it('changing grams clears previously computed kcal', () => {
    const basketWithKcal: BasketItem[] = [{ ingredient: chicken, grams: 100, kcal: 165 }];
    const updated = setGrams(basketWithKcal, chicken.id, 200);
    expect(updated[0].grams).toBe(200);
    expect(updated[0].kcal).toBeNull();
  });
});
