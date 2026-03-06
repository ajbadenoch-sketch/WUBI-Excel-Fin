import Dexie, { type EntityTable } from 'dexie';

// ─── Interfaces ───
export interface Configuracion {
  id: number;
  mesActivo: string;
  anioFiscalInicio: number;
  anioFiscalFin: number;
  moneda: string;
  saldoBancoInicial: number;
  fechaInicioSistema: string;
  pagoMensualVisa: number;
  pagoMensualMc: number;
  pagoMensualHipo: number;
  endeudamientoAlto: number;
  endeudamientoModerado: number;
  utilizacionTdcAlta: number;
  utilizacionTdcModerada: number;
  diasAlertaRecurrente: number;
}

export interface Categoria {
  id: string;
  nombre: string;
  tipo: 'Ingreso' | 'Gasto';
  grupo: string;
  subcategoriaDe?: string;
  nivel: number;
  orden: number;
  activa: boolean;
  presupuestoBase: number;
  notas?: string;
}

export interface Movimiento {
  id?: number;
  fecha: string;
  tipo: 'Ingreso' | 'Gasto';
  categoria: string;
  descripcion?: string;
  monto: number;
  metodoPago?: string;
  responsable?: string;
  recurrente: boolean;
  frecuencia?: string;
  msi: boolean;
  plazoMsi?: string;
  tarjetaUtilizada?: string;
  notas?: string;
  esPagoDeuda: boolean;
  deudaAsociada?: string;
  montoCapital?: number;
  montoIntereses?: number;
  deducible: boolean;
  tipoIva?: string;
  tieneCfdi: boolean;
  createdAt: string;
}

export interface Presupuesto {
  id?: number;
  categoria: string;
  tipo: 'Ingreso' | 'Gasto';
  mes: string;
  monto: number;
}

export interface Deuda {
  id?: number;
  nombre: string;
  tipo: string;
  montoOriginal: number;
  saldoActual: number;
  tasaInteres: number;
  fechaInicio: string;
  plazoMeses: number;
  pagoMinimo: number;
  pagoReal: number;
  fechaUltimoPago?: string;
  estado: string;
  notas?: string;
  prioridadAvalancha?: number;
  prioridadSnowball?: number;
}

export interface PagoDeuda {
  id?: number;
  movimientoId?: number;
  fecha: string;
  deuda: string;
  montoPagado: number;
  aCapital: number;
  aIntereses: number;
  saldoDespues: number;
  notas?: string;
}

export interface Tarjeta {
  id?: number;
  nombre: string;
  banco: string;
  limiteCredito: number;
  saldoActual: number;
  tasaInteresAnual: number;
  tasaMoratoria: number;
  pagoMinimoPct: number;
  pagoMinimoMonto: number;
  pagoProgramado: number;
  fechaCorte: number;
  fechaPagoLimite: number;
  diasGracia: number;
  anualidad: number;
  recompensas?: string;
  estado: string;
  notas?: string;
}

export interface MSI {
  id?: number;
  descripcion: string;
  tienda: string;
  tarjeta: string;
  montoTotal: number;
  fechaCompra: string;
  plazo: string;
  pagoMensual: number;
  mesesPagados: number;
  saldoPendiente: number;
  proximoPago: string;
  fechaFin: string;
  estado: string;
}

export interface Ahorro {
  id?: number;
  nombre: string;
  categoria: string;
  metaTotal: number;
  plazoMeses: number;
  fechaInicio: string;
  fechaMeta: string;
  ahorroMensualReq: number;
  saldoActual: number;
  banco?: string;
  estado: string;
  notas?: string;
  claveBusqueda: string;
}

export interface Banco {
  id?: number;
  institucion: string;
  tipoCuenta: string;
  numCuenta?: string;
  clabe?: string;
  moneda: string;
  titular: string;
  proposito?: string;
  saldoBaseInicial: number;
  saldoReal: number;
  tasaRendimiento: number;
  plazo?: string;
  estado: string;
}

export interface Recurrente {
  id?: number;
  nombre: string;
  categoria: string;
  monto: number;
  frecuencia: string;
  diaDelMes: number;
  metodoPago: string;
  responsable: string;
  fechaInicio: string;
  fechaFin?: string;
  activo: boolean;
  proximoCargo: string;
  ultimaVezRegistrado?: string;
  autoRegistrar: boolean;
  notas?: string;
}

export interface FiscalConfig {
  id: number;
  papaRegimenPrincipal: string;
  papaRegimenSecundario?: string;
  papaIngresoNomina: number;
  papaIsrRetenido: number;
  mamaRegimenPrincipal: string;
  mamaRegimenSecundario?: string;
  mamaIngresoNomina: number;
  mamaIsrRetenido: number;
  umaDiaria: number;
}

// ─── Database ───
export class PresupuestoDB extends Dexie {
  configuracion!: EntityTable<Configuracion, 'id'>;
  categorias!: EntityTable<Categoria, 'id'>;
  movimientos!: EntityTable<Movimiento, 'id'>;
  presupuesto!: EntityTable<Presupuesto, 'id'>;
  deudas!: EntityTable<Deuda, 'id'>;
  pagosDeudas!: EntityTable<PagoDeuda, 'id'>;
  tarjetas!: EntityTable<Tarjeta, 'id'>;
  msi!: EntityTable<MSI, 'id'>;
  ahorros!: EntityTable<Ahorro, 'id'>;
  bancos!: EntityTable<Banco, 'id'>;
  recurrentes!: EntityTable<Recurrente, 'id'>;
  fiscalConfig!: EntityTable<FiscalConfig, 'id'>;

  constructor() {
    super('PresupuestoFamiliar');
    this.version(1).stores({
      configuracion: 'id',
      categorias: 'id, nombre, tipo, grupo, nivel',
      movimientos: '++id, fecha, tipo, categoria, esPagoDeuda',
      presupuesto: '++id, categoria, tipo, mes, [categoria+mes]',
      deudas: '++id, nombre, estado',
      pagosDeudas: '++id, movimientoId, fecha, deuda',
      tarjetas: '++id, nombre, estado',
      msi: '++id, estado',
      ahorros: '++id, nombre, estado',
      bancos: '++id, institucion, estado',
      recurrentes: '++id, nombre, activo',
      fiscalConfig: 'id',
    });
  }
}

export const db = new PresupuestoDB();
