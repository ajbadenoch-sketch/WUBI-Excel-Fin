'use client';

import { useState } from 'react';
import { useDeudas, useTarjetas, useMSI, useMovimientos, useConfig } from '@/lib/budget/hooks';
import { formatMXN } from '@/lib/budget/constants';
import {
  generateAmortization,
  simulatePayoff,
  sortAvalanche,
  sortSnowball,
  getUtilizationStatus,
  getMonthlyIncome,
  getDebtToIncomeRatio,
  getDebtRatioStatus,
} from '@/lib/budget/calculations';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const TABS = [
  { id: 'overview', label: 'Resumen' },
  { id: 'strategy', label: 'Estrategia' },
  { id: 'amort', label: 'Amortización' },
  { id: 'cards', label: 'Tarjetas' },
  { id: 'msi', label: 'MSI' },
];

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function DeudasScreen() {
  const [tab, setTab] = useState('overview');
  const deudas = useDeudas();
  const tarjetas = useTarjetas();
  const msiList = useMSI();
  const movimientos = useMovimientos();
  const config = useConfig();

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-lg font-bold text-white">Deudas</h2>
      <div className="flex gap-1 bg-gray-800 rounded-xl p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 px-2 py-2 text-xs rounded-lg whitespace-nowrap transition-colors ${
              tab === t.id ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab deudas={deudas} movimientos={movimientos} config={config} />}
      {tab === 'strategy' && <StrategyTab deudas={deudas} />}
      {tab === 'amort' && <AmortizationTab deudas={deudas} />}
      {tab === 'cards' && <CardsTab tarjetas={tarjetas} />}
      {tab === 'msi' && <MSITab msiList={msiList} />}
    </div>
  );
}

function OverviewTab({ deudas, movimientos, config }: { deudas: any[]; movimientos: any[]; config: any }) {
  const totalDebt = deudas.reduce((s, d) => s + d.saldoActual, 0);
  const totalMonthly = deudas.reduce((s, d) => s + d.pagoReal, 0);
  const pieData = deudas.map((d) => ({ name: d.nombre, value: d.saldoActual }));
  const monthlyIncome = config ? getMonthlyIncome(movimientos, new Date(config.mesActivo)) : 0;
  const ratio = getDebtToIncomeRatio(totalMonthly, monthlyIncome);
  const ratioStatus = getDebtRatioStatus(ratio);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400">Deuda Total</p>
          <p className="text-sm font-bold text-red-400">{formatMXN(totalDebt)}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400">Pago/Mes</p>
          <p className="text-sm font-bold text-yellow-400">{formatMXN(totalMonthly)}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400">Ratio</p>
          <p className={`text-sm font-bold ${ratioStatus.color}`}>{ratioStatus.icon} {(ratio * 100).toFixed(0)}%</p>
        </div>
      </div>

      {pieData.length > 0 && pieData.some(d => d.value > 0) && (
        <div className="bg-gray-800 rounded-xl p-3">
          <h4 className="text-sm font-semibold text-white mb-2">Distribución</h4>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" stroke="none">
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => formatMXN(Number(v ?? 0))} contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {deudas.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-6 text-center"><p className="text-3xl mb-2">🎉</p><p className="text-sm text-gray-400">Sin deudas registradas</p></div>
      ) : (
        deudas.map((d) => (
          <div key={d.id} className="bg-gray-800 rounded-xl p-3">
            <div className="flex justify-between items-center">
              <div><p className="text-sm font-medium text-white">{d.nombre}</p><p className="text-xs text-gray-400">{d.tipo} • {(d.tasaInteres * 100).toFixed(1)}% anual</p></div>
              <span className={`px-2 py-0.5 text-xs rounded-full ${d.estado === 'Liquidada' ? 'bg-emerald-900/50 text-emerald-300' : 'bg-red-900/50 text-red-300'}`}>{d.estado}</span>
            </div>
            <div className="flex justify-between text-xs mt-2">
              <span className="text-gray-400">Saldo: <span className="text-red-400">{formatMXN(d.saldoActual)}</span></span>
              <span className="text-gray-400">Pago: <span className="text-yellow-400">{formatMXN(d.pagoReal)}/mes</span></span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.max(0, ((d.montoOriginal - d.saldoActual) / d.montoOriginal) * 100)}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">{((((d.montoOriginal - d.saldoActual) / d.montoOriginal) * 100) || 0).toFixed(0)}% pagado</p>
          </div>
        ))
      )}
    </div>
  );
}

