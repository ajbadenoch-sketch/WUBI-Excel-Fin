import { ISR_TABLE } from './constants';
import { isSameMonth, getDaysInMonth, differenceInDays, addMonths, startOfMonth } from 'date-fns';

// ─── Monthly Totals ───
export function getMonthlyIncome(
  movimientos: { tipo: string; fecha: string; monto: number }[],
  mesActivo: Date
): number {
  return movimientos
    .filter((m) => m.tipo === 'Ingreso' && isSameMonth(new Date(m.fecha), mesActivo))
    .reduce((sum, m) => sum + m.monto, 0);
}

export function getMonthlyExpenses(
  movimientos: { tipo: string; fecha: string; monto: number }[],
  mesActivo: Date
): number {
  return movimientos
    .filter((m) => m.tipo === 'Gasto' && isSameMonth(new Date(m.fecha), mesActivo))
    .reduce((sum, m) => sum + m.monto, 0);
}

export function getSavingsRate(income: number, expenses: number): number {
  return income > 0 ? (income - expenses) / income : 0;
}

export function getDailyAvgSpend(expenses: number, mesActivo: Date): number {
  return expenses / getDaysInMonth(mesActivo);
}

// ─── Budget vs Actual ───
export function getVariance(budgeted: number, actual: number): number {
  return budgeted - actual; // Positive = under budget
}

// ─── Cash Flow ───
export function getWeekNumber(day: number): number {
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  if (day <= 28) return 4;
  return 5;
}

export interface CashFlowRow {
  period: string;
  entries: number;
  exits: number;
  net: number;
  balance: number;
}

export function generateMonthlyCashFlow(
  movimientos: { tipo: string; fecha: string; monto: number }[],
  mesActivo: Date,
  initialBalance: number
): CashFlowRow[] {
  const weeks: CashFlowRow[] = [];
  let runningBalance = initialBalance;

  for (let w = 1; w <= 5; w++) {
    const weekMovs = movimientos.filter((m) => {
      const d = new Date(m.fecha);
      return isSameMonth(d, mesActivo) && getWeekNumber(d.getDate()) === w;
    });

    const entries = weekMovs
      .filter((m) => m.tipo === 'Ingreso')
      .reduce((s, m) => s + m.monto, 0);
    const exits = weekMovs
      .filter((m) => m.tipo === 'Gasto')
      .reduce((s, m) => s + m.monto, 0);
    const net = entries - exits;
    runningBalance += net;

    weeks.push({
      period: `Semana ${w}`,
      entries,
      exits,
      net,
      balance: runningBalance,
    });
  }
  return weeks;
}

export function generateCashFlowProjection(
  movimientos: { tipo: string; fecha: string; monto: number }[],
  presupuesto: { categoria: string; tipo: string; mes: string; monto: number }[],
  mesActivo: Date,
  initialBalance: number,
  months: number = 12
): CashFlowRow[] {
  const rows: CashFlowRow[] = [];
  let runningBalance = initialBalance;

  for (let i = 0; i < months; i++) {
    const month = addMonths(startOfMonth(mesActivo), i);
    const isCurrentMonth = isSameMonth(month, mesActivo);

    let entries: number;
    let exits: number;

    if (isCurrentMonth) {
      entries = movimientos
        .filter((m) => m.tipo === 'Ingreso' && isSameMonth(new Date(m.fecha), month))
        .reduce((s, m) => s + m.monto, 0);
      exits = movimientos
        .filter((m) => m.tipo === 'Gasto' && isSameMonth(new Date(m.fecha), month))
        .reduce((s, m) => s + m.monto, 0);
    } else {
      entries = presupuesto
        .filter(
          (p) => p.tipo === 'Ingreso' && isSameMonth(new Date(p.mes), month)
        )
        .reduce((s, p) => s + p.monto, 0);
      exits = presupuesto
        .filter(
          (p) => p.tipo === 'Gasto' && isSameMonth(new Date(p.mes), month)
        )
        .reduce((s, p) => s + p.monto, 0);
    }

    const net = entries - exits;
    runningBalance += net;

    rows.push({
      period: month.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }),
      entries,
      exits,
      net,
      balance: runningBalance,
    });
  }
  return rows;
}

