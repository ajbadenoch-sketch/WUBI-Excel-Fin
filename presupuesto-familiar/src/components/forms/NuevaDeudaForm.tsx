'use client';

import { useState } from 'react';
import { db } from '@/db/schema';
import { TIPOS_DEUDA } from '@/lib/constants';
import { calculatePMT } from '@/lib/calculations';
import { Input, Select } from './MovimientoForm';
import { format } from 'date-fns';

export default function NuevaDeudaForm() {
  const [form, setForm] = useState({
    nombre: '',
    tipo: 'Préstamo Personal',
    montoOriginal: '',
    tasaInteres: '',
    fechaInicio: format(new Date(), 'yyyy-MM-dd'),
    plazoMeses: '',
    pagoReal: '',
    notas: '',
  });
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre || !form.montoOriginal) return;

    const monto = parseFloat(form.montoOriginal);
    const tasa = parseFloat(form.tasaInteres) / 100;
    const plazo = parseInt(form.plazoMeses) || 0;
    const pagoMinimo = plazo > 0 ? calculatePMT(tasa, plazo, monto) : 0;

    await db.deudas.add({
      nombre: form.nombre,
      tipo: form.tipo,
      montoOriginal: monto,
      saldoActual: monto,
      tasaInteres: tasa,
      fechaInicio: form.fechaInicio,
      plazoMeses: plazo,
      pagoMinimo,
      pagoReal: parseFloat(form.pagoReal) || pagoMinimo,
      estado: 'Pagando',
      notas: form.notas || undefined,
    });

    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
    setForm({ nombre: '', tipo: 'Préstamo Personal', montoOriginal: '', tasaInteres: '', fechaInicio: format(new Date(), 'yyyy-MM-dd'), plazoMeses: '', pagoReal: '', notas: '' });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {success && (
        <div className="bg-emerald-900/50 text-emerald-300 p-2 rounded-lg text-sm text-center">
          ✅ Deuda registrada
        </div>
      )}
      <Input label="Nombre" value={form.nombre} onChange={(v) => setForm((f) => ({ ...f, nombre: v }))} required />
      <Select
        label="Tipo"
        value={form.tipo}
        onChange={(v) => setForm((f) => ({ ...f, tipo: v }))}
        options={TIPOS_DEUDA.map((t) => ({ value: t, label: t }))}
      />
      <Input label="Monto Original" type="number" value={form.montoOriginal} onChange={(v) => setForm((f) => ({ ...f, montoOriginal: v }))} required />
      <Input label="Tasa de Interés Anual (%)" type="number" value={form.tasaInteres} onChange={(v) => setForm((f) => ({ ...f, tasaInteres: v }))} />
      <Input label="Fecha de Inicio" type="date" value={form.fechaInicio} onChange={(v) => setForm((f) => ({ ...f, fechaInicio: v }))} />
      <Input label="Plazo (meses)" type="number" value={form.plazoMeses} onChange={(v) => setForm((f) => ({ ...f, plazoMeses: v }))} />
      <Input label="Pago Real Mensual" type="number" value={form.pagoReal} onChange={(v) => setForm((f) => ({ ...f, pagoReal: v }))} />
      <Input label="Notas" value={form.notas} onChange={(v) => setForm((f) => ({ ...f, notas: v }))} />
      <button
        type="submit"
        disabled={!form.nombre || !form.montoOriginal}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white rounded-xl font-medium"
      >
        Registrar Deuda
      </button>
    </form>
  );
}
