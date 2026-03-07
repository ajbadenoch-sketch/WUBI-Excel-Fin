'use client';

import { useConfig, useMovimientos, usePresupuestos } from '@/lib/hooks';
import { formatMXN, getCategoryIcon } from '@/lib/constants';
import { getMonthlyIncome, getMonthlyExpenses, getSavingsRate, getDailyAvgSpend } from '@/lib/calculations';
import { isSameMonth, subMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function ResumenMensual() {
  const config = useConfig();
  const movimientos = useMovimientos();
  const presupuestos = usePresupuestos();

  if (!config) return null;
  const mesActivo = new Date(config.mesActivo);
  const income = getMonthlyIncome(movimientos, mesActivo);
  const expenses = getMonthlyExpenses(movimientos, mesActivo);
  const balance = income - expenses;
  const savingsRate = getSavingsRate(income, expenses);
  const dailyAvg = getDailyAvgSpend(expenses, mesActivo);

  // Expense breakdown by category
  const expenseByCategory: Record<string, number> = {};
  movimientos
    .filter((m) => m.tipo === 'Gasto' && isSameMonth(new Date(m.fecha), mesActivo))
    .forEach((m) => {
      expenseByCategory[m.categoria] = (expenseByCategory[m.categoria] || 0) + m.monto;
    });

  const pieData = Object.entries(expenseByCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }));

  // Income by source
  const incomeBySource: Record<string, number> = {};
  movimientos
    .filter((m) => m.tipo === 'Ingreso' && isSameMonth(new Date(m.fecha), mesActivo))
    .forEach((m) => {
      incomeBySource[m.categoria] = (incomeBySource[m.categoria] || 0) + m.monto;
    });
  const barData = Object.entries(incomeBySource).map(([name, value]) => ({ name, value }));

  // Quarterly trend
  const quarters = [2, 1, 0].map((i) => {
    const month = subMonths(mesActivo, i);
    return {
      month: format(month, 'MMM', { locale: es }),
      income: getMonthlyIncome(movimientos, month),
      expenses: getMonthlyExpenses(movimientos, month),
    };
  });

  // Budget comparison
  const budgetedIncome = presupuestos
    .filter((p) => p.tipo === 'Ingreso' && isSameMonth(new Date(p.mes), mesActivo))
    .reduce((s, p) => s + p.monto, 0);
  const budgetedExpenses = presupuestos
    .filter((p) => p.tipo === 'Gasto' && isSameMonth(new Date(p.mes), mesActivo))
    .reduce((s, p) => s + p.monto, 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-800 rounded-xl p-3">
          <p className="text-xs text-gray-400">Ingresos Reales</p>
          <p className="text-base font-bold text-emerald-400">{formatMXN(income)}</p>
          {budgetedIncome > 0 && (
            <p className="text-xs text-gray-500">Ppto: {formatMXN(budgetedIncome)}</p>
          )}
        </div>
        <div className="bg-gray-800 rounded-xl p-3">
          <p className="text-xs text-gray-400">Gastos Reales</p>
          <p className="text-base font-bold text-red-400">{formatMXN(expenses)}</p>
          {budgetedExpenses > 0 && (
            <p className="text-xs text-gray-500">Ppto: {formatMXN(budgetedExpenses)}</p>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="bg-gray-800 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-gray-400">Balance</p>
          <p className={`text-sm font-bold ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatMXN(balance)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Tasa Ahorro</p>
          <p className="text-sm font-bold text-blue-400">{(savingsRate * 100).toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Gasto/Día</p>
          <p className="text-sm font-bold text-yellow-400">{formatMXN(dailyAvg)}</p>
        </div>
      </div>

      {/* Expense Breakdown - Donut */}
      {pieData.length > 0 ? (
        <div className="bg-gray-800 rounded-xl p-3">
          <h4 className="text-sm font-semibold text-white mb-2">Gastos por Categoría</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val) => formatMXN(Number(val ?? 0))}
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2">
            {pieData.map((item, i) => (
              <span key={item.name} className="flex items-center gap-1 text-xs text-gray-300">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {getCategoryIcon(item.name)} {item.name}: {formatMXN(item.value)}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl p-6 text-center">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-sm text-gray-400">No hay gastos este mes</p>
        </div>
      )}

      {/* Income by Source - Bar */}
      {barData.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-3">
          <h4 className="text-sm font-semibold text-white mb-2">Ingresos por Fuente</h4>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={barData}>
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <Tooltip
                formatter={(val) => formatMXN(Number(val ?? 0))}
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Quarterly Trend */}
      <div className="bg-gray-800 rounded-xl p-3">
        <h4 className="text-sm font-semibold text-white mb-2">Tendencia Trimestral</h4>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400">
              <th className="text-left py-1">Mes</th>
              <th className="text-right py-1">Ingresos</th>
              <th className="text-right py-1">Gastos</th>
              <th className="text-right py-1">Balance</th>
            </tr>
          </thead>
          <tbody>
            {quarters.map((q) => (
              <tr key={q.month} className="text-gray-300 border-t border-gray-700">
                <td className="py-1 capitalize">{q.month}</td>
                <td className="py-1 text-right text-emerald-400">{formatMXN(q.income)}</td>
                <td className="py-1 text-right text-red-400">{formatMXN(q.expenses)}</td>
                <td className={`py-1 text-right ${q.income - q.expenses >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatMXN(q.income - q.expenses)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
