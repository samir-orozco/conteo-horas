import { format, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Trash2, AlertTriangle, Info, Check, Plus,
  FileText, Image as ImageIcon, CalendarClock,
} from 'lucide-react';
import { TIPO_LABEL, ALERTA, type Contrato } from './tipos';

const dLarga = (s: string | null) => s ? format(new Date(s), "d MMM yyyy", { locale: es }) : '—';
const dCorta = (s: string | null) => s ? format(new Date(s), 'dd/MM/yy') : '—';

// "1 año 3 meses", "8 meses", "24 días". Se redondea a la unidad que se entiende
// de un vistazo: nadie razona un contrato en días cuando dura años.
function duracionLegible(dias: number): string {
  if (dias < 45) return `${dias} día${dias === 1 ? '' : 's'}`;
  const meses = Math.round(dias / 30.44);
  if (meses < 12) return `${meses} mes${meses === 1 ? '' : 'es'}`;
  const anios = Math.floor(meses / 12);
  const resto = meses % 12;
  return resto === 0 ? `${anios} año${anios === 1 ? '' : 's'}` : `${anios} a ${resto} m`;
}

const TONOS = {
  rojo:  { caja: 'bg-red-50 border-red-200 text-red-800',       barra: 'bg-red-500' },
  ambar: { caja: 'bg-amber-50 border-amber-200 text-amber-800', barra: 'bg-amber-500' },
  azul:  { caja: 'bg-blue-50 border-blue-200 text-blue-800',    barra: 'bg-blue-500' },
};

// Un archivo adjunto se dibuja como un archivo: recuadro, icono con el color de
// su formato y el nombre. Antes el contrato era un enlace suelto entre las
// etiquetas del encabezado y el otrosí era un clip gris de 12px, que no se leía
// como "aquí hay un PDF" sino como decoración.
function FichaDocumento({ tipo, nombre, respaldo, onAbrir }: {
  tipo: string; nombre: string | null; respaldo: string; onAbrir: () => void;
}) {
  const esPdf = tipo === 'application/pdf';
  return (
    <button type="button" onClick={onAbrir} title={nombre ?? respaldo}
      className="inline-flex items-center gap-1.5 max-w-full pl-1 pr-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 transition-colors">
      <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
        esPdf ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
        {esPdf ? <FileText size={12} /> : <ImageIcon size={12} />}
      </span>
      <span className="text-[11px] font-medium text-ink truncate">{nombre || respaldo}</span>
    </button>
  );
}

function Dato({ rotulo, valor, pie, tono }: { rotulo: string; valor: string; pie?: string; tono?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{rotulo}</p>
      <p className={`text-sm font-semibold truncate ${tono ?? 'text-ink'}`}>{valor}</p>
      {/* El pie ya no se recorta: "la próxima, mínimo 1 año" quedaba cortado y
          era justo el dato que había que leer. Cabe en dos líneas. */}
      {pie && <p className="text-[11px] text-muted leading-tight mt-0.5">{pie}</p>}
    </div>
  );
}

