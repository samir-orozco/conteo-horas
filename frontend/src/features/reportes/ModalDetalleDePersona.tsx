import { useEffect, useState } from 'react';
import { X, LogIn, LogOut, CalendarClock, CalendarDays } from 'lucide-react';
import api from '../../lib/api';
import { TZ } from '../../lib/fechas';
import { TIPO_PERMISO_LABEL } from '../../constants/permisos';
import { diasDelPeriodo, type RegistroDelPeriodo, type NovedadDelPeriodo } from './detalleDelPeriodo';
import type { PersonaDeNomina, Periodo } from './nominaDelPeriodo';

// El detalle de una persona dentro del reporte de nómina (15 de septiembre de 2026, pedido del dueño).
//
// Antes, las novedades del período iban apretadas en una celda de la tabla, que no alcanzaba para
// nada y no decía qué días se trabajaron. Ahora la fila tiene un ojo y el ojo abre esto, con el mismo
// lenguaje del detalle de una jornada: las tarjetas arriba y el día a día abajo.
//
// Los datos se piden al abrir, no al cargar el reporte: son dos consultas por persona, y traerlas
// para las cincuenta filas de una empresa al entrar a la pantalla es trabajo que casi nadie va a mirar.

const horas = (min: number) => `${Math.floor(min / 60)}h ${String(Math.round(min % 60)).padStart(2, '0')}m`;
const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
const nombreDeNovedad = (tipo: string) => TIPO_PERMISO_LABEL[tipo] ?? tipo.toLowerCase().replace(/_/g, ' ');

// El día llega como «2026-09-10» y se ancla al MEDIODÍA UTC a propósito: a medianoche, cualquier
// zona al occidente de Colombia pintaría el día anterior.
const enBogota = (dia: string, formato: Intl.DateTimeFormatOptions) =>
  new Date(`${dia}T12:00:00Z`).toLocaleDateString('es-CO', { timeZone: TZ, ...formato });

