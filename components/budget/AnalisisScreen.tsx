'use client';

import { useState } from 'react';
import { useConfig, useMovimientos, usePresupuestos, useCategorias } from '@/lib/budget/hooks';
import { formatMXN, getCategoryIcon } from '@/lib/budget/constants';
import { getMonthlyIncome, getMonthlyExpenses, getSavingsRate, getDailyAvgSpend, generateMonthlyCashFlow, generateCashFlowProjection } from '@/lib/budget/calculations';
import { isSameMonth, subMonths, format, addMonths, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, Legend } from 'recharts';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

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
              tab === t.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'
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

function ResumenMensual() {
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

  const expenseByCategory: Record<string, number> = {};
  movimientos.filter((m) => m.tipo === 'Gasto' && isSameMonth(new Date(m.fecha), mesActivo))
    .forEach((m) => { expenseByCategory[m.categoria] = (expenseByCategory[m.categoria] || 0) + m.monto; });

  const pieData = Object.entries(expenseByCategory).sort(([, a], [, b]) => b - a).map(([name, value]) => ({ name, value }));

  const incomeBySource: Record<string, number> = {};
  movimientos.filter((m) => m.tipo === 'Ingreso' && isSameMonth(new Date(m.fecha), mesActivo))
    .forEach((m) => { incomeBySource[m.categoria] = (incomeBySource[m.categoria] || 0) + m.monto; });
  const barData = Object.entries(incomeBySource).map(([name, value]) => ({ name, value }));

  const quarters = [2, 1, 0].map((i) => {
    const month = subMonths(mesActivo, i);
    return { month: format(month, 'MMM', { locale: es }), income: getMonthlyIncome(movimientos, month), expenses: getMonthlyExpenses(movimientos, month) };
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-800 rounded-xl p-3">
          <p className="text-xs text-gray-400">Ingresos</p>
          <p className="text-base font-bold text-emerald-400">{formatMXN(income)}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3">
          <p className="text-xs text-gray-400">Gastos</p>
          <p className="text-base font-bold text-red-400">{formatMXN(expenses)}</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
        <div><p className="text-xs text-gray-400">Balance</p><p className={`text-sm font-bold ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatMXN(balance)}</p></div>
        <div><p className="text-xs text-gray-400">Tasa Ahorro</p><p className="text-sm font-bold text-blue-400">{(savingsRate * 100).toFixed(1)}%</p></div>
        <div><p className="text-xs text-gray-400">Gasto/Día</p><p className="text-sm font-bold text-yellow-400">{formatMXN(dailyAvg)}</p></div>
      </div>

      {pieData.length > 0 ? (
        <div className="bg-gray-800 rounded-xl p-3">
          <h4 className="text-sm font-semibold text-white mb-2">Gastos por Categoría</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie><Tooltip formatter={(val) => formatMXN(Number(val ?? 0))} contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12 }} /></PieChart>
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
        <div className="bg-gray-800 rounded-xl p-6 text-center"><p className="text-3xl mb-2">📊</p><p className="text-sm text-gray-400">No hay gastos este mes</p></div>
      )}

      {barData.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-3">
          <h4 className="text-sm font-semibold text-white mb-2">Ingresos por Fuente</h4>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={barData}><XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} /><YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <Tooltip formatter={(val) => formatMXN(Number(val ?? 0))} contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-gray-800 rounded-xl p-3">
        <h4 className="text-sm font-semibold text-white mb-2">Tendencia Trimestral</h4>
        <table className="w-full text-xs">
          <thead><tr className="text-gray-400"><th className="text-left py-1">Mes</th><th className="text-right py-1">Ingresos</th><th className="text-right py-1">Gastos</th><th className="text-right py-1">Balance</th></tr></thead>
          <tbody>{quarters.map((q) => (
            <tr key={q.month} className="text-gray-300 border-t border-gray-700">
              <td className="py-1 capitalize">{q.month}</td><td className="py-1 text-right text-emerald-400">{formatMXN(q.income)}</td>
              <td className="py-1 text-right text-red-400">{formatMXN(q.expenses)}</td>
              <td className={`py-1 text-right ${q.income - q.expenses >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatMXN(q.income - q.expenses)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function EstadoResultados() {
  const config = useConfig();
  const movimientos = useMovimientos();

  if (!config) return null;
  const mesActivo = new Date(config.mesActivo);
  const months = Array.from({ length: 12 }, (_, i) => addMonths(startOfMonth(mesActivo), i - 11));
  const data = months.map((month) => {
    const inc = getMonthlyIncome(movimientos, month);
    const exp = getMonthlyExpenses(movimientos, month);
    return { month: format(month, 'MMM yy', { locale: es }), ingresos: inc, gastos: exp, balance: inc - exp, savingsRate: getSavingsRate(inc, exp) };
  });

  const totalIncome = data.reduce((s, d) => s + d.ingresos, 0);
  const totalExpenses = data.reduce((s, d) => s + d.gastos, 0);
  const totalBalance = totalIncome - totalExpenses;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-800 rounded-xl p-3 text-center"><p className="text-xs text-gray-400">Ingresos 12M</p><p className="text-sm font-bold text-emerald-400">{formatMXN(totalIncome)}</p></div>
        <div className="bg-gray-800 rounded-xl p-3 text-center"><p className="text-xs text-gray-400">Gastos 12M</p><p className="text-sm font-bold text-red-400">{formatMXN(totalExpenses)}</p></div>
        <div className="bg-gray-800 rounded-xl p-3 text-center"><p className="text-xs text-gray-400">Balance 12M</p><p className={`text-sm font-bold ${totalBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatMXN(totalBalance)}</p></div>
      </div>

      <div className="bg-gray-800 rounded-xl p-3">
        <h4 className="text-sm font-semibold text-white mb-2">Ingresos vs Gastos</h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}><XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 9 }} /><YAxis tick={{ fill: '#9ca3af', fontSize: 9 }} />
            <Tooltip formatter={(val) => formatMXN(Number(val ?? 0))} contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={2} dot={false} name="Ingresos" />
            <Line type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={2} dot={false} name="Gastos" /></LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-gray-800 rounded-xl p-3 overflow-x-auto">
        <h4 className="text-sm font-semibold text-white mb-2">Estado de Resultados</h4>
        <table className="w-full text-xs min-w-[400px]">
          <thead><tr className="text-gray-400"><th className="text-left py-1">Mes</th><th className="text-right py-1">Ingresos</th><th className="text-right py-1">Gastos</th><th className="text-right py-1">Balance</th><th className="text-right py-1">Ahorro %</th></tr></thead>
          <tbody>{data.map((row) => (
            <tr key={row.month} className="text-gray-300 border-t border-gray-700">
              <td className="py-1 capitalize">{row.month}</td><td className="py-1 text-right text-emerald-400">{formatMXN(row.ingresos)}</td>
              <td className="py-1 text-right text-red-400">{formatMXN(row.gastos)}</td>
              <td className={`py-1 text-right ${row.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatMXN(row.balance)}</td>
              <td className="py-1 text-right text-blue-400">{(row.savingsRate * 100).toFixed(0)}%</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function Variaciones() {
  const config = useConfig();
  const movimientos = useMovimientos();
  const presupuestos = usePresupuestos();
  const categorias = useCategorias();

  if (!config) return null;
  const mesActivo = new Date(config.mesActivo);

  const rows = categorias.filter((c) => c.activa && c.nivel === 1).map((cat) => {
    const budgeted = presupuestos.filter((p) => p.categoria === cat.nombre && isSameMonth(new Date(p.mes), mesActivo)).reduce((s, p) => s + p.monto, 0);
    const actual = movimientos.filter((m) => m.categoria === cat.nombre && isSameMonth(new Date(m.fecha), mesActivo)).reduce((s, m) => s + m.monto, 0);
    const variance = budgeted - actual;
    const pct = budgeted > 0 ? (variance / budgeted) * 100 : 0;
    return { ...cat, budgeted, actual, variance, pct };
  }).filter((r) => r.budgeted > 0 || r.actual > 0);

  if (rows.length === 0) {
    return (<div className="bg-gray-800 rounded-xl p-6 text-center"><p className="text-3xl mb-2">📋</p><p className="text-sm text-gray-400">No hay datos de presupuesto ni movimientos para comparar</p></div>);
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id} className="bg-gray-800 rounded-xl p-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-200">{row.nombre}</span>
            <span className={`text-xs font-medium ${row.variance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{row.pct.toFixed(0)}%</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>Ppto: {formatMXN(row.budgeted)}</span><span>Real: {formatMXN(row.actual)}</span>
            <span className={row.variance >= 0 ? 'text-emerald-400' : 'text-red-400'}>{formatMXN(row.variance)}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            {row.budgeted > 0 && (<div className={`h-2 rounded-full ${row.variance >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${Math.min((row.actual / row.budgeted) * 100, 100)}%` }} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function CashFlowView() {
  const config = useConfig();
  const movimientos = useMovimientos();
  const presupuestos = usePresupuestos();

  if (!config) return null;
  const mesActivo = new Date(config.mesActivo);
  const weeklyData = generateMonthlyCashFlow(movimientos, mesActivo, config.saldoBancoInicial);
  const projectionData = generateCashFlowProjection(movimientos, presupuestos, mesActivo, config.saldoBancoInicial, 12);

  return (
    <div className="space-y-4">
      <div className="bg-gray-800 rounded-xl p-3">
        <h4 className="text-sm font-semibold text-white mb-2">Flujo Semanal (Mes Actual)</h4>
        {weeklyData.some((w) => w.entries > 0 || w.exits > 0) ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyData}><XAxis dataKey="period" tick={{ fill: '#9ca3af', fontSize: 9 }} /><YAxis tick={{ fill: '#9ca3af', fontSize: 9 }} />
              <Tooltip formatter={(val) => formatMXN(Number(val ?? 0))} contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="entries" fill="#10b981" name="Entradas" radius={[4, 4, 0, 0]} />
              <Bar dataKey="exits" fill="#ef4444" name="Salidas" radius={[4, 4, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        ) : (<p className="text-sm text-gray-500 text-center py-4">Sin movimientos esta semana</p>)}
      </div>

      <div className="bg-gray-800 rounded-xl p-3">
        <h4 className="text-sm font-semibold text-white mb-2">Proyección 12 Meses</h4>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={projectionData}>
            <XAxis dataKey="period" tick={{ fill: '#9ca3af', fontSize: 8 }} angle={-45} textAnchor="end" height={40} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 9 }} />
            <Tooltip formatter={(val) => formatMXN(Number(val ?? 0))} contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12 }} />
            <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2} dot={false} name="Saldo" /></LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-gray-800 rounded-xl p-3 overflow-x-auto">
        <h4 className="text-sm font-semibold text-white mb-2">Detalle</h4>
        <table className="w-full text-xs min-w-[350px]">
          <thead><tr className="text-gray-400"><th className="text-left py-1">Periodo</th><th className="text-right py-1">Entradas</th><th className="text-right py-1">Salidas</th><th className="text-right py-1">Neto</th><th className="text-right py-1">Saldo</th></tr></thead>
          <tbody>{projectionData.map((row) => (
            <tr key={row.period} className="text-gray-300 border-t border-gray-700">
              <td className="py-1 capitalize">{row.period}</td><td className="py-1 text-right text-emerald-400">{formatMXN(row.entries)}</td>
              <td className="py-1 text-right text-red-400">{formatMXN(row.exits)}</td>
              <td className={`py-1 text-right ${row.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatMXN(row.net)}</td>
              <td className={`py-1 text-right ${row.balance >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{formatMXN(row.balance)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