export default function TarjetaContrato({ c, onBorrar, onProrrogar, onConvertir, onVerDocumento }: {
  c: Contrato;
  onBorrar: () => void;
  onProrrogar: () => void;
  onConvertir: () => void;
  // El archivo no viaja con el listado por su peso: se pide al abrirlo.
  onVerDocumento: (url: string, nombre: string | null) => void;
}) {
  const k = c.calculo;
  const indefinidoDeFacto = c.tipo === 'INDEFINIDO' || !!c.convertidoAIndefinidoEn;
  const terminado = c.estado === 'TERMINADO';
  const prorrogable = (c.tipo === 'FIJO' || c.tipo === 'APRENDIZAJE') && !terminado && !c.convertidoAIndefinidoEn;

  // Cuánto del tope legal se lleva consumido. Es la razón de ser de todo esto y
  // en la versión anterior no se veía por ningún lado: había que leer una fecha
  // suelta en gris y hacer la cuenta de cabeza.
  let consumido: { pct: number; texto: string; total: string; desdeLaReforma: boolean } | null = null;
  if (k.arranqueTope && k.topeMaximo && k.finVigente && !indefinidoDeFacto) {
    const total = differenceInCalendarDays(new Date(k.topeMaximo), new Date(k.arranqueTope));
    const usado = differenceInCalendarDays(new Date(k.finVigente), new Date(k.arranqueTope));
    consumido = {
      pct: Math.max(0, Math.min(100, Math.round((usado / total) * 100))),
      texto: duracionLegible(Math.max(0, usado)),
      total: duracionLegible(total),
      // El tope de los contratos anteriores a la reforma corre desde el 25 de
      // junio de 2025, no desde su firma. Sin decirlo, alguien con un contrato de
      // 2019 lee "lleva 9 meses" y piensa que la cuenta está mal.
      desdeLaReforma: k.arranqueTope.slice(0, 10) !== c.fechaInicio.slice(0, 10),
    };
  }

  // El número que de verdad hay que mirar, y en qué color.
  const dias = k.diasParaVencer;
  const urgencia = k.preavisoVencido ? 'text-red-600'
    : dias !== null && dias <= 60 ? 'text-amber-600' : 'text-ink';

  // El preaviso salió de la rejilla de datos. No es un hecho del contrato como
  // el inicio o el vencimiento: es algo que hay que HACER antes de una fecha, y
  // como columna se leía igual de fuerte que las otras tres, ocupando el sitio
  // que necesitaba "la próxima, mínimo 1 año". Ahora es una línea de aviso, y
  // solo mientras el contrato siga corriendo: en uno ya vencido esa fecha es
  // historia y solo estorba.
  const vencido = dias !== null && dias < 0;
  const mostrarPreaviso = !indefinidoDeFacto && !terminado && !vencido && !!k.fechaLimitePreaviso;

  return (
    <div className={`rounded-xl border p-4 ${terminado ? 'border-gray-100 bg-gray-50/60' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-sm font-bold text-ink">{TIPO_LABEL[c.tipo]}</span>
          {terminado
            ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">TERMINADO</span>
            : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">VIGENTE</span>}
          {c.convertidoAIndefinidoEn && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">PASÓ A INDEFINIDO</span>
          )}
          {k.etapa && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/30 text-ink">ETAPA {k.etapa}</span>
          )}
        </div>
        <button onClick={onBorrar} title="Eliminar contrato"
          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded shrink-0 transition-colors">
          <Trash2 size={15} />
        </button>
      </div>

      {/* Los hechos del contrato: cuándo empezó, cuándo termina y cuántas veces
          se ha renovado. Tres, no cuatro: son los que se comparan entre
          contratos, y en tres columnas los pies de cada uno caben enteros.

          Las columnas se cuentan contra el ancho de ESTA caja, no contra el de
          la ventana. Con `sm:grid-cols-3` la tarjeta pasaba a tres columnas a
          partir de 640px de ventana, pero la ficha la parte en dos a partir de
          1024, así que en un portátil el panel medía ~355px y "30 jun 2028" se
          recortaba justo en la pantalla más común. Con auto-fit se reacomoda
          sola en dos columnas, o en una, antes que recortar un dato. */}
      <div className="bg-gray-50 rounded-xl px-4 py-3 grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-x-4 gap-y-3">
        <Dato rotulo="Inicio" valor={dLarga(c.fechaInicio)} />
        {indefinidoDeFacto ? (
          <Dato rotulo="Vence" valor="No vence" pie={c.convertidoAIndefinidoEn ? `Indefinido desde el ${dCorta(c.convertidoAIndefinidoEn)}` : undefined} />
        ) : (
          <Dato rotulo="Vence" valor={dLarga(k.finVigente)}
            pie={dias === null ? undefined : dias >= 0 ? `en ${dias} días` : `hace ${Math.abs(dias)} días`}
            tono={urgencia} />
        )}
        <Dato rotulo="Prórrogas" valor={String(k.numeroProrrogas)}
          pie={k.proximaProrrogaMinimaUnAno ? 'la próxima, mínimo 1 año' : undefined}
          tono={k.proximaProrrogaMinimaUnAno ? 'text-amber-600' : undefined} />
      </div>

      {/* El aviso queda en gris a propósito. Si además es urgente, abajo aparece
          la alerta en ámbar o rojo con el porqué; dos bloques de color seguidos
          diciendo lo mismo no crean urgencia, crean ruido. */}
      {mostrarPreaviso && (
        <div className="mt-2 flex items-start gap-2 text-[11px] text-muted">
          <CalendarClock size={13} className="shrink-0 mt-px" />
          <span>
            Para no renovarlo hay que avisar por escrito antes del{' '}
            <b className={k.preavisoVencido ? 'text-red-600' : 'text-ink'}>{dCorta(k.fechaLimitePreaviso)}</b>.
          </span>
        </div>
      )}

      {/* Cuánto se lleva del tope legal. Es lo que hace tangible la regla. */}
      {consumido && (
        <div className="mt-3">
          <div className="flex items-baseline justify-between text-[11px] mb-1">
            <span className="text-muted">
              Lleva <b className="text-ink">{consumido.texto}</b> del máximo de {consumido.total} que permite la ley
            </span>
            <span className={consumido.pct >= 100 ? 'font-bold text-red-600' : 'text-muted'}>{consumido.pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div style={{ width: `${consumido.pct}%` }}
              className={`h-full rounded-full transition-all ${
                consumido.pct >= 100 ? 'bg-red-500' : consumido.pct >= 75 ? 'bg-amber-500' : 'bg-green-500'}`} />
          </div>
          <p className="text-[11px] text-muted mt-1">
            {consumido.desdeLaReforma && (
              <>Contado desde el {dCorta(k.arranqueTope)}, cuando entró la reforma laboral, no desde la firma. </>
            )}
            {k.seVuelveIndefinidoEl && <>Pasa a indefinido el <b>{dCorta(k.seVuelveIndefinidoEl)}</b>.</>}
          </p>
        </div>
      )}

      {k.alertas.map(a => {
        const t = ALERTA[a.tipo];
        return (
          <div key={a.tipo} className={`mt-3 rounded-lg border px-3 py-2 text-xs ${TONOS[t.tono].caja}`}>
            <p className="font-bold flex items-center gap-1.5">
              {t.tono === 'azul' ? <Info size={13} /> : <AlertTriangle size={13} />}{t.titulo}
            </p>
            <p className="mt-0.5 leading-relaxed">{t.detalle(a.dias)}</p>
            {(a.tipo === 'SUPERA_TOPE' || a.tipo === 'SE_VUELVE_INDEFINIDO') && !c.convertidoAIndefinidoEn && (
              <button onClick={onConvertir}
                className="mt-2 flex items-center gap-1.5 text-xs font-bold bg-white border border-current px-2.5 py-1 rounded-lg hover:bg-white/60">
                <Check size={13} /> Confirmar paso a indefinido
              </button>
            )}
          </div>
        );
      })}

      {/* Las prórrogas como una secuencia con su duración, no como una lista de
          fechas sueltas: así se ve de un golpe que fueron cuatro trimestres. */}
      {c.prorrogas.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted mb-1.5">Prórrogas</p>
          <div className="space-y-1.5">
            {c.prorrogas.map((p, i) => {
              const d = differenceInCalendarDays(new Date(p.hasta), new Date(p.desde)) + 1;
              const esLaCuarta = i === 3;
              return (
                <div key={p.id} className="flex items-center gap-2 flex-wrap text-xs">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    esLaCuarta ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-muted'}`}>{i + 1}</span>
                  <span className="text-ink font-mono">{dCorta(p.desde)} → {dCorta(p.hasta)}</span>
                  <span className="text-muted">{duracionLegible(d)}</span>
                  {esLaCuarta && <span className="text-[10px] font-semibold text-amber-700">límite de las cortas</span>}
                  {p.documentoTipo && (
                    <span className="ml-auto min-w-0">
                      <FichaDocumento tipo={p.documentoTipo} nombre={p.documentoNombre} respaldo="Otrosí"
                        onAbrir={() => onVerDocumento(`/contratos/prorrogas/${p.id}/documento`, p.documentoNombre)} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pie: el documento firmado y la acción, juntos y con el mismo peso. El
          contrato colgaba del encabezado, apretado entre las etiquetas de estado
          y peleando con ellas por la atención. */}
      {(c.documentoTipo || prorrogable) && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
          {c.documentoTipo && (
            <FichaDocumento tipo={c.documentoTipo} nombre={c.documentoNombre} respaldo="Contrato firmado"
              onAbrir={() => onVerDocumento(`/contratos/${c.id}/documento`, c.documentoNombre)} />
          )}
          {prorrogable && (
            <button onClick={onProrrogar}
              className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-ink border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg">
              <Plus size={13} /> Agregar prórroga
            </button>
          )}
        </div>
      )}

      {c.observacion && <p className="text-xs text-muted mt-2.5 whitespace-pre-wrap">{c.observacion}</p>}
    </div>
  );
}
