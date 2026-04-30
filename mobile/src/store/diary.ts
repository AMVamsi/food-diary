import { create } from 'zustand'

export interface Ingredient {
    id: number
    name: string
    avg_quantity: number | null
    modifier_type: string | null
    state: 'solid' | 'liquid'
    unit: 'g' | 'ml'
}

export interface DiaryEntry {
    id: string
    entry_type: 'photo' | 'manual'
    occasion: string | null
    food_name: string
    kcal: number
    amount: number
    unit: 'g' | 'ml'
    image_url: string | null
    logged_at: string
    notes: string | null
}

export interface DiaryDay {
    date: string
    total_kcal: number
    entries: DiaryEntry[]
}

interface DiaryState {
    days: DiaryDay[]
    ingredients: Ingredient[]
    ingredientsFetchedAt: string | null
    setDays: (days: DiaryDay[]) => void
    setIngredients: (ingredients: Ingredient[], fetchedAt: string) => void
}

export const useDiaryStore = create<DiaryState>((set) => ({
    days: [],
    ingredients: [],
    ingredientsFetchedAt: null,

    setDays: (days) => set({ days }),

    setIngredients: (ingredients, fetchedAt) =>
        set({ ingredients, ingredientsFetchedAt: fetchedAt }),
}))