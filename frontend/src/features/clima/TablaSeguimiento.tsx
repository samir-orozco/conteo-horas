import { useState } from 'react';
import type { EstadoDeSeguimiento, FilaDeSeguimiento } from './tipos';
import ChipDeEstado from './ChipDeEstado';
import { ESTADOS, NOMBRE_DE_ESTADO } from './estadoDeSeguimiento';
import { fechaCortaSinAnio } from './panelClima';

// LA PESTAÑA «SEGUIMIENTO» (pedido del dueño, 4 de octubre de 2026): todos los casos de la empresa en
// una tabla, primero los sin revisar. «Abrir» lleva al mismo panel de «Revisar».
export default function TablaSeguimiento({ casos, onAbrir }: { casos: FilaDeSeguimiento[]; onAbrir: (c: FilaDeSeguimiento) => void }) {
  const [filtro, setFiltro] = useState<EstadoDeSeguimiento | null>(null);
  if (casos.length === 0) {
    return (
      <div className="bg-white rounded-card border border-gray-200 p-6">
        <p className="text-sm text-muted">Todavía no hay casos. Se abren solos cuando alguien entra a «Necesitan atención».</p>
      </div>
    );
  }
  const visibles = filtro ? casos.filter(c => c.estado === filtro) : casos;
  const opciones: (EstadoDeSeguimiento | null)[] = [null, ...ESTADOS];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {opciones.map(e => {
          const n = e ? casos.filter(c => c.estado === e).length : casos.length;
          const activo = filtro === e;
          return (
            <button
              key={e ?? 'todos'} type="button" aria-pressed={activo} onClick={() => setFiltro(e)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                activo ? 'bg-ink border-ink text-white' : 'border-gray-300 text-ink hover:bg-gray-50'}`}
            >
              {`${e ? NOMBRE_DE_ESTADO[e] : 'Todos'} (${n})`}
            </button>
          );
        })}
      </div>

      {/* UNA TABLA QUE EN PANTALLA ANGOSTA SE VUELVE TARJETAS (4 de octubre de 2026). Con scroll lateral,
          «Último comentario» y «Abrir» quedaban escondidos, y un rótulo para lectores de pantalla se escapaba
          del contenedor y estiraba la página: el contenedor es `relative` para encerrarlo. Los roles van
          escritos porque cambiar el `display` de una tabla le borra la semántica en algunos navegadores. */}
      <div className="relative bg-white rounded-card border border-gray-200">
        <table role="table" aria-label="Casos de seguimiento" className="block lg:table w-full text-sm">
          <thead className="hidden lg:table-header-group">
            <tr role="row" className="text-left text-xs text-muted border-b border-gray-200">
              <th role="columnheader" className="px-4 py-3 font-medium">Persona</th>
              <th role="columnheader" className="px-4 py-3 font-medium">Estado</th>
              <th role="columnheader" className="px-4 py-3 font-medium">Responsable</th>
              <th role="columnheader" className="px-4 py-3 font-medium">Abierto</th>
              <th role="columnheader" className="px-4 py-3 font-medium">Último comentario</th>
              <th role="columnheader" className="px-4 py-3"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody className="block lg:table-row-group divide-y divide-gray-100">
            {visibles.map(c => (
              <tr key={c.id} role="row" className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3 lg:table-row lg:p-0 lg:align-top">
                <td role="cell" className="w-full lg:w-auto lg:table-cell lg:px-4 lg:py-3 lg:min-w-[180px]">
                  <p className="font-semibold text-ink">{c.nombre}</p>
                  <p className="text-xs text-muted">{[c.cargo, c.sedes.join(', ')].filter(Boolean).join(' · ')}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {c.racha !== null ? `${c.racha} respuestas negativas consecutivas` : 'Ya salió de «Necesitan atención»'}
                  </p>
                </td>
                <td role="cell" className="lg:table-cell lg:px-4 lg:py-3"><ChipDeEstado estado={c.estado} /></td>
                <td role="cell" className="lg:table-cell lg:px-4 lg:py-3 lg:whitespace-nowrap">
                  <span className="lg:hidden text-xs text-muted">Responsable: </span>
                  {c.responsable ? <span>{c.responsable}</span> : <span className="text-muted">Sin asignar</span>}
                </td>
                <td role="cell" className="lg:table-cell lg:px-4 lg:py-3 lg:whitespace-nowrap text-muted">
                  <span className="lg:hidden text-xs">Abierto el </span>
                  <span>{fechaCortaSinAnio(c.abiertoEn)}</span>
                  {c.cerradoEn && <span className="block text-xs">{`Cerrado el ${fechaCortaSinAnio(c.cerradoEn)}`}</span>}
                </td>
                <td role="cell" className="w-full lg:w-auto lg:table-cell lg:px-4 lg:py-3 lg:min-w-[220px] lg:max-w-[340px]">
                  {c.ultimoComentario ? (
                    <>
                      <p className="text-ink line-clamp-2 break-words">{c.ultimoComentario.texto}</p>
                      <p className="text-xs text-muted">{`${c.ultimoComentario.autorNombre} · ${fechaCortaSinAnio(c.ultimoComentario.creadoEn)}`}{c.comentarios > 1 && ` · ${c.comentarios} comentarios`}</p>
                    </>
                  ) : <span className="text-muted">{c.comentarios > 0 ? `${c.comentarios} comentarios` : 'Sin comentarios'}</span>}
                </td>
                <td role="cell" className="w-full lg:w-auto lg:table-cell lg:px-4 lg:py-3 text-right">
                  <button
                    type="button" onClick={() => onAbrir(c)} aria-label={`Abrir el caso de ${c.nombre}`}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-ink hover:bg-gray-50"
                  >
                    Abrir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
