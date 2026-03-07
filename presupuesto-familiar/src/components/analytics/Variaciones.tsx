'use client';

import { useConfig, useMovimientos, usePresupuestos, useCategorias } from '@/lib/hooks';
import { formatMXN } from '@/lib/constants';
import { isSameMonth } from 'date-fns';

export default function Variaciones() {
  const config = useConfig();
  const movimientos = useMovimientos();
  const presupuestos = usePresupuestos();
  const categorias = useCategorias();

  if (!config) return null;
  const mesActivo = new Date(config.mesActivo);

  const rows = categorias
    .filter((c) => c.activa && c.nivel === 1)
    .map((cat) => {
      const budgeted = presupuestos
        .filter((p) => p.categoria === cat.nombre && isSameMonth(new Date(p.mes), mesActivo))
        .reduce((s, p) => s + p.monto, 0);
      const actual = movimientos
        .filter((m) => m.categoria === cat.nombre && isSameMonth(new Date(m.fecha), mesActivo))
        .reduce((s, m) => s + m.monto, 0);
      const variance = budgeted - actual;
      const pct = budgeted > 0 ? (variance / budgeted) * 100 : 0;
      return { ...cat, budgeted, actual, variance, pct };
    })
    .filter((r) => r.budgeted > 0 || r.actual > 0);

  if (rows.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 text-center">
        <p className="text-3xl mb-2">📋</p>
        <p className="text-sm text-gray-400">No hay datos de presupuesto ni movimientos para comparar</p>
        <p className="text-xs text-gray-500">Configura tu presupuesto y registra movimientos</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id} className="bg-gray-800 rounded-xl p-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-200">{row.nombre}</span>
            <span className={`text-xs font-medium ${row.variance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {row.variance >= 0 ? '✅' : '❌'} {row.pct.toFixed(0)}%
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>Ppto: {formatMXN(row.budgeted)}</span>
            <span>Real: {formatMXN(row.actual)}</span>
            <span className={row.variance >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {formatMXN(row.variance)}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 relative">
            {row.budgeted > 0 && (
              <div
                className={`h-2 rounded-full transition-all ${
                  row.variance >= 0 ? 'bg-emerald-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min((row.actual / row.budgeted) * 100, 100)}%` }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
