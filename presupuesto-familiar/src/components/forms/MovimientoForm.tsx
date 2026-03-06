'use client';

import { useState } from 'react';
import { db } from '@/db/schema';
import { useCategorias, useDeudas, useTarjetas, useAhorros } from '@/lib/hooks';
import { METODOS_PAGO, RESPONSABLES, FRECUENCIAS, PLAZOS_MSI, TIPOS_IVA } from '@/lib/constants';
import { format } from 'date-fns';

export default function MovimientoForm() {
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

      // Auto-create pago_deuda record
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

      // Auto-update savings if applicable
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
          ✅ Movimiento registrado
        </div>
      )}

      {/* Tipo Toggle */}
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

      <Select
        label="Categoría"
        value={form.categoria}
        onChange={(v) => setForm((f) => ({ ...f, categoria: v }))}
        options={filteredCats.map((c) => ({
          value: c.nombre,
          label: c.nivel === 2 ? `  ↳ ${c.nombre}` : c.nombre,
        }))}
      />

      <Input label="Descripción" value={form.descripcion} onChange={(v) => setForm((f) => ({ ...f, descripcion: v }))} />
      <Input label="Monto" type="number" value={form.monto} onChange={(v) => setForm((f) => ({ ...f, monto: v }))} required />

      <Select
        label="Método de Pago"
        value={form.metodoPago}
        onChange={(v) => setForm((f) => ({ ...f, metodoPago: v }))}
        options={METODOS_PAGO.map((m) => ({ value: m, label: m }))}
      />

      <Select
        label="Responsable"
        value={form.responsable}
        onChange={(v) => setForm((f) => ({ ...f, responsable: v }))}
        options={RESPONSABLES.map((r) => ({ value: r, label: r }))}
      />

      {/* Toggles */}
      <Toggle label="Recurrente" checked={form.recurrente} onChange={(v) => setForm((f) => ({ ...f, recurrente: v }))} />
      {form.recurrente && (
        <Select
          label="Frecuencia"
          value={form.frecuencia}
          onChange={(v) => setForm((f) => ({ ...f, frecuencia: v }))}
          options={FRECUENCIAS.map((f) => ({ value: f, label: f }))}
        />
      )}

      <Toggle label="MSI (Meses sin intereses)" checked={form.msi} onChange={(v) => setForm((f) => ({ ...f, msi: v }))} />
      {form.msi && (
        <>
          <Select
            label="Plazo MSI"
            value={form.plazoMsi}
            onChange={(v) => setForm((f) => ({ ...f, plazoMsi: v }))}
            options={PLAZOS_MSI.map((p) => ({ value: p, label: p }))}
          />
          <Select
            label="Tarjeta"
            value={form.tarjetaUtilizada}
            onChange={(v) => setForm((f) => ({ ...f, tarjetaUtilizada: v }))}
            options={tarjetas.map((t) => ({ value: t.nombre, label: t.nombre }))}
          />
        </>
      )}

      <Toggle label="Pago de Deuda" checked={form.esPagoDeuda} onChange={(v) => setForm((f) => ({ ...f, esPagoDeuda: v }))} />
      {form.esPagoDeuda && (
        <>
          <Select
            label="Deuda Asociada"
            value={form.deudaAsociada}
            onChange={(v) => setForm((f) => ({ ...f, deudaAsociada: v }))}
            options={deudas.map((d) => ({ value: d.nombre, label: d.nombre }))}
          />
          <Input label="A Capital" type="number" value={form.montoCapital} onChange={(v) => setForm((f) => ({ ...f, montoCapital: v }))} />
          <Input label="A Intereses" type="number" value={form.montoIntereses} onChange={(v) => setForm((f) => ({ ...f, montoIntereses: v }))} />
        </>
      )}

      <Toggle label="Deducible" checked={form.deducible} onChange={(v) => setForm((f) => ({ ...f, deducible: v }))} />
      {form.deducible && (
        <>
          <Select
            label="Tipo IVA"
            value={form.tipoIva}
            onChange={(v) => setForm((f) => ({ ...f, tipoIva: v }))}
            options={TIPOS_IVA.map((t) => ({ value: t, label: t }))}
          />
          <Toggle label="Tiene CFDI" checked={form.tieneCfdi} onChange={(v) => setForm((f) => ({ ...f, tieneCfdi: v }))} />
        </>
      )}

      <Input label="Notas" value={form.notas} onChange={(v) => setForm((f) => ({ ...f, notas: v }))} />

      <button
        type="submit"
        disabled={saving || !form.monto || !form.categoria}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white rounded-xl font-medium transition-colors"
      >
        {saving ? 'Guardando...' : 'Registrar'}
      </button>
    </form>
  );
}

// ─── Reusable form components ───

function Input({
  label,
  type = 'text',
  value,
  onChange,
  required,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        step={type === 'number' ? '0.01' : undefined}
        className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <option value="">Seleccionar...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-300">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors relative ${
          checked ? 'bg-emerald-600' : 'bg-gray-600'
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

export { Input, Select, Toggle };
