'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/budget/store';
import { db } from '@/lib/db/schema';
import { useCategorias, useDeudas, useTarjetas, useAhorros } from '@/lib/budget/hooks';
import { METODOS_PAGO, RESPONSABLES, FRECUENCIAS, PLAZOS_MSI, TIPOS_IVA, CATEGORIAS_AHORRO, TIPOS_DEUDA, formatMXN } from '@/lib/budget/constants';
import { format, addMonths } from 'date-fns';

const FORMS = [
  { id: 'movimiento', label: 'Movimiento' },
  { id: 'deposito', label: 'Ahorro' },
  { id: 'deuda', label: 'Deuda' },
  { id: 'recurrente', label: 'Recurrente' },
  { id: 'plan', label: 'Plan Ahorro' },
];

export default function RegistrarScreen() {
  const { registrarForm, setRegistrarForm } = useAppStore();

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-lg font-bold text-white">Registrar</h2>

      <div className="flex gap-1 bg-gray-800 rounded-xl p-1 overflow-x-auto">
        {FORMS.map((f) => (
          <button
            key={f.id}
            onClick={() => setRegistrarForm(f.id)}
            className={`flex-1 px-2 py-2 text-xs rounded-lg whitespace-nowrap transition-colors ${
              registrarForm === f.id
                ? 'bg-emerald-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {registrarForm === 'movimiento' && <MovimientoForm />}
      {registrarForm === 'deposito' && <DepositoAhorroForm />}
      {registrarForm === 'deuda' && <NuevaDeudaForm />}
      {registrarForm === 'recurrente' && <NuevoRecurrenteForm />}
      {registrarForm === 'plan' && <NuevoPlanAhorroForm />}
    </div>
  );
}

function MovimientoForm() {
  const categorias = useCategorias();
  const deudas = useDeudas();
  const tarjetas = useTarjetas();
  const ahorros = useAhorros();

  const [form, setForm] = useState({
    fecha: format(new Date(), 'yyyy-MM-dd'),
    tipo: 'Gasto' as 'Ingreso' | 'Gasto',
    categoria: '',
    descripcion: '',
    monto: '',
    metodoPago: 'Tarjeta de Débito',
    responsable: 'Papá',
    recurrente: false,
    frecuencia: 'Mensual',
    msi: false,
    plazoMsi: '12 meses',
    tarjetaUtilizada: '',
    esPagoDeuda: false,
    deudaAsociada: '',
    montoCapital: '',
    montoIntereses: '',
    deducible: false,
    tipoIva: 'No aplica',
    tieneCfdi: false,
    notas: '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const filteredCats = categorias.filter((c) => c.tipo === form.tipo && c.activa);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.categoria || !form.monto) return;

    setSaving(true);
    try {
      const monto = parseFloat(form.monto);
      const movId = await db.movimientos.add({
        fecha: form.fecha,
        tipo: form.tipo,
        categoria: form.categoria,
        descripcion: form.descripcion,
        monto,
        metodoPago: form.metodoPago,
        responsable: form.responsable,
        recurrente: form.recurrente,
        frecuencia: form.recurrente ? form.frecuencia : undefined,
        msi: form.msi,
        plazoMsi: form.msi ? form.plazoMsi : undefined,
        tarjetaUtilizada: form.msi ? form.tarjetaUtilizada : undefined,
        notas: form.notas || undefined,
        esPagoDeuda: form.esPagoDeuda,
        deudaAsociada: form.esPagoDeuda ? form.deudaAsociada : undefined,
        montoCapital: form.esPagoDeuda ? parseFloat(form.montoCapital) || 0 : undefined,
        montoIntereses: form.esPagoDeuda ? parseFloat(form.montoIntereses) || 0 : undefined,
        deducible: form.deducible,
        tipoIva: form.deducible ? form.tipoIva : undefined,
        tieneCfdi: form.deducible ? form.tieneCfdi : false,
        createdAt: new Date().toISOString(),
      });

      if (form.esPagoDeuda && form.deudaAsociada) {
        const deuda = deudas.find((d) => d.nombre === form.deudaAsociada);
        if (deuda) {
          const capital = parseFloat(form.montoCapital) || 0;
          const intereses = parseFloat(form.montoIntereses) || 0;
          const newSaldo = deuda.saldoActual - capital;
          await db.pagosDeudas.add({
            movimientoId: movId as number,
            fecha: form.fecha,
            deuda: form.deudaAsociada,
            montoPagado: monto,
            aCapital: capital,
            aIntereses: intereses,
            saldoDespues: newSaldo,
          });
          await db.deudas.update(deuda.id!, { saldoActual: newSaldo, fechaUltimoPago: form.fecha });
        }
      }

      if (form.categoria === 'Ahorros' && form.descripcion) {
        for (const plan of ahorros) {
          if (plan.claveBusqueda && form.descripcion.toLowerCase().includes(plan.claveBusqueda.toLowerCase())) {
            await db.ahorros.update(plan.id!, {
              saldoActual: plan.saldoActual + monto,
            });
          }
        }
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      setForm((f) => ({
        ...f,
        descripcion: '',
        monto: '',
        notas: '',
        esPagoDeuda: false,
        deudaAsociada: '',
        montoCapital: '',
        montoIntereses: '',
        msi: false,
        deducible: false,
      }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {success && (
        <div className="bg-emerald-900/50 text-emerald-300 p-2 rounded-lg text-sm text-center">
          Movimiento registrado
        </div>
      )}

      <div className="flex gap-2">
        {(['Ingreso', 'Gasto'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setForm((f) => ({ ...f, tipo: t, categoria: '' }))}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              form.tipo === t
                ? t === 'Ingreso'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-red-600 text-white'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <Input label="Fecha" type="date" value={form.fecha} onChange={(v) => setForm((f) => ({ ...f, fecha: v }))} />
      <Select label="Categoría" value={form.categoria} onChange={(v) => setForm((f) => ({ ...f, categoria: v }))}
        options={filteredCats.map((c) => ({ value: c.nombre, label: c.nivel === 2 ? `  ↳ ${c.nombre}` : c.nombre }))} />
      <Input label="Descripción" value={form.descripcion} onChange={(v) => setForm((f) => ({ ...f, descripcion: v }))} />
      <Input label="Monto" type="number" value={form.monto} onChange={(v) => setForm((f) => ({ ...f, monto: v }))} required />
      <Select label="Método de Pago" value={form.metodoPago} onChange={(v) => setForm((f) => ({ ...f, metodoPago: v }))}
        options={METODOS_PAGO.map((m) => ({ value: m, label: m }))} />
      <Select label="Responsable" value={form.responsable} onChange={(v) => setForm((f) => ({ ...f, responsable: v }))}
        options={RESPONSABLES.map((r) => ({ value: r, label: r }))} />

      <Toggle label="Recurrente" checked={form.recurrente} onChange={(v) => setForm((f) => ({ ...f, recurrente: v }))} />
      {form.recurrente && (
        <Select label="Frecuencia" value={form.frecuencia} onChange={(v) => setForm((f) => ({ ...f, frecuencia: v }))}
          options={FRECUENCIAS.map((f) => ({ value: f, label: f }))} />
      )}

      <Toggle label="MSI (Meses sin intereses)" checked={form.msi} onChange={(v) => setForm((f) => ({ ...f, msi: v }))} />
      {form.msi && (
        <>
          <Select label="Plazo MSI" value={form.plazoMsi} onChange={(v) => setForm((f) => ({ ...f, plazoMsi: v }))}
            options={PLAZOS_MSI.map((p) => ({ value: p, label: p }))} />
          <Select label="Tarjeta" value={form.tarjetaUtilizada} onChange={(v) => setForm((f) => ({ ...f, tarjetaUtilizada: v }))}
            options={tarjetas.map((t) => ({ value: t.nombre, label: t.nombre }))} />
        </>
      )}

      <Toggle label="Pago de Deuda" checked={form.esPagoDeuda} onChange={(v) => setForm((f) => ({ ...f, esPagoDeuda: v }))} />
      {form.esPagoDeuda && (
        <>
          <Select label="Deuda Asociada" value={form.deudaAsociada} onChange={(v) => setForm((f) => ({ ...f, deudaAsociada: v }))}
            options={deudas.map((d) => ({ value: d.nombre, label: d.nombre }))} />
          <Input label="A Capital" type="number" value={form.montoCapital} onChange={(v) => setForm((f) => ({ ...f, montoCapital: v }))} />
          <Input label="A Intereses" type="number" value={form.montoIntereses} onChange={(v) => setForm((f) => ({ ...f, montoIntereses: v }))} />
        </>
      )}

      <Toggle label="Deducible" checked={form.deducible} onChange={(v) => setForm((f) => ({ ...f, deducible: v }))} />
      {form.deducible && (
        <>
          <Select label="Tipo IVA" value={form.tipoIva} onChange={(v) => setForm((f) => ({ ...f, tipoIva: v }))}
            options={TIPOS_IVA.map((t) => ({ value: t, label: t }))} />
          <Toggle label="Tiene CFDI" checked={form.tieneCfdi} onChange={(v) => setForm((f) => ({ ...f, tieneCfdi: v }))} />
        </>
      )}

      <Input label="Notas" value={form.notas} onChange={(v) => setForm((f) => ({ ...f, notas: v }))} />

      <button type="submit" disabled={saving || !form.monto || !form.categoria}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white rounded-xl font-medium transition-colors">
        {saving ? 'Guardando...' : 'Registrar'}
      </button>
    </form>
  );
}

function DepositoAhorroForm() {
  const ahorros = useAhorros();
  const [form, setForm] = useState({ plan: '', monto: '', fecha: format(new Date(), 'yyyy-MM-dd'), notas: '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.plan || !form.monto) return;
    setSaving(true);
    try {
      const monto = parseFloat(form.monto);
      const plan = ahorros.find((a) => a.nombre === form.plan);
      if (plan) {
        await db.ahorros.update(plan.id!, { saldoActual: plan.saldoActual + monto });
        await db.movimientos.add({
          fecha: form.fecha,
          tipo: 'Gasto',
          categoria: 'Ahorros',
          descripcion: `Depósito a ${plan.nombre}`,
          monto,
          metodoPago: 'Transferencia',
          responsable: 'Ambos',
          recurrente: false,
          msi: false,
          esPagoDeuda: false,
          deducible: false,
          tieneCfdi: false,
          notas: form.notas,
          createdAt: new Date().toISOString(),
        });
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      setForm({ plan: '', monto: '', fecha: format(new Date(), 'yyyy-MM-dd'), notas: '' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {success && <div className="bg-emerald-900/50 text-emerald-300 p-2 rounded-lg text-sm text-center">Depósito registrado</div>}
      <Select label="Plan de Ahorro" value={form.plan} onChange={(v) => setForm((f) => ({ ...f, plan: v }))}
        options={ahorros.filter((a) => a.estado === 'Activo').map((a) => ({ value: a.nombre, label: `${a.nombre} (${formatMXN(a.saldoActual)})` }))} />
      <Input label="Monto" type="number" value={form.monto} onChange={(v) => setForm((f) => ({ ...f, monto: v }))} required />
      <Input label="Fecha" type="date" value={form.fecha} onChange={(v) => setForm((f) => ({ ...f, fecha: v }))} />
      <Input label="Notas" value={form.notas} onChange={(v) => setForm((f) => ({ ...f, notas: v }))} />
      <button type="submit" disabled={saving || !form.plan || !form.monto}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white rounded-xl font-medium">
        {saving ? 'Guardando...' : 'Depositar'}
      </button>
    </form>
  );
}

function NuevaDeudaForm() {
  const [form, setForm] = useState({
    nombre: '', tipo: 'Préstamo Personal', montoOriginal: '', tasaInteres: '', plazoMeses: '', pagoMinimo: '', pagoReal: '', notas: '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre || !form.montoOriginal) return;
    setSaving(true);
    try {
      await db.deudas.add({
        nombre: form.nombre,
        tipo: form.tipo,
        montoOriginal: parseFloat(form.montoOriginal),
        saldoActual: parseFloat(form.montoOriginal),
        tasaInteres: parseFloat(form.tasaInteres) / 100 || 0,
        fechaInicio: format(new Date(), 'yyyy-MM-dd'),
        plazoMeses: parseInt(form.plazoMeses) || 0,
        pagoMinimo: parseFloat(form.pagoMinimo) || 0,
        pagoReal: parseFloat(form.pagoReal) || parseFloat(form.pagoMinimo) || 0,
        estado: 'Pagando',
        notas: form.notas,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      setForm({ nombre: '', tipo: 'Préstamo Personal', montoOriginal: '', tasaInteres: '', plazoMeses: '', pagoMinimo: '', pagoReal: '', notas: '' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {success && <div className="bg-emerald-900/50 text-emerald-300 p-2 rounded-lg text-sm text-center">Deuda registrada</div>}
      <Input label="Nombre" value={form.nombre} onChange={(v) => setForm((f) => ({ ...f, nombre: v }))} required />
      <Select label="Tipo" value={form.tipo} onChange={(v) => setForm((f) => ({ ...f, tipo: v }))} options={TIPOS_DEUDA.map((t) => ({ value: t, label: t }))} />
      <Input label="Monto Original" type="number" value={form.montoOriginal} onChange={(v) => setForm((f) => ({ ...f, montoOriginal: v }))} required />
      <Input label="Tasa Interés Anual (%)" type="number" value={form.tasaInteres} onChange={(v) => setForm((f) => ({ ...f, tasaInteres: v }))} />
      <Input label="Plazo (meses)" type="number" value={form.plazoMeses} onChange={(v) => setForm((f) => ({ ...f, plazoMeses: v }))} />
      <Input label="Pago Mínimo" type="number" value={form.pagoMinimo} onChange={(v) => setForm((f) => ({ ...f, pagoMinimo: v }))} />
      <Input label="Pago Real" type="number" value={form.pagoReal} onChange={(v) => setForm((f) => ({ ...f, pagoReal: v }))} />
      <Input label="Notas" value={form.notas} onChange={(v) => setForm((f) => ({ ...f, notas: v }))} />
      <button type="submit" disabled={saving || !form.nombre || !form.montoOriginal}
        className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-xl font-medium">
        {saving ? 'Guardando...' : 'Agregar Deuda'}
      </button>
    </form>
  );
}

function NuevoRecurrenteForm() {
  const categorias = useCategorias();
  const [form, setForm] = useState({
    nombre: '', categoria: '', monto: '', frecuencia: 'Mensual', diaDelMes: '1', metodoPago: 'Tarjeta de Débito', responsable: 'Ambos', notas: '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const gastos = categorias.filter((c) => c.tipo === 'Gasto' && c.activa);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre || !form.monto) return;
    setSaving(true);
    try {
      const today = new Date();
      let proximoCargo = new Date(today.getFullYear(), today.getMonth(), parseInt(form.diaDelMes) || 1);
      if (proximoCargo < today) proximoCargo = addMonths(proximoCargo, 1);

      await db.recurrentes.add({
        nombre: form.nombre,
        categoria: form.categoria,
        monto: parseFloat(form.monto),
        frecuencia: form.frecuencia,
        diaDelMes: parseInt(form.diaDelMes) || 1,
        metodoPago: form.metodoPago,
        responsable: form.responsable,
        fechaInicio: format(new Date(), 'yyyy-MM-dd'),
        activo: true,
        proximoCargo: format(proximoCargo, 'yyyy-MM-dd'),
        autoRegistrar: false,
        notas: form.notas,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      setForm({ nombre: '', categoria: '', monto: '', frecuencia: 'Mensual', diaDelMes: '1', metodoPago: 'Tarjeta de Débito', responsable: 'Ambos', notas: '' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {success && <div className="bg-emerald-900/50 text-emerald-300 p-2 rounded-lg text-sm text-center">Recurrente registrado</div>}
      <Input label="Nombre" value={form.nombre} onChange={(v) => setForm((f) => ({ ...f, nombre: v }))} required />
      <Select label="Categoría" value={form.categoria} onChange={(v) => setForm((f) => ({ ...f, categoria: v }))}
        options={gastos.map((c) => ({ value: c.nombre, label: c.nombre }))} />
      <Input label="Monto" type="number" value={form.monto} onChange={(v) => setForm((f) => ({ ...f, monto: v }))} required />
      <Select label="Frecuencia" value={form.frecuencia} onChange={(v) => setForm((f) => ({ ...f, frecuencia: v }))}
        options={FRECUENCIAS.map((f) => ({ value: f, label: f }))} />
      <Input label="Día del Mes" type="number" value={form.diaDelMes} onChange={(v) => setForm((f) => ({ ...f, diaDelMes: v }))} />
      <Select label="Método de Pago" value={form.metodoPago} onChange={(v) => setForm((f) => ({ ...f, metodoPago: v }))}
        options={METODOS_PAGO.map((m) => ({ value: m, label: m }))} />
      <Select label="Responsable" value={form.responsable} onChange={(v) => setForm((f) => ({ ...f, responsable: v }))}
        options={RESPONSABLES.map((r) => ({ value: r, label: r }))} />
      <Input label="Notas" value={form.notas} onChange={(v) => setForm((f) => ({ ...f, notas: v }))} />
      <button type="submit" disabled={saving || !form.nombre || !form.monto}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-xl font-medium">
        {saving ? 'Guardando...' : 'Agregar Recurrente'}
      </button>
    </form>
  );
}

function NuevoPlanAhorroForm() {
  const [form, setForm] = useState({ nombre: '', categoria: 'Emergencia', metaTotal: '', plazoMeses: '12', claveBusqueda: '', notas: '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre || !form.metaTotal) return;
    setSaving(true);
    try {
      const meta = parseFloat(form.metaTotal);
      const plazo = parseInt(form.plazoMeses) || 12;
      const ahorroMensual = meta / plazo;

      await db.ahorros.add({
        nombre: form.nombre,
        categoria: form.categoria,
        metaTotal: meta,
        plazoMeses: plazo,
        fechaInicio: format(new Date(), 'yyyy-MM-dd'),
        fechaMeta: format(addMonths(new Date(), plazo), 'yyyy-MM-dd'),
        ahorroMensualReq: ahorroMensual,
        saldoActual: 0,
        estado: 'Activo',
        claveBusqueda: form.claveBusqueda || form.nombre.toLowerCase(),
        notas: form.notas,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      setForm({ nombre: '', categoria: 'Emergencia', metaTotal: '', plazoMeses: '12', claveBusqueda: '', notas: '' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {success && <div className="bg-emerald-900/50 text-emerald-300 p-2 rounded-lg text-sm text-center">Plan de ahorro creado</div>}
      <Input label="Nombre" value={form.nombre} onChange={(v) => setForm((f) => ({ ...f, nombre: v }))} required />
      <Select label="Categoría" value={form.categoria} onChange={(v) => setForm((f) => ({ ...f, categoria: v }))}
        options={CATEGORIAS_AHORRO.map((c) => ({ value: c, label: c }))} />
      <Input label="Meta Total" type="number" value={form.metaTotal} onChange={(v) => setForm((f) => ({ ...f, metaTotal: v }))} required />
      <Input label="Plazo (meses)" type="number" value={form.plazoMeses} onChange={(v) => setForm((f) => ({ ...f, plazoMeses: v }))} />
      <Input label="Clave de Búsqueda" value={form.claveBusqueda} onChange={(v) => setForm((f) => ({ ...f, claveBusqueda: v }))} />
      <p className="text-xs text-gray-500">La clave ayuda a vincular depósitos automáticamente</p>
      <Input label="Notas" value={form.notas} onChange={(v) => setForm((f) => ({ ...f, notas: v }))} />
      <button type="submit" disabled={saving || !form.nombre || !form.metaTotal}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white rounded-xl font-medium">
        {saving ? 'Guardando...' : 'Crear Plan'}
      </button>
    </form>
  );
}

// ─── Reusable form components ───
function Input({ label, type = 'text', value, onChange, required }: { label: string; type?: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required}
        step={type === 'number' ? '0.01' : undefined}
        className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
        <option value="">Seleccionar...</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-300">{label}</span>
      <button type="button" onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors relative ${checked ? 'bg-emerald-600' : 'bg-gray-600'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

export { Input, Select, Toggle };
