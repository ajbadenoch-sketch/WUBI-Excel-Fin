'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/budget/store';
import { seedDatabase } from '@/lib/db/seed';
import BottomNav from './BottomNav';
import PanelScreen from './PanelScreen';
import RegistrarScreen from './RegistrarScreen';
import AnalisisScreen from './AnalisisScreen';
import DeudasScreen from './DeudasScreen';
import ConfigScreen from './ConfigScreen';

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
