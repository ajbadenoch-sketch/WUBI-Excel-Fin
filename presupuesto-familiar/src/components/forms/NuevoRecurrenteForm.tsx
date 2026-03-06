'use client';

import { useState } from 'react';
import { db } from '@/db/schema';
import { useCategorias } from '@/lib/hooks';
import { METODOS_PAGO, RESPONSABLES, FRECUENCIAS } from '@/lib/constants';
import { Input, Select } from './MovimientoForm';
import { format, addMonths } from 'date-fns';

export default function NuevoRecurrenteForm() {
  const categorias = useCategorias();
  const [form, setForm] = useState({
    nombre: '',
    categoria: '',
    monto: '',
    frecuencia: 'Mensual',
    diaDelMes: '1',
    metodoPago: 'Tarjeta de Débito',
    responsable: 'Papá',
    notas: '',
  });
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre || !form.monto) return;

    const today = new Date();
    const dia = parseInt(form.diaDelMes);
    let proximo = new Date(today.getFullYear(), today.getMonth(), dia);
    if (proximo <= today) proximo = addMonths(proximo, 1);

    await db.recurrentes.add({
      nombre: form.nombre,
      categoria: form.categoria,
      monto: parseFloat(form.monto),
      frecuencia: form.frecuencia,
      diaDelMes: dia,
      metodoPago: form.metodoPago,
      responsable: form.responsable,
      fechaInicio: format(today, 'yyyy-MM-dd'),
      activo: true,
      proximoCargo: format(proximo, 'yyyy-MM-dd'),
      autoRegistrar: true,
      notas: form.notas || undefined,
    });

    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
    setForm({ nombre: '', categoria: '', monto: '', frecuencia: 'Mensual', diaDelMes: '1', metodoPago: 'Tarjeta de Débito', responsable: 'Papá', notas: '' });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {success && (
        <div className="bg-emerald-900/50 text-emerald-300 p-2 rounded-lg text-sm text-center">
          ✅ Recurrente registrado
        </div>
      )}
      <Input label="Nombre" value={form.nombre} onChange={(v) => setForm((f) => ({ ...f, nombre: v }))} required />
      <Select
        label="Categoría"
        value={form.categoria}
        onChange={(v) => setForm((f) => ({ ...f, categoria: v }))}
        options={categorias.filter((c) => c.activa).map((c) => ({ value: c.nombre, label: c.nombre }))}
      />
      <Input label="Monto" type="number" value={form.monto} onChange={(v) => setForm((f) => ({ ...f, monto: v }))} required />
      <Select
        label="Frecuencia"
        value={form.frecuencia}
        onChange={(v) => setForm((f) => ({ ...f, frecuencia: v }))}
        options={FRECUENCIAS.map((f) => ({ value: f, label: f }))}
      />
      <Input label="Día del Mes" type="number" value={form.diaDelMes} onChange={(v) => setForm((f) => ({ ...f, diaDelMes: v }))} />
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
      <Input label="Notas" value={form.notas} onChange={(v) => setForm((f) => ({ ...f, notas: v }))} />
      <button
        type="submit"
        disabled={!form.nombre || !form.monto}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white rounded-xl font-medium"
      >
        Registrar Recurrente
      </button>
    </form>
  );
}
