'use client';

import { useConfig, useMovimientos } from '@/lib/hooks';
import { formatMXN } from '@/lib/constants';
import { getMonthlyIncome, getMonthlyExpenses, getSavingsRate } from '@/lib/calculations';
import { addMonths, startOfMonth, format, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function EstadoResultados() {
  const config = useConfig();
  const movimientos = useMovimientos();

  if (!config) return null;
  const mesActivo = new Date(config.mesActivo);

  // 12-month income statement
  const months = Array.from({ length: 12 }, (_, i) => addMonths(startOfMonth(mesActivo), i - 11));
  const data = months.map((month) => {
    const inc = getMonthlyIncome(movimientos, month);
    const exp = getMonthlyExpenses(movimientos, month);
    return {
      month: format(month, 'MMM yy', { locale: es }),
      ingresos: inc,
      gastos: exp,
      balance: inc - exp,
      savingsRate: getSavingsRate(inc, exp),
    };
  });

  const totalIncome = data.reduce((s, d) => s + d.ingresos, 0);
  const totalExpenses = data.reduce((s, d) => s + d.gastos, 0);
  const totalBalance = totalIncome - totalExpenses;

  // Expense breakdown by category across all 12 months
  const catTotals: Record<string, number> = {};
  movimientos
    .filter((m) => {
      const d = new Date(m.fecha);
      return m.tipo === 'Gasto' && d >= months[0] && d <= addMonths(months[11], 1);
    })
    .forEach((m) => {
      catTotals[m.categoria] = (catTotals[m.categoria] || 0) + m.monto;
    });

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400">Ingresos 12M</p>
          <p className="text-sm font-bold text-emerald-400">{formatMXN(totalIncome)}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400">Gastos 12M</p>
          <p className="text-sm font-bold text-red-400">{formatMXN(totalExpenses)}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400">Balance 12M</p>
          <p className={`text-sm font-bold ${totalBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatMXN(totalBalance)}
          </p>
        </div>
      </div>

      {/* Line Chart */}
      <div className="bg-gray-800 rounded-xl p-3">
        <h4 className="text-sm font-semibold text-white mb-2">Ingresos vs Gastos</h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 9 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 9 }} />
            <Tooltip
              formatter={(val) => formatMXN(Number(val ?? 0))}
              contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={2} dot={false} name="Ingresos" />
            <Line type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={2} dot={false} name="Gastos" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Table */}
      <div className="bg-gray-800 rounded-xl p-3 overflow-x-auto">
        <h4 className="text-sm font-semibold text-white mb-2">Estado de Resultados</h4>
        <table className="w-full text-xs min-w-[400px]">
          <thead>
            <tr className="text-gray-400">
              <th className="text-left py-1">Mes</th>
              <th className="text-right py-1">Ingresos</th>
              <th className="text-right py-1">Gastos</th>
              <th className="text-right py-1">Balance</th>
              <th className="text-right py-1">Ahorro %</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.month} className="text-gray-300 border-t border-gray-700">
                <td className="py-1 capitalize">{row.month}</td>
                <td className="py-1 text-right text-emerald-400">{formatMXN(row.ingresos)}</td>
                <td className="py-1 text-right text-red-400">{formatMXN(row.gastos)}</td>
                <td className={`py-1 text-right ${row.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatMXN(row.balance)}
                </td>
                <td className="py-1 text-right text-blue-400">
                  {(row.savingsRate * 100).toFixed(0)}%
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="text-white font-semibold border-t-2 border-gray-600">
              <td className="py-1">Total</td>
              <td className="py-1 text-right text-emerald-400">{formatMXN(totalIncome)}</td>
              <td className="py-1 text-right text-red-400">{formatMXN(totalExpenses)}</td>
              <td className={`py-1 text-right ${totalBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatMXN(totalBalance)}
              </td>
              <td className="py-1 text-right text-blue-400">
                {(getSavingsRate(totalIncome, totalExpenses) * 100).toFixed(0)}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Category Breakdown for 12M */}
      {Object.keys(catTotals).length > 0 && (
        <div className="bg-gray-800 rounded-xl p-3">
          <h4 className="text-sm font-semibold text-white mb-2">Gastos por Categoría (12M)</h4>
          {Object.entries(catTotals)
            .sort(([, a], [, b]) => b - a)
            .map(([cat, total]) => {
              const pct = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;
              return (
                <div key={cat} className="flex items-center justify-between text-xs py-1">
                  <span className="text-gray-300">{cat}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-700 rounded-full h-1.5">
                      <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-gray-400 w-20 text-right">{formatMXN(total)}</span>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