function StrategyTab({ deudas }: { deudas: any[] }) {
  const activeDebts = deudas.filter((d) => d.estado === 'Pagando');
  const avalanche = sortAvalanche(activeDebts.map((d) => ({ nombre: d.nombre, saldo: d.saldoActual, tasaInteres: d.tasaInteres, pagoMinimo: d.pagoMinimo, pagoReal: d.pagoReal })));
  const snowball = sortSnowball(activeDebts.map((d) => ({ nombre: d.nombre, saldo: d.saldoActual, tasaInteres: d.tasaInteres, pagoMinimo: d.pagoMinimo, pagoReal: d.pagoReal })));

  return (
    <div className="space-y-4">
      <StrategyList title="Avalancha (Mayor interés primero)" items={avalanche} subtitle="Ahorra más en intereses" />
      <StrategyList title="Bola de Nieve (Menor saldo primero)" items={snowball} subtitle="Motivación emocional" />
    </div>
  );
}

function StrategyList({ title, items, subtitle }: { title: string; items: any[]; subtitle: string }) {
  return (
    <div className="bg-gray-800 rounded-xl p-3">
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <p className="text-xs text-gray-400 mb-2">{subtitle}</p>
      {items.length === 0 ? (<p className="text-xs text-gray-500">Sin deudas activas</p>) : (
        items.map((d, i) => (
          <div key={d.nombre} className="flex items-center gap-2 py-1.5 border-t border-gray-700 first:border-0">
            <span className="w-5 h-5 rounded-full bg-gray-600 text-white text-xs flex items-center justify-center font-bold">{i + 1}</span>
            <div className="flex-1"><p className="text-xs text-gray-200">{d.nombre}</p><p className="text-xs text-gray-500">{(d.tasaInteres * 100).toFixed(1)}% • {formatMXN(d.saldo)}</p></div>
            <span className="text-xs text-yellow-400">{formatMXN(d.pagoReal)}/m</span>
          </div>
        ))
      )}
    </div>
  );
}

function AmortizationTab({ deudas }: { deudas: any[] }) {
  const [selected, setSelected] = useState(deudas[0]?.id || 0);
  const deuda = deudas.find((d) => d.id === selected);
  const schedule = deuda ? generateAmortization(deuda.saldoActual, deuda.tasaInteres, deuda.pagoReal, new Date(deuda.fechaInicio)) : [];

  return (
    <div className="space-y-3">
      <select value={selected} onChange={(e) => setSelected(Number(e.target.value))} className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm">
        {deudas.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
      </select>

      {schedule.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-6 text-center"><p className="text-sm text-gray-400">Selecciona una deuda para ver la tabla</p></div>
      ) : (
        <div className="bg-gray-800 rounded-xl p-3 overflow-x-auto">
          <table className="w-full text-xs min-w-[500px]">
            <thead><tr className="text-gray-400"><th className="py-1 text-left">#</th><th className="py-1 text-left">Fecha</th><th className="py-1 text-right">Saldo Ini</th><th className="py-1 text-right">Pago</th><th className="py-1 text-right">Interés</th><th className="py-1 text-right">Capital</th><th className="py-1 text-right">Saldo Fin</th></tr></thead>
            <tbody>{schedule.slice(0, 60).map((row) => (
              <tr key={row.month} className="text-gray-300 border-t border-gray-700">
                <td className="py-1">{row.month}</td><td className="py-1">{format(row.date, 'MMM yy', { locale: es })}</td>
                <td className="py-1 text-right">{formatMXN(row.startingBalance)}</td><td className="py-1 text-right">{formatMXN(row.payment)}</td>
                <td className="py-1 text-right text-red-400">{formatMXN(row.interest)}</td><td className="py-1 text-right text-emerald-400">{formatMXN(row.principal)}</td>
                <td className="py-1 text-right">{formatMXN(row.endingBalance)}</td>
              </tr>
            ))}</tbody>
          </table>
          {schedule.length > 60 && <p className="text-xs text-gray-500 mt-2 text-center">Mostrando 60 de {schedule.length} meses</p>}
        </div>
      )}
    </div>
  );
}

