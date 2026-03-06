'use client';

import { useState } from 'react';
import { db } from '@/db/schema';
import { useConfig, useCategorias, useBancos, useAhorros, useRecurrentes, useFiscalConfig, useMovimientos } from '@/lib/hooks';
import { formatMXN, TIPOS_CUENTA, RESPONSABLES, METODOS_PAGO, FRECUENCIAS } from '@/lib/constants';
import { getRecurringStatus } from '@/lib/calculations';
import { Input, Select, Toggle } from '@/components/forms/MovimientoForm';
import { format } from 'date-fns';

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'categorias', label: 'Categorías' },
  { id: 'bancos', label: 'Bancos' },
  { id: 'ahorros', label: 'Ahorros' },
  { id: 'recurrentes', label: 'Recurrentes' },
  { id: 'fiscal', label: 'Fiscal' },
  { id: 'datos', label: 'Datos' },
];

export default function ConfigScreen() {
  const [tab, setTab] = useState('general');

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-lg font-bold text-white">Configuración</h2>
      <div className="flex gap-1 bg-gray-800 rounded-xl p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-xs rounded-lg whitespace-nowrap transition-colors ${
              tab === t.id ? 'bg-gray-600 text-white' : 'text-gray-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && <GeneralTab />}
      {tab === 'categorias' && <CategoriasTab />}
      {tab === 'bancos' && <BancosTab />}
      {tab === 'ahorros' && <AhorrosTab />}
      {tab === 'recurrentes' && <RecurrentesTab />}
      {tab === 'fiscal' && <FiscalTab />}
      {tab === 'datos' && <DatosTab />}
    </div>
  );
}

function GeneralTab() {
  const config = useConfig();
  if (!config) return null;

  async function update(key: string, value: string | number) {
    await db.configuracion.update(1, { [key]: value });
  }

  return (
    <div className="space-y-3">
      <Input label="Mes Activo" type="month" value={config.mesActivo.substring(0, 7)}
        onChange={(v) => update('mesActivo', v + '-01')} />
      <Input label="Año Fiscal Inicio" type="number" value={String(config.anioFiscalInicio)}
        onChange={(v) => update('anioFiscalInicio', parseInt(v))} />
      <Input label="Año Fiscal Fin" type="number" value={String(config.anioFiscalFin)}
        onChange={(v) => update('anioFiscalFin', parseInt(v))} />
      <Input label="Saldo Banco Inicial" type="number" value={String(config.saldoBancoInicial)}
        onChange={(v) => update('saldoBancoInicial', parseFloat(v))} />
      <Input label="Días Alerta Recurrente" type="number" value={String(config.diasAlertaRecurrente)}
        onChange={(v) => update('diasAlertaRecurrente', parseInt(v))} />
    </div>
  );
}

