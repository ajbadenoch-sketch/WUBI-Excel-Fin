'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { seedDatabase } from '@/db/seed';
import BottomNav from './ui/BottomNav';
import PanelScreen from './dashboard/PanelScreen';
import RegistrarScreen from './forms/RegistrarScreen';
import AnalisisScreen from './analytics/AnalisisScreen';
import DeudasScreen from './debts/DeudasScreen';
import ConfigScreen from './settings/ConfigScreen';

export default function AppShell() {
  const { activeTab } = useAppStore();

  useEffect(() => {
    seedDatabase();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <main className="max-w-lg mx-auto px-4 pt-4 pb-20">
        {activeTab === 'panel' && <PanelScreen />}
        {activeTab === 'registrar' && <RegistrarScreen />}
        {activeTab === 'analisis' && <AnalisisScreen />}
        {activeTab === 'deudas' && <DeudasScreen />}
        {activeTab === 'config' && <ConfigScreen />}
      </main>
      <BottomNav />
    </div>
  );
}