function CardsTab({ tarjetas }: { tarjetas: any[] }) {
  if (tarjetas.length === 0) {
    return (<div className="bg-gray-800 rounded-xl p-6 text-center"><p className="text-3xl mb-2">💳</p><p className="text-sm text-gray-400">No hay tarjetas registradas</p></div>);
  }

  return (
    <div className="space-y-4">
      {tarjetas.map((card) => {
        const utilization = card.limiteCredito > 0 ? card.saldoActual / card.limiteCredito : 0;
        const utilStatus = getUtilizationStatus(utilization);
        const scenarios = [
          simulatePayoff(card.saldoActual, card.tasaInteresAnual, card.pagoMinimoMonto, 'Mínimo'),
          simulatePayoff(card.saldoActual, card.tasaInteresAnual, card.pagoMinimoMonto * 2, 'Recomendado (2x)'),
          simulatePayoff(card.saldoActual, card.tasaInteresAnual, card.pagoMinimoMonto * 3, 'Agresivo (3x)'),
        ];

        return (
          <div key={card.id} className="bg-gray-800 rounded-xl p-3 space-y-3">
            <div className="flex justify-between items-center">
              <div><p className="text-sm font-medium text-white">{card.nombre}</p><p className="text-xs text-gray-400">{card.banco}</p></div>
              <span className={`text-xs font-medium ${utilStatus.color}`}>{(utilization * 100).toFixed(0)}% Uso</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div className={`h-3 rounded-full ${utilization < 0.3 ? 'bg-emerald-500' : utilization <= 0.7 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(utilization * 100, 100)}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-400"><span>Saldo: {formatMXN(card.saldoActual)}</span><span>Límite: {formatMXN(card.limiteCredito)}</span></div>
            <h5 className="text-xs font-semibold text-white">Simulador de Pagos</h5>
            {scenarios.map((s) => (
              <div key={s.label} className="bg-gray-700/50 rounded-lg p-2">
                <p className="text-xs font-medium text-gray-200">{s.label}</p>
                <div className="grid grid-cols-3 gap-1 mt-1 text-xs">
                  <div><span className="text-gray-500">Meses:</span> <span className="text-white">{s.months}</span></div>
                  <div><span className="text-gray-500">Total:</span> <span className="text-white">{formatMXN(s.totalPaid)}</span></div>
                  <div><span className="text-gray-500">Interés:</span> <span className="text-red-400">{formatMXN(s.totalInterest)}</span></div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function MSITab({ msiList }: { msiList: any[] }) {
  if (msiList.length === 0) {
    return (<div className="bg-gray-800 rounded-xl p-6 text-center"><p className="text-3xl mb-2">🛍️</p><p className="text-sm text-gray-400">No hay compras MSI activas</p></div>);
  }

  return (
    <div className="space-y-3">
      {msiList.map((m) => {
        const totalMeses = parseInt(m.plazo) || 1;
        const progress = m.mesesPagados / totalMeses;
        return (
          <div key={m.id} className="bg-gray-800 rounded-xl p-3">
            <div className="flex justify-between items-center">
              <div><p className="text-sm text-white">{m.descripcion}</p><p className="text-xs text-gray-400">{m.tienda} • {m.tarjeta}</p></div>
              <span className={`px-2 py-0.5 text-xs rounded-full ${m.estado === 'Activo' ? 'bg-blue-900/50 text-blue-300' : 'bg-emerald-900/50 text-emerald-300'}`}>{m.estado}</span>
            </div>
            <div className="flex justify-between text-xs mt-2 text-gray-400"><span>Total: {formatMXN(m.montoTotal)}</span><span>Mensual: {formatMXN(m.pagoMensual)}</span><span>{m.mesesPagados}/{totalMeses} meses</span></div>
            <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2"><div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${progress * 100}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}