// ─── Debt Amortization ───
export function calculatePMT(rate: number, nper: number, pv: number): number {
  const monthlyRate = rate / 12;
  if (monthlyRate === 0) return pv / nper;
  return (
    (pv * (monthlyRate * Math.pow(1 + monthlyRate, nper))) /
    (Math.pow(1 + monthlyRate, nper) - 1)
  );
}

export interface AmortizationRow {
  month: number;
  date: Date;
  startingBalance: number;
  payment: number;
  interest: number;
  principal: number;
  endingBalance: number;
}

export function generateAmortization(
  saldo: number,
  tasaAnual: number,
  pagoMensual: number,
  startDate: Date = new Date()
): AmortizationRow[] {
  const schedule: AmortizationRow[] = [];
  let balance = saldo;
  let month = 0;

  while (balance > 0.01 && month < 600) {
    month++;
    const interest = balance * (tasaAnual / 12);
    const principal = Math.min(pagoMensual - interest, balance);
    if (principal <= 0) break; // Payment doesn't cover interest
    const startingBalance = balance;
    balance -= principal;

    schedule.push({
      month,
      date: addMonths(startDate, month),
      startingBalance,
      payment: interest + principal,
      interest,
      principal,
      endingBalance: Math.max(balance, 0),
    });
  }
  return schedule;
}

// ─── Credit Card Payment Simulator ───
export interface PayoffResult {
  months: number;
  totalPaid: number;
  totalInterest: number;
  label: string;
}

export function simulatePayoff(
  saldo: number,
  tasaAnual: number,
  pagoMensual: number,
  label: string = ''
): PayoffResult {
  let balance = saldo;
  let months = 0;
  let totalInterest = 0;
  const monthlyRate = tasaAnual / 12;

  while (balance > 0.01 && months < 600) {
    months++;
    const interest = balance * monthlyRate;
    totalInterest += interest;
    balance = balance + interest - pagoMensual;
    if (balance < 0) balance = 0;
  }

  return {
    months,
    totalPaid: saldo + totalInterest,
    totalInterest,
    label,
  };
}

// ─── ISR Calculation ───
export function calculateISR(baseGravable: number): number {
  const bracket = ISR_TABLE.find(
    (b) => baseGravable >= b.limInf && baseGravable <= b.limSup
  );
  if (!bracket) return 0;
  return bracket.cuota + (baseGravable - bracket.limInf) * bracket.tasa;
}

// ─── Debt-to-Income Ratio ───
export function getDebtToIncomeRatio(debtPayments: number, monthlyIncome: number): number {
  return monthlyIncome > 0 ? debtPayments / monthlyIncome : 0;
}

export function getDebtRatioStatus(ratio: number): { label: string; color: string; icon: string } {
  if (ratio < 0.2) return { label: 'SALUDABLE', color: 'text-emerald-400', icon: '✅' };
  if (ratio <= 0.3) return { label: 'MODERADO', color: 'text-yellow-400', icon: '⚡' };
  return { label: 'ALTO', color: 'text-red-400', icon: '⚠️' };
}

// ─── Recurring Expense Status ───
export function getRecurringStatus(
  proximoCargo: Date,
  today: Date,
  diasAlerta: number
): { label: string; color: string } {
  if (proximoCargo < today)
    return { label: '🔴 Atrasado', color: 'text-red-400' };
  if (differenceInDays(proximoCargo, today) <= diasAlerta)
    return { label: '🟡 Próximo', color: 'text-yellow-400' };
  return { label: '🟢 Al día', color: 'text-emerald-400' };
}

// ─── Avalanche Strategy ───
export interface DebtForStrategy {
  nombre: string;
  saldo: number;
  tasaInteres: number;
  pagoMinimo: number;
  pagoReal: number;
}

export function sortAvalanche(debts: DebtForStrategy[]): DebtForStrategy[] {
  return [...debts].sort((a, b) => b.tasaInteres - a.tasaInteres);
}

export function sortSnowball(debts: DebtForStrategy[]): DebtForStrategy[] {
  return [...debts].sort((a, b) => a.saldo - b.saldo);
}

// ─── Credit Card Utilization ───
export function getUtilizationStatus(utilization: number): {
  label: string;
  color: string;
} {
  if (utilization < 0.3) return { label: 'Baja', color: 'text-emerald-400' };
  if (utilization <= 0.7) return { label: 'Moderada', color: 'text-yellow-400' };
  return { label: 'Alta', color: 'text-red-400' };
}
