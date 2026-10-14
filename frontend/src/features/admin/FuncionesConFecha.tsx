import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import api from '../../lib/api';
import { fechaLarga, fechaCorta } from '../../lib/fechas';
import { hoyEnBogota } from '../../lib/periodoDePago';
import type { FuncionDelPlan } from './planDeEmpresa';
import {
  estadoDeFuncion, estadoEnElHistorial, ultimoDiaDe, diaMasDias, type Concesion, type EstadoEnElHistorial,
} from './concesionesDeEmpresa';

// FUNCIONES CON FECHA (14 de octubre de 2026, PENDIENTES nº 39, fase 2). En la ficha de la empresa del super
// admin: una fila por función, con lo que la empresa tiene hoy, y para dar una por un tiempo («pruébalo 2
// meses»), cambiarle la fecha o quitarla. Vence sola: el servidor la deja de contar al pasar su último día.
// Las reglas de fechas las valida el servidor (backend/src/utils/concesiones.ts) y su error se muestra tal cual.

const DIAS_PROPUESTOS = 30;
const CAMPO_FECHA = 'border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary';
const BOTON = 'px-3 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-60';

const ORIGEN: Record<string, string> = { PRUEBA: 'Prueba gratis', SUPER_ADMIN: 'Super admin' };
const ETIQUETA_HISTORIAL: Record<EstadoEnElHistorial, string> = { VIGENTE: 'Vigente', VENCIDA: 'Vencida', QUITADA: 'Quitada' };
const COLOR_HISTORIAL: Record<EstadoEnElHistorial, string> = {
  VIGENTE: 'bg-emerald-100 text-emerald-800', VENCIDA: 'bg-gray-100 text-gray-600', QUITADA: 'bg-red-50 text-red-700',
};

type Props = {
  empresaId: string;
  funciones: FuncionDelPlan[];
  delPlan: Record<string, boolean>;
  extras: Record<string, boolean>;
  concesiones: Concesion[];
  onCambio: () => void;
  // Para las pruebas. Por defecto, ahora.
  ahora?: Date;
};

export default function FuncionesConFecha({ empresaId, funciones, delPlan, extras, concesiones, onCambio, ahora = new Date() }: Props) {
  const hoy = hoyEnBogota(ahora);
  const [dias, setDias] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState('');
  const disponibles = funciones.filter(f => !f.proximamente);
  const nombreDe = (clave: string) => funciones.find(f => f.key === clave)?.label ?? clave;

  const hacer = async (clave: string, accion: () => Promise<unknown>) => {
    setError(''); setOcupado(clave);
    try {
      await accion();
      onCambio();
    } catch (e) {
      setError((e as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'No pudimos guardar el cambio.');
    } finally { setOcupado(''); }
  };

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2 flex items-center gap-1.5">
        <CalendarClock size={13} /> Funciones por un tiempo
      </p>
      <p className="text-sm text-muted mb-3">
        Dale a esta empresa una función hasta una fecha, por encima de su plan. El último día está incluido, y al
        pasar se le apaga sola.
      </p>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="py-2 pr-3 font-medium">Función</th>
              <th className="py-2 pr-3 font-medium">Hoy</th>
              <th className="py-2 font-medium">Por un tiempo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {disponibles.map(f => {
              const estado = estadoDeFuncion(f.key, { delPlan: !!delPlan[f.key], extra: !!extras[f.key] }, concesiones, ahora);
              const propuesto = estado.tipo === 'CONCEDIDA' ? ultimoDiaDe(estado.concesion.hasta) : diaMasDias(hoy, DIAS_PROPUESTOS);
              const dia = dias[f.key] ?? propuesto;
              const campo = (
                <input type="date" value={dia} min={hoy} aria-label={`Último día de ${f.label}`}
                  onChange={e => setDias(d => ({ ...d, [f.key]: e.target.value }))} className={CAMPO_FECHA} />
              );
              return (
                <tr key={f.key}>
                  <td className="py-2.5 pr-3 text-ink">{f.label}</td>
                  <td className="py-2.5 pr-3">
                    {estado.tipo === 'PLAN' && <span className="text-muted">Incluida en su plan</span>}
                    {estado.tipo === 'EXTRA' && <span className="text-emerald-700">Extra a la medida, sin fecha</span>}
                    {estado.tipo === 'NO' && <span className="text-muted">No la tiene</span>}
                    {estado.tipo === 'CONCEDIDA' && (
                      <span className="text-ink">
                        Hasta el {fechaLarga(new Date(new Date(estado.concesion.hasta).getTime() - 1))}
                        <span className="text-muted">
                          {' · '}{estado.concesion.origen === 'PRUEBA' ? 'prueba gratis' : `la dio ${estado.concesion.otorgadaPorNombre ?? 'el super admin'}`}
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="py-2.5">
                    {estado.tipo === 'NO' && (
                      <div className="flex flex-wrap items-center gap-2">
                        {campo}
                        <button type="button" disabled={ocupado === f.key} className={`${BOTON} bg-primary text-ink hover:brightness-95`}
                          onClick={() => hacer(f.key, () => api.post(`/admin/empresas/${empresaId}/concesiones`, { funcion: f.key, hasta: dia }))}>
                          Dar hasta ese día
                        </button>
                      </div>
                    )}
                    {estado.tipo === 'CONCEDIDA' && (
                      <div className="flex flex-wrap items-center gap-2">
                        {campo}
                        <button type="button" disabled={ocupado === f.key} className={`${BOTON} bg-gray-100 text-ink hover:bg-gray-200`}
                          onClick={() => hacer(f.key, () => api.put(`/admin/empresas/${empresaId}/concesiones/${estado.concesion.id}`, { hasta: dia }))}>
                          Cambiar fecha
                        </button>
                        <button type="button" disabled={ocupado === f.key} className={`${BOTON} text-red-700 hover:bg-red-50`}
                          onClick={() => hacer(f.key, () => api.delete(`/admin/empresas/${empresaId}/concesiones/${estado.concesion.id}`))}>
                          Quitar
                        </button>
                      </div>
                    )}
                    {(estado.tipo === 'PLAN' || estado.tipo === 'EXTRA') && <span className="text-muted">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {concesiones.length > 0 && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mt-5 mb-2">Historial</p>
          <ul aria-label="Historial de funciones con fecha" className="space-y-1.5 text-sm">
            {concesiones.map(c => {
              const e = estadoEnElHistorial(c, ahora);
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${COLOR_HISTORIAL[e]}`}>{ETIQUETA_HISTORIAL[e]}</span>
                  <span className="text-ink">{nombreDe(c.funcion)}</span>
                  <span className="text-muted">
                    hasta el {fechaCorta(new Date(new Date(c.hasta).getTime() - 1))} · {ORIGEN[c.origen] ?? c.origen}
                    {c.otorgadaPorNombre ? ` (${c.otorgadaPorNombre})` : ''} · dada el {fechaCorta(c.creadoEn)}
                    {c.revocadaEn ? ` · quitada el ${fechaCorta(c.revocadaEn)}` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