function CategoriasTab() {
  const categorias = useCategorias();

  return (
    <div className="space-y-2">
      {['Ingreso', 'Gasto'].map((tipo) => (
        <div key={tipo}>
          <h4 className={`text-sm font-semibold mb-1 ${tipo === 'Ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
            {tipo === 'Ingreso' ? '📈 Ingresos' : '📉 Gastos'}
          </h4>
          {categorias
            .filter((c) => c.tipo === tipo)
            .map((c) => (
              <div key={c.id} className={`flex items-center justify-between py-1.5 text-xs border-b border-gray-800 ${c.nivel === 2 ? 'pl-4' : ''}`}>
                <div className="flex items-center gap-1">
                  {c.nivel === 2 && <span className="text-gray-500">↳</span>}
                  <span className={c.activa ? 'text-gray-200' : 'text-gray-500 line-through'}>{c.nombre}</span>
                  <span className="text-gray-600 text-[10px]">{c.id}</span>
                </div>
                <span className="text-gray-500">{c.grupo}</span>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}

function BancosTab() {
  const bancos = useBancos();
  const movimientos = useMovimientos();
  const config = useConfig();

  const [form, setForm] = useState({ institucion: '', tipoCuenta: 'Nómina', titular: '', saldoReal: '' });
  const [adding, setAdding] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    await db.bancos.add({
      institucion: form.institucion,
      tipoCuenta: form.tipoCuenta,
      moneda: 'MXN',
      titular: form.titular,
      saldoBaseInicial: parseFloat(form.saldoReal) || 0,
      saldoReal: parseFloat(form.saldoReal) || 0,
      tasaRendimiento: 0,
      estado: 'Activa',
    });
    setForm({ institucion: '', tipoCuenta: 'Nómina', titular: '', saldoReal: '' });
    setAdding(false);
  }

  const totalPatrimonio = bancos.reduce((s, b) => s + b.saldoReal, 0);

  return (
    <div className="space-y-3">
      <div className="bg-gray-800 rounded-xl p-3 text-center">
        <p className="text-xs text-gray-400">Patrimonio Líquido</p>
        <p className="text-lg font-bold text-blue-400">{formatMXN(totalPatrimonio)}</p>
      </div>

      {bancos.map((b) => (
        <div key={b.id} className="bg-gray-800 rounded-xl p-3">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-white">{b.institucion}</p>
              <p className="text-xs text-gray-400">{b.tipoCuenta} • {b.titular}</p>
            </div>
            <p className="text-sm font-bold text-blue-400">{formatMXN(b.saldoReal)}</p>
          </div>
        </div>
      ))}

      {adding ? (
        <form onSubmit={handleAdd} className="space-y-2 bg-gray-800 rounded-xl p-3">
          <Input label="Institución" value={form.institucion} onChange={(v) => setForm(f => ({...f, institucion: v}))} required />
          <Select label="Tipo" value={form.tipoCuenta} onChange={(v) => setForm(f => ({...f, tipoCuenta: v}))}
            options={TIPOS_CUENTA.map(t => ({value: t, label: t}))} />
          <Input label="Titular" value={form.titular} onChange={(v) => setForm(f => ({...f, titular: v}))} />
          <Input label="Saldo Actual" type="number" value={form.saldoReal} onChange={(v) => setForm(f => ({...f, saldoReal: v}))} />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 py-2 bg-emerald-600 text-white text-sm rounded-lg">Guardar</button>
            <button type="button" onClick={() => setAdding(false)} className="flex-1 py-2 bg-gray-600 text-white text-sm rounded-lg">Cancelar</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className="w-full py-2 bg-gray-700 text-gray-300 text-sm rounded-xl hover:bg-gray-600">
          + Agregar Cuenta
        </button>
      )}
    </div>
  );
}

function AhorrosTab() {
  const ahorros = useAhorros();

  return (
    <div className="space-y-3">
      {ahorros.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-6 text-center">
          <p className="text-3xl mb-2">🏦</p>
          <p className="text-sm text-gray-400">No hay planes de ahorro</p>
          <p className="text-xs text-gray-500">Crea uno desde la pestaña Registrar</p>
        </div>
      ) : (
        ahorros.map((plan) => {
          const progress = plan.metaTotal > 0 ? plan.saldoActual / plan.metaTotal : 0;
          const faltante = plan.metaTotal - plan.saldoActual;
          return (
            <div key={plan.id} className="bg-gray-800 rounded-xl p-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-white">{plan.nombre}</p>
                  <p className="text-xs text-gray-400">{plan.categoria} • {plan.estado}</p>
                </div>
                <span className="text-xs text-emerald-400">{(progress * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(progress * 100, 100)}%` }} />
              </div>
              <div className="flex justify-between text-xs mt-1 text-gray-400">
                <span>Actual: {formatMXN(plan.saldoActual)}</span>
                <span>Meta: {formatMXN(plan.metaTotal)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Faltante: {formatMXN(faltante)} • Mensual req: {formatMXN(plan.ahorroMensualReq)}
              </p>
              {plan.claveBusqueda && (
                <p className="text-xs text-gray-600 mt-1">Clave: &ldquo;{plan.claveBusqueda}&rdquo;</p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function RecurrentesTab() {
  const recurrentes = useRecurrentes();
  const config = useConfig();

  return (
    <div className="space-y-3">
      {recurrentes.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-6 text-center">
          <p className="text-3xl mb-2">🔄</p>
          <p className="text-sm text-gray-400">No hay cargos recurrentes</p>
        </div>
      ) : (
        recurrentes.map((r) => {
          const status = getRecurringStatus(
            new Date(r.proximoCargo),
            new Date(),
            config?.diasAlertaRecurrente || 3
          );
          return (
            <div key={r.id} className="bg-gray-800 rounded-xl p-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-white">{r.nombre}</p>
                  <p className="text-xs text-gray-400">{r.categoria} • {r.frecuencia}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs ${status.color}`}>{status.label}</span>
                  <p className="text-xs text-gray-400">{formatMXN(r.monto)}</p>
                </div>
              </div>
              <div className="flex justify-between text-xs mt-1 text-gray-500">
                <span>Próximo: {format(new Date(r.proximoCargo), 'dd/MM/yyyy')}</span>
                <button
                  onClick={() => db.recurrentes.update(r.id!, { activo: !r.activo })}
                  className={`px-2 py-0.5 rounded text-xs ${r.activo ? 'bg-emerald-900/50 text-emerald-300' : 'bg-gray-600 text-gray-400'}`}
                >
                  {r.activo ? 'Activo' : 'Pausado'}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function FiscalTab() {
  const fiscal = useFiscalConfig();
  if (!fiscal) return null;

  async function update(key: string, value: string | number) {
    await db.fiscalConfig.update(1, { [key]: value });
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-white">Papá</h4>
      <Input label="Régimen Principal" value={fiscal.papaRegimenPrincipal}
        onChange={(v) => update('papaRegimenPrincipal', v)} />
      <Input label="Ingreso Nómina" type="number" value={String(fiscal.papaIngresoNomina)}
        onChange={(v) => update('papaIngresoNomina', parseFloat(v))} />
      <Input label="ISR Retenido" type="number" value={String(fiscal.papaIsrRetenido)}
        onChange={(v) => update('papaIsrRetenido', parseFloat(v))} />

      <h4 className="text-sm font-semibold text-white mt-4">Mamá</h4>
      <Input label="Régimen Principal" value={fiscal.mamaRegimenPrincipal}
        onChange={(v) => update('mamaRegimenPrincipal', v)} />
      <Input label="Ingreso Nómina" type="number" value={String(fiscal.mamaIngresoNomina)}
        onChange={(v) => update('mamaIngresoNomina', parseFloat(v))} />
      <Input label="ISR Retenido" type="number" value={String(fiscal.mamaIsrRetenido)}
        onChange={(v) => update('mamaIsrRetenido', parseFloat(v))} />

      <h4 className="text-sm font-semibold text-white mt-4">UMA</h4>
      <Input label="UMA Diaria" type="number" value={String(fiscal.umaDiaria)}
        onChange={(v) => update('umaDiaria', parseFloat(v))} />
    </div>
  );
}

function DatosTab() {
  const [importing, setImporting] = useState(false);

  async function exportData() {
    const data = {
      configuracion: await db.configuracion.toArray(),
      categorias: await db.categorias.toArray(),
      movimientos: await db.movimientos.toArray(),
      presupuesto: await db.presupuesto.toArray(),
      deudas: await db.deudas.toArray(),
      pagosDeudas: await db.pagosDeudas.toArray(),
      tarjetas: await db.tarjetas.toArray(),
      msi: await db.msi.toArray(),
      ahorros: await db.ahorros.toArray(),
      bancos: await db.bancos.toArray(),
      recurrentes: await db.recurrentes.toArray(),
      fiscalConfig: await db.fiscalConfig.toArray(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presupuesto-familiar-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportCSV() {
    const movimientos = await db.movimientos.toArray();
    const headers = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Método Pago', 'Responsable'];
    const rows = movimientos.map((m) =>
      [m.fecha, m.tipo, m.categoria, m.descripcion || '', m.monto, m.metodoPago || '', m.responsable || ''].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movimientos-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importData(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      await db.transaction('rw', db.tables, async () => {
        for (const table of db.tables) {
          await table.clear();
          const tableData = data[table.name];
          if (tableData && Array.isArray(tableData)) {
            await table.bulkAdd(tableData);
          }
        }
      });
      alert('Datos importados correctamente');
    } catch (err) {
      alert('Error al importar: ' + (err as Error).message);
    }
    setImporting(false);
  }

  return (
    <div className="space-y-3">
      <button onClick={exportData} className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium">
        📦 Exportar Backup (JSON)
      </button>
      <button onClick={exportCSV} className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium">
        📄 Exportar Movimientos (CSV)
      </button>
      <label className="block w-full py-3 bg-yellow-600 text-white rounded-xl text-sm font-medium text-center cursor-pointer">
        {importing ? 'Importando...' : '📥 Importar Backup (JSON)'}
        <input type="file" accept=".json" onChange={importData} className="hidden" />
      </label>
    </div>
  );
}
