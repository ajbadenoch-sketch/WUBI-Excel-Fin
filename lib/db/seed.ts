import { db } from './schema';
import type { Categoria, Configuracion, FiscalConfig } from './schema';

const CATEGORIAS_SEED: Categoria[] = [
  // Ingresos
  { id: 'ING-01', nombre: 'Salario Persona 1', tipo: 'Ingreso', grupo: 'Ingresos Fijos', nivel: 1, orden: 1, activa: true, presupuestoBase: 0 },
  { id: 'ING-02', nombre: 'Salario Persona 2', tipo: 'Ingreso', grupo: 'Ingresos Fijos', nivel: 1, orden: 2, activa: true, presupuestoBase: 0 },
  { id: 'ING-03', nombre: 'Bonos', tipo: 'Ingreso', grupo: 'Ingresos Variables', nivel: 1, orden: 3, activa: true, presupuestoBase: 0 },
  { id: 'ING-04', nombre: 'Aguinaldo', tipo: 'Ingreso', grupo: 'Ingresos Variables', nivel: 1, orden: 4, activa: true, presupuestoBase: 0 },
  { id: 'ING-05', nombre: 'Freelance', tipo: 'Ingreso', grupo: 'Ingresos Variables', nivel: 1, orden: 5, activa: true, presupuestoBase: 0 },
  { id: 'ING-06', nombre: 'Inversiones', tipo: 'Ingreso', grupo: 'Ingresos Pasivos', nivel: 1, orden: 6, activa: true, presupuestoBase: 0 },
  { id: 'ING-07', nombre: 'Rentas', tipo: 'Ingreso', grupo: 'Ingresos Pasivos', nivel: 1, orden: 7, activa: true, presupuestoBase: 0 },
  { id: 'ING-08', nombre: 'Otros Ingresos', tipo: 'Ingreso', grupo: 'Ingresos Variables', nivel: 1, orden: 8, activa: true, presupuestoBase: 0 },

  // Gastos
  { id: 'GAS-01', nombre: 'Vivienda', tipo: 'Gasto', grupo: 'Esenciales', nivel: 1, orden: 1, activa: true, presupuestoBase: 0 },
  { id: 'GAS-01a', nombre: 'Renta/Hipoteca', tipo: 'Gasto', grupo: 'Esenciales', subcategoriaDe: 'GAS-01', nivel: 2, orden: 2, activa: true, presupuestoBase: 0 },
  { id: 'GAS-01b', nombre: 'Mantenimiento', tipo: 'Gasto', grupo: 'Esenciales', subcategoriaDe: 'GAS-01', nivel: 2, orden: 3, activa: true, presupuestoBase: 0 },
  { id: 'GAS-02', nombre: 'Supermercado', tipo: 'Gasto', grupo: 'Esenciales', nivel: 1, orden: 4, activa: true, presupuestoBase: 0 },
  { id: 'GAS-03', nombre: 'Servicios', tipo: 'Gasto', grupo: 'Esenciales', nivel: 1, orden: 5, activa: true, presupuestoBase: 0 },
  { id: 'GAS-03a', nombre: 'Luz', tipo: 'Gasto', grupo: 'Esenciales', subcategoriaDe: 'GAS-03', nivel: 2, orden: 6, activa: true, presupuestoBase: 0 },
  { id: 'GAS-03b', nombre: 'Agua', tipo: 'Gasto', grupo: 'Esenciales', subcategoriaDe: 'GAS-03', nivel: 2, orden: 7, activa: true, presupuestoBase: 0 },
  { id: 'GAS-03c', nombre: 'Gas', tipo: 'Gasto', grupo: 'Esenciales', subcategoriaDe: 'GAS-03', nivel: 2, orden: 8, activa: true, presupuestoBase: 0 },
  { id: 'GAS-03d', nombre: 'Internet/Teléfono', tipo: 'Gasto', grupo: 'Esenciales', subcategoriaDe: 'GAS-03', nivel: 2, orden: 9, activa: true, presupuestoBase: 0 },
  { id: 'GAS-04', nombre: 'Transporte', tipo: 'Gasto', grupo: 'Esenciales', nivel: 1, orden: 10, activa: true, presupuestoBase: 0 },
  { id: 'GAS-04a', nombre: 'Gasolina', tipo: 'Gasto', grupo: 'Esenciales', subcategoriaDe: 'GAS-04', nivel: 2, orden: 11, activa: true, presupuestoBase: 0 },
  { id: 'GAS-05', nombre: 'Salud', tipo: 'Gasto', grupo: 'Esenciales', nivel: 1, orden: 12, activa: true, presupuestoBase: 0 },
  { id: 'GAS-06', nombre: 'Educación', tipo: 'Gasto', grupo: 'Esenciales', nivel: 1, orden: 13, activa: true, presupuestoBase: 0 },
  { id: 'GAS-07', nombre: 'Seguros', tipo: 'Gasto', grupo: 'Esenciales', nivel: 1, orden: 14, activa: true, presupuestoBase: 0 },
  { id: 'GAS-08', nombre: 'Entretenimiento', tipo: 'Gasto', grupo: 'Discrecional', nivel: 1, orden: 15, activa: true, presupuestoBase: 0 },
  { id: 'GAS-09', nombre: 'Restaurantes', tipo: 'Gasto', grupo: 'Discrecional', nivel: 1, orden: 16, activa: true, presupuestoBase: 0 },
  { id: 'GAS-10', nombre: 'Ropa', tipo: 'Gasto', grupo: 'Discrecional', nivel: 1, orden: 17, activa: true, presupuestoBase: 0 },
  { id: 'GAS-11', nombre: 'Cuidado Personal', tipo: 'Gasto', grupo: 'Discrecional', nivel: 1, orden: 18, activa: true, presupuestoBase: 0 },
  { id: 'GAS-12', nombre: 'Mascotas', tipo: 'Gasto', grupo: 'Discrecional', nivel: 1, orden: 19, activa: true, presupuestoBase: 0 },
  { id: 'GAS-13', nombre: 'Regalos', tipo: 'Gasto', grupo: 'Discrecional', nivel: 1, orden: 20, activa: true, presupuestoBase: 0 },
  { id: 'GAS-14', nombre: 'Hogar', tipo: 'Gasto', grupo: 'Discrecional', nivel: 1, orden: 21, activa: true, presupuestoBase: 0 },
  { id: 'GAS-15', nombre: 'Deudas', tipo: 'Gasto', grupo: 'Deudas', nivel: 1, orden: 22, activa: true, presupuestoBase: 0 },
  { id: 'GAS-16', nombre: 'Ahorros', tipo: 'Gasto', grupo: 'Ahorro', nivel: 1, orden: 23, activa: true, presupuestoBase: 0 },
  { id: 'GAS-17', nombre: 'Impuestos', tipo: 'Gasto', grupo: 'Esenciales', nivel: 1, orden: 24, activa: true, presupuestoBase: 0 },
  { id: 'GAS-18', nombre: 'Otros Gastos', tipo: 'Gasto', grupo: 'Discrecional', nivel: 1, orden: 25, activa: true, presupuestoBase: 0 },
];

