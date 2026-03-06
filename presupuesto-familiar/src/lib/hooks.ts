'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import type { Configuracion, Movimiento, Categoria, Deuda, Ahorro, Tarjeta, Recurrente, Banco, Presupuesto, MSI, PagoDeuda, FiscalConfig } from '@/db/schema';

export function useConfig(): Configuracion | undefined {
  return useLiveQuery(() => db.configuracion.get(1));
}

export function useMovimientos(): Movimiento[] {
  return useLiveQuery(() => db.movimientos.toArray()) ?? [];
}

export function useCategorias(): Categoria[] {
  return useLiveQuery(() => db.categorias.orderBy('orden').toArray()) ?? [];
}

export function useDeudas(): Deuda[] {
  return useLiveQuery(() => db.deudas.toArray()) ?? [];
}

export function useAhorros(): Ahorro[] {
  return useLiveQuery(() => db.ahorros.toArray()) ?? [];
}

export function useTarjetas(): Tarjeta[] {
  return useLiveQuery(() => db.tarjetas.toArray()) ?? [];
}

export function useRecurrentes(): Recurrente[] {
  return useLiveQuery(() => db.recurrentes.toArray()) ?? [];
}

export function useBancos(): Banco[] {
  return useLiveQuery(() => db.bancos.toArray()) ?? [];
}

export function usePresupuestos(): Presupuesto[] {
  return useLiveQuery(() => db.presupuesto.toArray()) ?? [];
}

export function useMSI(): MSI[] {
  return useLiveQuery(() => db.msi.toArray()) ?? [];
}

export function usePagosDeudas(): PagoDeuda[] {
  return useLiveQuery(() => db.pagosDeudas.toArray()) ?? [];
}

export function useFiscalConfig(): FiscalConfig | undefined {
  return useLiveQuery(() => db.fiscalConfig.get(1));
}
