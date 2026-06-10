import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const THEMES = {
  BLACK_PINK: 'black-pink',
  TITANIUM_GOLD: 'titanium-gold',
  NEURAL_GLASS: 'neural-glass',
  MATERIAL_PATIENT: 'material-patient',
};

export const useThemeStore = create(
  persist(
    (set, get) => ({
      currentTheme: THEMES.BLACK_PINK,
      setTheme: (theme) => set({ currentTheme: theme }),
      isMaterialPatient: () => get().currentTheme === THEMES.MATERIAL_PATIENT,
      isMaterialTheme: () => get().currentTheme === THEMES.MATERIAL_PATIENT,
    }),
    {
      name: 'prism-theme',
    }
  )
);
