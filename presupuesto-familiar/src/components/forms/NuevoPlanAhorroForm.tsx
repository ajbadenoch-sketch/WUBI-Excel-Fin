'use client';

import { useState } from 'react';
import { db } from '@/db/schema';
import { CATEGORIAS_AHORRO } from '@/lib/constants';
import { Input, Select } from './MovimientoForm';
import { format, addMonths } from 'date-fns';

export default function NuevoPlanAhorroForm() {
  const [form, setForm] = useState({
    nombre: '',
    categoria: 'Emergencia',
    metaTotal: '',
    plazoMeses: '',
    fechaInicio: format(new Date(), 'yyyy-MM-dd'),
    banco: '',
    claveBusqueda: '',
    notas: '',
  });
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre || !form.metaTotal) return;

    const meta = parseFloat(form.metaTotal);
    const plazo = parseInt(form.plazoMeses) || 12;

    await db.ahorros.add({
      nombre: form.nombre,
      categoria: form.categoria,
      metaTotal: meta,
      plazoMeses: plazo,
      fechaInicio: form.fechaInicio,
      fechaMeta: format(addMonths(new Date(form.fechaInicio), plazo), 'yyyy-MM-dd'),
      ahorroMensualReq: meta / plazo,
      saldoActual: 0,
      banco: form.banco || undefined,
      estado: 'Activo',
      notas: form.notas || undefined,
      claveBusqueda: form.claveBusqueda,
    });

    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
    setForm({ nombre: '', categoria: 'Emergencia', metaTotal: '', plazoMeses: '', fechaInicio: format(new Date(), 'yyyy-MM-dd'), banco: '', claveBusqueda: '', notas: '' });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {success && (
        <div className="bg-emerald-900/50 text-emerald-300 p-2 rounded-lg text-sm text-center">
          ✅ Plan de ahorro creado
        </div>
      )}
      <Input label="Nombre" value={form.nombre} onChange={(v) => setForm((f) => ({ ...f, nombre: v }))} required />
      <Select
        label="Categoría"
        value={form.categoria}
        onChange={(v) => setForm((f) => ({ ...f, categoria: v }))}
        options={CATEGORIAS_AHORRO.map((c) => ({ value: c, label: c }))}
      />
      <Input label="Meta Total" type="number" value={form.metaTotal} onChange={(v) => setForm((f) => ({ ...f, metaTotal: v }))} required />
      <Input label="Plazo (meses)" type="number" value={form.plazoMeses} onChange={(v) => setForm((f) => ({ ...f, plazoMeses: v }))} />
      <Input label="Fecha de Inicio" type="date" value={form.fechaInicio} onChange={(v) => setForm((f) => ({ ...f, fechaInicio: v }))} />
      <Input label="Banco" value={form.banco} onChange={(v) => setForm((f) => ({ ...f, banco: v }))} />
      <Input label="Clave de Búsqueda (para detectar depósitos)" value={form.claveBusqueda} onChange={(v) => setForm((f) => ({ ...f, claveBusqueda: v }))} />
      <Input label="Notas" value={form.notas} onChange={(v) => setForm((f) => ({ ...f, notas: v }))} />
      <button
        type="submit"
        disabled={!form.nombre || !form.metaTotal}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white rounded-xl font-medium"
      >
        Crear Plan
      </button>
    </form>
  );
}