// «Jueves, 10 de septiembre», con mayúscula al principio: encabeza cada línea de la lista.
const fechaDelDia = (dia: string) => {
  const texto = enBogota(dia, { weekday: 'long', day: 'numeric', month: 'long' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

// «1 de septiembre», para el rango de la cabecera. Sin el día de la semana, que en un rango no dice
// nada, y sin mayúscula: va en mitad de una frase. Decía «Del Martes, 1 de septiembre al Martes, 15
// de septiembre», visto en pantalla el 15 de septiembre de 2026.
const fechaDelRango = (dia: string, conAnio = false) =>
  enBogota(dia, { day: 'numeric', month: 'long', ...(conAnio ? { year: 'numeric' } : {}) });

// El mismo rótulo con su valor de las tarjetas del detalle de la jornada. Va como `group` con el
// rótulo por nombre: así cada tarjeta se puede encontrar por lo que dice ser, y una prueba que
// compruebe el número de una no pasa porque lo encontró en la de al lado.
function Tarjeta({ rotulo, Icono, valor, nota }: {
  rotulo: string; Icono: typeof LogIn; valor: string; nota?: string;
}) {
  return (
    <div role="group" aria-label={rotulo} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
      <p className="text-xs text-muted flex items-center gap-1.5"><Icono size={13} aria-hidden="true" />{rotulo}</p>
      <p className="mt-1 text-lg font-semibold text-ink tabular-nums">{valor}</p>
      {nota && <p className="text-xs text-muted">{nota}</p>}
    </div>
  );
}

type Props = { persona: PersonaDeNomina; periodo: Periodo; onCerrar: () => void };

export default function ModalDetalleDePersona({ persona, periodo, onCerrar }: Props) {
  const [registros, setRegistros] = useState<RegistroDelPeriodo[] | null>(null);
  const [novedades, setNovedades] = useState<NovedadDelPeriodo[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    // Las novedades se piden sin rango porque la ruta no lo acepta: el recorte al período lo hace
    // `diasDelPeriodo`, que es donde está probado.
    Promise.all([
      api.get('/registros', { params: { colaboradorId: persona.colaboradorId, desde: periodo.desde, hasta: periodo.hasta } }),
      api.get('/permisos', { params: { colaboradorId: persona.colaboradorId } }),
    ])
      .then(([r, p]) => {
        if (!vigente) return;
        setRegistros(r.data);
        setNovedades(p.data);
      })
      .catch(() => { if (vigente) setError('No pudimos cargar el detalle de esta persona.'); });
    return () => { vigente = false; };
  }, [persona.colaboradorId, periodo.desde, periodo.hasta]);

  const dias = registros ? diasDelPeriodo(registros, novedades, periodo.desde, periodo.hasta) : [];

  return (
    <div className="fixed inset-0 !mt-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onCerrar}>
      <div
        role="dialog" aria-modal="true" aria-labelledby="titulo-del-detalle-de-nomina"
        onClick={e => e.stopPropagation()}
        className="hp-pop bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="min-w-0">
            <h3 id="titulo-del-detalle-de-nomina" className="font-bold text-xl text-ink truncate">
              {persona.nombre} {persona.apellido}
            </h3>
            <p className="text-sm text-muted truncate">
              {persona.cargo && `${persona.cargo} · `}
              Del {fechaDelRango(periodo.desde)} al {fechaDelRango(periodo.hasta, true)}
            </p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className="shrink-0 p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Los días salen de la lista de abajo, NO de `registrosCont`: ese es
              `registros.filter(r => r.salida).length` en el motor, o sea las marcaciones cerradas.
              Medido contra la base local el 15 de septiembre de 2026, una persona con 12 marcaciones
              en 5 días daba 11 y otra que nunca marcó la salida daba 0 teniendo días trabajados; la
              tarjeta de arriba contradecía a la lista de abajo dentro del mismo modal. El número del
              motor sigue a la vista, con su nombre, porque es el que sostiene el pago. */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Mientras no hayan llegado los registros, esta tarjeta NO muestra un número: con
                `dias.length` enseñaba «0» hasta que cargaba y recién ahí pasaba al valor bueno, y si
                la petición falla se queda puesto. Es el mismo cero engañoso que se quitó de los otros
                sitios, visto en pantalla el 15 de septiembre de 2026. */}
            <Tarjeta rotulo="Días con marcación" Icono={CalendarDays}
              valor={registros ? String(dias.length) : '···'} />
            <Tarjeta rotulo="Marcaciones cerradas" Icono={LogOut} valor={String(persona.registrosCont)}
              nota="las que el motor liquida" />
            <Tarjeta rotulo="Horas ordinarias" Icono={LogIn} valor={horas(persona.minutosOrdinarios)} />
            <Tarjeta rotulo="Total adicional" Icono={LogOut} valor={fmt(persona.totalAdicional)}
              nota="recargos y extras" />
          </div>

          {/* Las novedades del período, que es lo que antes iba apretado en la celda de la tabla. */}
          <section aria-labelledby="titulo-novedades-del-periodo">
            <p id="titulo-novedades-del-periodo" className="text-sm font-medium text-ink mb-2 flex items-center gap-1.5">
              <CalendarClock size={14} /> Novedades del período
            </p>
            {persona.novedades.length === 0 ? (
              <p className="text-sm text-muted">Sin novedades en este período.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {persona.novedades.map(n => (
                  <span key={n.tipo}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${n.remunerado ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                    {nombreDeNovedad(n.tipo)}: {n.dias} {n.dias === 1 ? 'día' : 'días'}
                    {n.parciales > 0 && ` · ${n.parciales} de parte del día`}
                    {n.remunerado ? ' · se paga' : ' · no se paga'}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="titulo-asistencias-del-periodo">
            <p id="titulo-asistencias-del-periodo" className="text-sm font-medium text-ink mb-2 flex items-center gap-1.5">
              <CalendarDays size={14} /> Asistencias del período
            </p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {!registros && !error && <p className="text-sm text-gray-400">Cargando las asistencias...</p>}
            {registros && dias.length === 0 && (
              <p className="text-sm text-muted">No marcó ningún día en este período.</p>
            )}
            {dias.length > 0 && (
              <ul className="space-y-2">
                {dias.map(d => (
                  <li key={d.dia} className="rounded-xl border border-gray-200 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <span className="min-w-[11rem] flex-1">
                      <span className="block text-sm font-medium text-ink">{fechaDelDia(d.dia)}</span>
                      {d.jornadas > 1 && (
                        <span className="block text-xs text-muted">{d.jornadas} jornadas</span>
                      )}
                    </span>
                    <span className="text-sm text-ink tabular-nums">
                      {d.entrada ?? '—'} a {d.salida ?? '···'}
                    </span>
                    {d.sinSalida && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">Sin salida</span>
                    )}
                    {d.novedades.map(n => (
                      <span key={n.id}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${n.remunerado ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                        {nombreDeNovedad(n.tipo)}
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
