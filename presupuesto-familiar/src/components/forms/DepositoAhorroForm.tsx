'use client';

import { useState } from 'react';
import { db } from '@/db/schema';
import { useAhorros } from '@/lib/hooks';
import { Input, Select } from './MovimientoForm';
import { METODOS_PAGO } from '@/lib/constants';
import { format } from 'date-fns';

export default function DepositoAhorroForm() {
  const ahorros = useAhorros();
  const [form, setForm] = useState({
    plan: '',
    monto: '',
    fecha: format(new Date(), 'yyyy-MM-dd'),
    metodoPago: 'Transferencia',
  });
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const plan = ahorros.find((a) => a.nombre === form.plan);
    if (!plan || !form.monto) return;

    const monto = parseFloat(form.monto);
    await db.movimientos.add({
      fecha: form.fecha,
      tipo: 'Gasto',
      categoria: 'Ahorros',
      descripcion: `Depósito: ${plan.nombre} ${plan.claveBusqueda || ''}`.trim(),
      monto,
      metodoPago: form.metodoPago,
      recurrente: false,
      msi: false,
      esPagoDeuda: false,
      deducible: false,
      tieneCfdi: false,
      createdAt: new Date().toISOString(),
    });

    await db.ahorros.update(plan.id!, {
      saldoActual: plan.saldoActual + monto,
    });

    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
    setForm((f) => ({ ...f, monto: '' }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {success && (
        <div className="bg-emerald-900/50 text-emerald-300 p-2 rounded-lg text-sm text-center">
          ✅ Depósito registrado
        </div>
      )}
      <Select
        label="Plan de Ahorro"
        value={form.plan}
        onChange={(v) => setForm((f) => ({ ...f, plan: v }))}
        options={ahorros.filter((a) => a.estado === 'Activo').map((a) => ({ value: a.nombre, label: a.nombre }))}
      />
      <Input label="Monto" type="number" value={form.monto} onChange={(v) => setForm((f) => ({ ...f, monto: v }))} required />
      <Input label="Fecha" type="date" value={form.fecha} onChange={(v) => setForm((f) => ({ ...f, fecha: v }))} />
      <Select
        label="Método de Pago"
        value={form.metodoPago}
        onChange={(v) => setForm((f) => ({ ...f, metodoPago: v }))}
        options={METODOS_PAGO.map((m) => ({ value: m, label: m }))}
      />
      <button
        type="submit"
        disabled={!form.plan || !form.monto}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white rounded-xl font-medium"
      >
        Depositar
      </button>
    </form>
  );
}
