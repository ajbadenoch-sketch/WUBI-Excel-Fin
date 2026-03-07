'use client';

import { useState } from 'react';
import ResumenMensual from './ResumenMensual';
import EstadoResultados from './EstadoResultados';
import Variaciones from './Variaciones';
import CashFlowView from './CashFlowView';

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'estado', label: 'P&L' },
  { id: 'variaciones', label: 'Variaciones' },
  { id: 'cashflow', label: 'Cash Flow' },
];

export default function AnalisisScreen() {
  const [tab, setTab] = useState('resumen');

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-lg font-bold text-white">Análisis</h2>
      <div className="flex gap-1 bg-gray-800 rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 px-2 py-2 text-xs rounded-lg transition-colors ${
              tab === t.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'resumen' && <ResumenMensual />}
      {tab === 'estado' && <EstadoResultados />}
      {tab === 'variaciones' && <Variaciones />}
      {tab === 'cashflow' && <CashFlowView />}
    </div>
  );
}
