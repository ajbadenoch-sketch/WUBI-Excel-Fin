'use client';

import { useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import MovimientoForm from './MovimientoForm';
import DepositoAhorroForm from './DepositoAhorroForm';
import NuevaDeudaForm from './NuevaDeudaForm';
import NuevoRecurrenteForm from './NuevoRecurrenteForm';
import NuevoPlanAhorroForm from './NuevoPlanAhorroForm';

const FORMS = [
  { id: 'movimiento', label: 'Movimiento' },
  { id: 'deposito', label: 'Ahorro' },
  { id: 'deuda', label: 'Deuda' },
  { id: 'recurrente', label: 'Recurrente' },
  { id: 'plan', label: 'Plan Ahorro' },
];

export default function RegistrarScreen() {
  const { registrarForm, setRegistrarForm } = useAppStore();

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-lg font-bold text-white">Registrar</h2>

      {/* Segmented Control */}
      <div className="flex gap-1 bg-gray-800 rounded-xl p-1 overflow-x-auto">
        {FORMS.map((f) => (
          <button
            key={f.id}
            onClick={() => setRegistrarForm(f.id)}
            className={`flex-1 px-2 py-2 text-xs rounded-lg whitespace-nowrap transition-colors ${
              registrarForm === f.id
                ? 'bg-emerald-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Form Content */}
      {registrarForm === 'movimiento' && <MovimientoForm />}
      {registrarForm === 'deposito' && <DepositoAhorroForm />}
      {registrarForm === 'deuda' && <NuevaDeudaForm />}
      {registrarForm === 'recurrente' && <NuevoRecurrenteForm />}
      {registrarForm === 'plan' && <NuevoPlanAhorroForm />}
    </div>
  );
}
