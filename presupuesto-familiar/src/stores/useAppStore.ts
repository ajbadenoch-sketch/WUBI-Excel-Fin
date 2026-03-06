'use client';

import { create } from 'zustand';

interface AppState {
  activeTab: string;
  activeSubTab: string;
  registrarForm: string;
  darkMode: boolean;
  setActiveTab: (tab: string) => void;
  setActiveSubTab: (tab: string) => void;
  setRegistrarForm: (form: string) => void;
  toggleDarkMode: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'panel',
  activeSubTab: 'resumen',
  registrarForm: 'movimiento',
  darkMode: true,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveSubTab: (tab) => set({ activeSubTab: tab }),
  setRegistrarForm: (form) => set({ registrarForm: form }),
  toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
}));
