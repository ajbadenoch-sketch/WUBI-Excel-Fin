'use client';

import { useConfig, useMovimientos, usePresupuestos } from '@/lib/hooks';
import { formatMXN } from '@/lib/constants';
import { generateMonthlyCashFlow, generateCashFlowProjection } from '@/lib/calculations';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function CashFlowView() {
  const config = useConfig();
  const movimientos = useMovimientos();
  const presupuestos = usePresupuestos();

  if (!config) return null;
  const mesActivo = new Date(config.mesActivo);

  const weeklyData = generateMonthlyCashFlow(movimientos, mesActivo, config.saldoBancoInicial);
  const projectionData = generateCashFlowProjection(
    movimientos,
    presupuestos,
    mesActivo,
    config.saldoBancoInicial,
    12
  );

  return (
    <div className="space-y-4">
      {/* Weekly Cash Flow */}
      <div className="bg-gray-800 rounded-xl p-3">
        <h4 className="text-sm font-semibold text-white mb-2">Flujo Semanal (Mes Actual)</h4>
        {weeklyData.some((w) => w.entries > 0 || w.exits > 0) ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyData}>
              <XAxis dataKey="period" tick={{ fill: '#9ca3af', fontSize: 9 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 9 }} />
              <Tooltip
                formatter={(val) => formatMXN(Number(val ?? 0))}
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="entries" fill="#10b981" name="Entradas" radius={[4, 4, 0, 0]} />
              <Bar dataKey="exits" fill="#ef4444" name="Salidas" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">Sin movimientos esta semana</p>
        )}
      </div>

      {/* 12-Month Projection */}
      <div className="bg-gray-800 rounded-xl p-3">
        <h4 className="text-sm font-semibold text-white mb-2">Proyección 12 Meses</h4>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={projectionData}>
            <XAxis dataKey="period" tick={{ fill: '#9ca3af', fontSize: 8 }} angle={-45} textAnchor="end" height={40} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 9 }} />
            <Tooltip
              formatter={(val) => formatMXN(Number(val ?? 0))}
              contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12 }}
            />
            <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2} dot={false} name="Saldo" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-xl p-3 overflow-x-auto">
        <h4 className="text-sm font-semibold text-white mb-2">Detalle</h4>
        <table className="w-full text-xs min-w-[350px]">
          <thead>
            <tr className="text-gray-400">
              <th className="text-left py-1">Periodo</th>
              <th className="text-right py-1">Entradas</th>
              <th className="text-right py-1">Salidas</th>
              <th className="text-right py-1">Neto</th>
              <th className="text-right py-1">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {projectionData.map((row) => (
              <tr key={row.period} className="text-gray-300 border-t border-gray-700">
                <td className="py-1 capitalize">{row.period}</td>
                <td className="py-1 text-right text-emerald-400">{formatMXN(row.entries)}</td>
                <td className="py-1 text-right text-red-400">{formatMXN(row.exits)}</td>
                <td className={`py-1 text-right ${row.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatMXN(row.net)}
                </td>
                <td className={`py-1 text-right ${row.balance >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                  {formatMXN(row.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
