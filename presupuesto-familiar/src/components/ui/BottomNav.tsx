'use client';

import { useAppStore } from '@/stores/useAppStore';

const TABS = [
  { id: 'panel', label: 'Panel', icon: '🏠' },
  { id: 'registrar', label: 'Registrar', icon: '➕' },
  { id: 'analisis', label: 'Análisis', icon: '📊' },
  { id: 'deudas', label: 'Deudas', icon: '💳' },
  { id: 'config', label: 'Config', icon: '⚙️' },
];

export default function BottomNav() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              activeTab === tab.id
                ? 'text-emerald-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[10px] mt-0.5 font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
