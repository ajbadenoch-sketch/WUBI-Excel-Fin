'use client';

import { useConfig, useMovimientos, useDeudas, useAhorros, useTarjetas, useRecurrentes, useBancos } from '@/lib/budget/hooks';
import { formatMXN, getCategoryIcon } from '@/lib/budget/constants';
import {
  getMonthlyIncome,
  getMonthlyExpenses,
  getSavingsRate,
  getDebtToIncomeRatio,
  getDebtRatioStatus,
  getRecurringStatus,
} from '@/lib/budget/calculations';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';

export default function PanelScreen() {
  const config = useConfig();
  const movimientos = useMovimientos();
  const deudas = useDeudas();
  const ahorros = useAhorros();
  const tarjetas = useTarjetas();
  const recurrentes = useRecurrentes();
  const bancos = useBancos();

  if (!config) return <div className="p-4 text-gray-400">Cargando...</div>;

  const mesActivo = new Date(config.mesActivo);
  const income = getMonthlyIncome(movimientos, mesActivo);
  const expenses = getMonthlyExpenses(movimientos, mesActivo);
  const balance = income - expenses;
  const savingsRate = getSavingsRate(income, expenses);

  const totalDebt = deudas.reduce((s, d) => s + d.saldoActual, 0);
  const debtPayments = deudas
    .filter((d) => d.estado === 'Pagando')
    .reduce((s, d) => s + d.pagoReal, 0);
  const debtRatio = getDebtToIncomeRatio(debtPayments, income);
  const debtStatus = getDebtRatioStatus(debtRatio);

  const patrimonioLiquido = bancos.reduce((s, b) => s + b.saldoReal, 0);
  const patrimonioNeto = patrimonioLiquido - totalDebt;

  const overdueRecurrentes = recurrentes.filter((r) => {
    if (!r.activo) return false;
    const status = getRecurringStatus(
      new Date(r.proximoCargo),
      new Date(),
      config.diasAlertaRecurrente
    );
    return status.label.includes('Atrasado');
  });
  const upcomingRecurrentes = recurrentes.filter((r) => {
    if (!r.activo) return false;
    const status = getRecurringStatus(
      new Date(r.proximoCargo),
      new Date(),
      config.diasAlertaRecurrente
    );
    return status.label.includes('Próximo');
  });

  const activeMsi = tarjetas.filter((t) => t.estado === 'Activa');

  const last10 = [...movimientos]
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 10);

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-lg font-bold text-white">Presupuesto Familiar</h1>
        <p className="text-sm text-gray-400 capitalize">
          {format(mesActivo, 'MMMM yyyy', { locale: es })}
        </p>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Ingresos" value={formatMXN(income)} color="text-emerald-400" Icon={TrendingUp} />
        <StatCard label="Gastos" value={formatMXN(expenses)} color="text-red-400" Icon={TrendingDown} />
        <StatCard label="Balance" value={formatMXN(balance)} color={balance >= 0 ? 'text-emerald-400' : 'text-red-400'} Icon={Wallet} />
        <StatCard label="Tasa Ahorro" value={`${(savingsRate * 100).toFixed(1)}%`} color="text-blue-400" Icon={PiggyBank} />
      </div>

      {/* Alert Badges */}
      {(overdueRecurrentes.length > 0 || upcomingRecurrentes.length > 0 || activeMsi.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {overdueRecurrentes.length > 0 && (
            <span className="px-2 py-1 bg-red-900/50 text-red-300 text-xs rounded-full">
              {overdueRecurrentes.length} atrasado(s)
            </span>
          )}
          {upcomingRecurrentes.length > 0 && (
            <span className="px-2 py-1 bg-yellow-900/50 text-yellow-300 text-xs rounded-full">
              {upcomingRecurrentes.length} próximo(s)
            </span>
          )}
          {activeMsi.length > 0 && (
            <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded-full">
              {activeMsi.length} tarjeta(s)
            </span>
          )}
        </div>
      )}

      {/* Mini Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-800 rounded-xl p-3">
          <p className="text-xs text-gray-400">Patrimonio Neto</p>
          <p className={`text-lg font-bold ${patrimonioNeto >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatMXN(patrimonioNeto)}
          </p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3">
          <p className="text-xs text-gray-400">Deuda/Ingreso</p>
          <p className={`text-lg font-bold ${debtStatus.color}`}>
            {debtStatus.icon} {(debtRatio * 100).toFixed(1)}%
          </p>
          <p className={`text-xs ${debtStatus.color}`}>{debtStatus.label}</p>
        </div>
      </div>

      {/* Savings Progress */}
      {ahorros.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-3 space-y-3">
          <h3 className="text-sm font-semibold text-white">Planes de Ahorro</h3>
          {ahorros.filter(a => a.estado === 'Activo').map((plan) => {
            const progress = plan.metaTotal > 0 ? plan.saldoActual / plan.metaTotal : 0;
            return (
              <div key={plan.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-300">{plan.nombre}</span>
                  <span className="text-gray-400">
                    {formatMXN(plan.saldoActual)} / {formatMXN(plan.metaTotal)}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(progress * 100, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Debts Summary */}
      {deudas.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-3 space-y-2">
          <h3 className="text-sm font-semibold text-white">Deudas</h3>
          {deudas.map((d) => (
            <div key={d.id} className="flex justify-between items-center text-xs">
              <span className="text-gray-300">{d.nombre}</span>
              <div className="text-right">
                <span className="text-red-400">{formatMXN(d.saldoActual)}</span>
                <span className="text-gray-500 ml-2">/ {formatMXN(d.pagoReal)}/mes</span>
              </div>
            </div>
          ))}
          <div className="border-t border-gray-700 pt-1 flex justify-between text-xs font-semibold">
            <span className="text-gray-300">Total</span>
            <span className="text-red-400">{formatMXN(totalDebt)}</span>
          </div>
        </div>
      )}

      {/* Budget vs Actual Mini */}
      <div className="grid grid-cols-2 gap-2">
        <CircularProgress label="Ingresos" value={income} total={income || 1} color="emerald" />
        <CircularProgress label="Gastos" value={expenses} total={income || 1} color="red" />
      </div>

      {/* Last 10 Transactions */}
      <div className="bg-gray-800 rounded-xl p-3 space-y-2">
        <h3 className="text-sm font-semibold text-white">Últimos Movimientos</h3>
        {last10.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-3xl mb-2">📝</p>
            <p className="text-sm text-gray-400">No hay movimientos registrados</p>
            <p className="text-xs text-gray-500">Usa la pestaña Registrar para comenzar</p>
          </div>
        ) : (
          last10.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span>{getCategoryIcon(m.categoria)}</span>
                <div>
                  <p className="text-gray-200">{m.descripcion || m.categoria}</p>
                  <p className="text-gray-500">
                    {format(new Date(m.fecha), 'd MMM yyyy', { locale: es })}
                  </p>
                </div>
              </div>
              <span className={m.tipo === 'Ingreso' ? 'text-emerald-400' : 'text-red-400'}>
                {m.tipo === 'Ingreso' ? '+' : '-'}{formatMXN(m.monto)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, Icon }: { label: string; value: string; color: string; Icon: React.ElementType }) {
  return (
    <div className="bg-gray-800 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <p className="text-xs text-gray-400">{label}</p>
      </div>
      <p className={`text-base font-bold ${color}`}>{value}</p>
    </div>
  );
}

function CircularProgress({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: 'emerald' | 'red';
}) {
  const pct = Math.min((value / total) * 100, 100);
  const colorClass = color === 'emerald' ? 'text-emerald-400' : 'text-red-400';
  const bgClass = color === 'emerald' ? 'stroke-emerald-500' : 'stroke-red-500';

  return (
    <div className="bg-gray-800 rounded-xl p-3 flex flex-col items-center">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#374151" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          className={bgClass}
          strokeWidth="3"
          strokeDasharray={`${pct} ${100 - pct}`}
          strokeLinecap="round"
        />
      </svg>
      <p className={`text-xs mt-1 ${colorClass}`}>{label}</p>
      <p className="text-xs text-gray-400">{formatMXN(value)}</p>
    </div>
  );
}