const CONFIG_SEED: Configuracion = {
  id: 1,
  mesActivo: '2026-03-01',
  anioFiscalInicio: 2026,
  anioFiscalFin: 2027,
  moneda: 'MXN',
  saldoBancoInicial: 0,
  fechaInicioSistema: '2026-03-01',
  pagoMensualVisa: 0,
  pagoMensualMc: 0,
  pagoMensualHipo: 0,
  endeudamientoAlto: 0.30,
  endeudamientoModerado: 0.20,
  utilizacionTdcAlta: 0.70,
  utilizacionTdcModerada: 0.30,
  diasAlertaRecurrente: 3,
};

const FISCAL_SEED: FiscalConfig = {
  id: 1,
  papaRegimenPrincipal: 'Sueldos y Salarios',
  papaIngresoNomina: 0,
  papaIsrRetenido: 0,
  mamaRegimenPrincipal: 'Sueldos y Salarios',
  mamaIngresoNomina: 0,
  mamaIsrRetenido: 0,
  umaDiaria: 113.14,
};

export async function seedDatabase() {
  const configCount = await db.configuracion.count();
  if (configCount === 0) {
    await db.configuracion.add(CONFIG_SEED);
  }

  const catCount = await db.categorias.count();
  if (catCount === 0) {
    await db.categorias.bulkAdd(CATEGORIAS_SEED);
  }

  const fiscalCount = await db.fiscalConfig.count();
  if (fiscalCount === 0) {
    await db.fiscalConfig.add(FISCAL_SEED);
  }
}
