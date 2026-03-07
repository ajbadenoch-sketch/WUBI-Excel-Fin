// Mexican ISR Monthly Tax Table 2026 (Art. 96 LISR)
export const ISR_TABLE = [
  { limInf: 0.01, limSup: 746.04, cuota: 0, tasa: 0.0192 },
  { limInf: 746.05, limSup: 6332.05, cuota: 14.32, tasa: 0.064 },
  { limInf: 6332.06, limSup: 11128.01, cuota: 371.83, tasa: 0.1088 },
  { limInf: 11128.02, limSup: 12935.82, cuota: 893.63, tasa: 0.16 },
  { limInf: 12935.83, limSup: 15487.71, cuota: 1182.88, tasa: 0.1792 },
  { limInf: 15487.72, limSup: 31236.49, cuota: 1640.18, tasa: 0.2136 },
  { limInf: 31236.50, limSup: 62500, cuota: 4005.34, tasa: 0.2352 },
  { limInf: 62500.01, limSup: 83333.33, cuota: 11349.42, tasa: 0.30 },
  { limInf: 83333.34, limSup: 250000, cuota: 17599.42, tasa: 0.32 },
  { limInf: 250000.01, limSup: 9999999, cuota: 70849.42, tasa: 0.35 },
];

export const METODOS_PAGO = [
  'Efectivo',
  'Tarjeta de Crédito',
  'Tarjeta de Débito',
  'Transferencia',
  'Cheque',
] as const;

export const RESPONSABLES = ['Papá', 'Mamá', 'Ambos'] as const;

export const FRECUENCIAS = [
  'Semanal',
  'Quincenal',
  'Mensual',
  'Bimestral',
  'Trimestral',
  'Semestral',
  'Anual',
] as const;

export const PLAZOS_MSI = [
  '3 meses',
  '6 meses',
  '9 meses',
  '12 meses',
  '18 meses',
  '24 meses',
] as const;

export const TIPOS_IVA = [
  'IVA 16%',
  'Tasa 0%',
  'Exento',
  'No aplica',
  'IVA 8% Frontera',
] as const;

export const TIPOS_DEUDA = [
  'Tarjeta de Crédito',
  'Préstamo Personal',
  'Hipoteca',
  'Crédito Revolvente',
  'Crédito Automotriz',
  'Otro',
] as const;

export const TIPOS_CUENTA = [
  'Nómina',
  'Ahorro',
  'CETES',
  'Inversión',
] as const;

export const CATEGORIAS_AHORRO = [
  'Emergencia',
  'Viaje',
  'Inversión',
  'Educación',
  'Retiro',
  'Otro',
] as const;

export const CATEGORY_ICONS: Record<string, string> = {
  'Salario': '💰',
  'Bonos': '🎁',
  'Freelance': '💻',
  'Inversiones': '📈',
  'Otros Ingresos': '💵',
  'Vivienda': '🏠',
  'Supermercado': '🛒',
  'Gasolina': '⛽',
  'Transporte': '🚗',
  'Servicios': '📱',
  'Salud': '🏥',
  'Educación': '📚',
  'Entretenimiento': '🎬',
  'Restaurantes': '🍽️',
  'Ropa': '👕',
  'Seguros': '🛡️',
  'Deudas': '💳',
  'Ahorros': '🏦',
  'Mascotas': '🐾',
  'Cuidado Personal': '💆',
  'Regalos': '🎀',
  'Hogar': '🏡',
  'Impuestos': '📋',
  'default': '📌',
};

export function formatMXN(amount: number): string {
  if (amount < 0) {
    return `(${new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(Math.abs(amount))})`;
  }
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

export function getCategoryIcon(category: string): string {
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (category.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return CATEGORY_ICONS.default;
}
