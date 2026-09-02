import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, X, Eye, ArrowUpRight, MessageCircle, LogOut, Undo2, FileSpreadsheet } from 'lucide-react';
import api from '../lib/api';
import { useMiPlan } from '../lib/plan';
import { useAuth } from '../context/AuthContext';
import SelectorSedes from '../components/SelectorSedes';
import ModalRetiro from '../features/colaboradores/ModalRetiro';
import ModalReingreso from '../features/colaboradores/ModalReingreso';
import ModalImportar from '../features/colaboradores/ModalImportar';
import Toast from '../components/Toast';
import { estadoContrato, OPCIONES_CONTRATO, cumpleFiltros, SIN_SEDE } from '../features/colaboradores/estadoContrato';
import MenuFiltros from '../components/MenuFiltros';
import AvatarMini from '../components/AvatarMini';
import { formatearMiles, parsearMiles } from '../lib/dinero';
import { fechaCorta } from '../lib/fechas';
import { ETIQUETA_MOTIVO } from '../features/colaboradores/motivos';
import SelectorModalidad from '../components/SelectorModalidad';
import { ETIQUETA_MODALIDAD, TONO_MODALIDAD, normalizarModalidad } from '../features/colaboradores/modalidad';

type Colaborador = { id: string; nombre: string; apellido: string; cedula: string; cargo?: string; email?: string; telefono?: string; fechaNacimiento?: string | null; salarioMensual: number; activo: boolean; retiroProgramado?: string | null; horarioId?: string | null; sedeIds?: string[]; sedeNombres?: string[]; estadoContrato?: string | null; fotoMini?: string | null; modalidad?: string };
// Los colores del chip de contrato. Se quedan en la pantalla y no en la regla:
// qué es urgente lo decide estadoContrato.ts, cómo se ve lo decide esto.
const TONO_CHIP: Record<string, string> = {
  rojo: 'bg-red-100 text-red-700',
  ambar: 'bg-amber-100 text-amber-800',
  verde: 'bg-green-100 text-green-800',
  gris: 'bg-gray-100 text-gray-600',
};

export type Franja = { dias: string[]; horaEntrada: string; horaSalida: string };
type Horario = { id: string; nombre: string; franjas: Franja[] };
type FormData = Omit<Colaborador, 'id' | 'activo'>;
type Retirado = { id: string; nombre: string; apellido: string; cedula: string; cargo?: string;
  salarioMensual: number; fechaRetiro: string | null; motivoRetiro: string | null };

const EMPTY: FormData = { nombre: '', apellido: '', cedula: '', cargo: '', email: '', telefono: '', fechaNacimiento: '', salarioMensual: 0, horarioId: '', sedeIds: [], modalidad: 'PRESENCIAL' };

// La fecha viene del backend como ISO; el input date necesita "YYYY-MM-DD"
export const soloFecha = (s?: string | null) => (s ? new Date(s).toISOString().slice(0, 10) : '');

// Formato de pesos colombianos mientras se digita: 1750000 → 1.750.000

// Resumen compacto de las franjas de un horario: "Lun–Vie 08:00—17:00 · Sáb 08:00—12:00"
const ORDEN_DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
const CORTO: Record<string, string> = { LUNES: 'Lun', MARTES: 'Mar', MIERCOLES: 'Mié', JUEVES: 'Jue', VIERNES: 'Vie', SABADO: 'Sáb', DOMINGO: 'Dom' };
export function resumenFranjas(franjas?: Franja[]): string {
  if (!franjas?.length) return '';
  return franjas.map(f => {
    const idx = ORDEN_DIAS.filter(d => f.dias.includes(d));
    // Días consecutivos se colapsan a rango (Lun–Vie); si no, se listan
    const consecutivos = idx.length > 2 && idx.every((d, i) => i === 0 || ORDEN_DIAS.indexOf(d) === ORDEN_DIAS.indexOf(idx[i - 1]) + 1);
    const dias = consecutivos ? `${CORTO[idx[0]]}–${CORTO[idx[idx.length - 1]]}` : idx.map(d => CORTO[d]).join('·');
    return `${dias} ${f.horaEntrada}—${f.horaSalida}`;
  }).join(' · ');
}

// Enlace de WhatsApp para pedir más cupo.
//
// Antes era un texto fijo que decía "más de 150 colaboradores" aunque el tope
// real fuera otro, y llegaba sin firma: al otro lado aparecía un número suelto
// pidiendo algo, sin saber de quién ni de qué empresa. Ahora lleva el nombre de
// quien escribe, la empresa y el plan con su tope, que es lo que se necesita
// para atenderlo sin tener que preguntar tres cosas primero.
const WPP_NUMERO = '573166435723';
function enlaceMasCupo(nombre?: string, empresa?: string | null, nombrePlan?: string, limite?: number | null) {
  const quien = nombre ? `soy ${nombre}` : 'les escribo';
  const deDonde = empresa ? ` de ${empresa}` : '';
  const cual = nombrePlan && limite != null
    ? ` Estoy en el plan ${nombrePlan}, que llega hasta ${limite} colaboradores, y ya lo tengo lleno.`
    : '';
  const texto = `Hola, ${quien}${deDonde}.${cual} Necesito agregar más colaboradores a mi cuenta de HoraPro. ¿Me ayudan?`;
  return `https://wa.me/${WPP_NUMERO}?text=${encodeURIComponent(texto)}`;
}

export default function Colaboradores() {
  const navigate = useNavigate();
  const { plan, recargar: recargarPlan } = useMiPlan();
  const { usuario } = useAuth();
  const [lista, setLista] = useState<Colaborador[]>([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Colaborador | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [retirando, setRetirando] = useState<Colaborador | null>(null);
  const [reingresando, setReingresando] = useState<{ id: string; nombre: string; apellido: string } | null>(null);
  // Pestaña activa. Los retirados van aparte para que ningún total de la
  // operación de hoy los cuente por accidente.
  const [pestana, setPestana] = useState<'todos' | 'activos' | 'retirados'>('activos');
  const [retirados, setRetirados] = useState<Retirado[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [sedes, setSedes] = useState<{ id: string; nombre: string }[]>([]);
  const [errorForm, setErrorForm] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = () => api.get('/colaboradores').then(r => setLista(r.data));
  const cargarRetirados = () => api.get('/colaboradores/inactivos')
    .then(r => setRetirados(r.data))
    .catch(() => setRetirados([]));

  // Refresca las dos listas y fija los dos estados en el MISMO tick.
  //
  // Llamar a cargar() y cargarRetirados() por separado no basta, ni siquiera
  // esperándolas con Promise.all: cada una hace su setState dentro de su propio
  // `then`, en microtareas distintas, así que React alcanza a pintar con una
  // lista nueva y la otra vieja. En pantalla eso era la misma persona apareciendo
  // dos veces, como activa y como retirada a la vez.
  const recargarTodo = async () => {
    const [act, inact] = await Promise.all([
      api.get('/colaboradores'),
      api.get('/colaboradores/inactivos').catch(() => ({ data: [] })),
    ]);
    setLista(act.data);
    setRetirados(inact.data);
  };

  useEffect(() => {
    cargar();
    cargarRetirados();
    api.get('/horarios').then(r => setHorarios(r.data));
    api.get('/sedes').then(r => setSedes(r.data)).catch(() => setSedes([]));
  }, []);

  const abrir = (col?: Colaborador) => {
    setEditando(col || null);
    setErrorForm('');
    setForm(col ? { nombre: col.nombre, apellido: col.apellido, cedula: col.cedula, cargo: col.cargo || '', email: col.email || '', telefono: col.telefono || '', fechaNacimiento: soloFecha(col.fechaNacimiento), salarioMensual: col.salarioMensual, horarioId: col.horarioId || '', sedeIds: col.sedeIds ?? [], modalidad: normalizarModalidad(col.modalidad) } : EMPTY);
    setModal(true);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setErrorForm('');
    try {
      const payload = {
        ...form,
        horarioId: form.horarioId || null,
        sedeIds: (form.sedeIds as string[]) ?? [],
        // Fecha vacía debe ir como null (Prisma rechaza el string vacío en un campo de fecha)
        fechaNacimiento: form.fechaNacimiento ? form.fechaNacimiento : null,
      };
      if (editando) await api.put(`/colaboradores/${editando.id}`, payload);
      else await api.post('/colaboradores', payload);
      setModal(false);
      cargar();
    } catch (err: any) {
      setErrorForm(err.response?.data?.error ?? 'No pudimos guardar el colaborador. Revisa los datos e intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

  const limite = plan && !plan.ilimitado ? plan.limite : null; // null = ilimitado
  const usados = lista.length;
  const topado = limite != null && usados >= limite;
  // La pestaña se DERIVA, no se lee del estado a secas: al reingresar al último
  // retirado la pestaña desaparece, y si el estado seguía en 'retirados' la
  // pantalla quedaba en blanco sin forma de volver.
  const pestanaActiva = retirados.length === 0 ? 'activos' : pestana;
  const [filtros, setFiltros] = useState<Record<string, string[]>>({});
  const [modalImportar, setModalImportar] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Una sola lista con su estado, que es como se responde "¿esta persona
  // todavía trabaja aquí?" sin tener que cambiar de pestaña para averiguarlo.
  type Fila = { id: string; nombre: string; apellido: string; cedula: string; cargo?: string;
    salarioMensual: number; activo: boolean; fechaRetiro?: string | null; motivoRetiro?: string | null;
    estadoContrato?: string | null; sedeIds?: string[]; sedeNombres?: string[];
    fotoMini?: string | null; modalidad?: string };
  const filas: Fila[] = pestanaActiva === 'retirados'
    ? retirados.map(r => ({ ...r, activo: false }))
    : pestanaActiva === 'activos'
      ? lista.map(c => ({ ...c, activo: true }))
      : [...lista.map(c => ({ ...c, activo: true })), ...retirados.map(r => ({ ...r, activo: false }))]
          .filter((f, i, todas) => todas.findIndex(o => o.id === f.id) === i)
          .sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre));

  // El filtro de contrato solo aplica a quien sigue trabajando: el contrato de
  // un retirado ya no hay que renovarlo.
  const visibles = filas.filter(f => !f.activo || cumpleFiltros(f, filtros));

  // Las sedes que de verdad existen entre los colaboradores. Ofrecer una sede
  // que nadie tiene solo da resultados vacíos.
  const sedesDelFiltro = [...new Map(
    lista.flatMap(c => (c.sedeIds ?? []).map((id, i) => [id, (c.sedeNombres ?? [])[i] ?? 'Sede'] as const)),
  )].map(([valor, texto]) => ({ valor, texto })).sort((a, b) => a.texto.localeCompare(b.texto));
  const esEmpresarial = plan?.plan === 'EMPRESARIAL';
  const pct = limite ? Math.min(100, Math.round((usados / limite) * 100)) : 0;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-ink">Colaboradores</h2>
        {topado ? (
          esEmpresarial ? (
            <a href={enlaceMasCupo(usuario?.nombre, usuario?.empresaNombre, plan?.nombrePlan, limite)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#25D366] hover:brightness-95 text-white px-4 py-2 rounded-xl text-sm font-semibold">
              <MessageCircle size={16} /> ¿Más de {limite}? Escríbenos
            </a>
          ) : (
            <button onClick={() => navigate('/app/configuracion?tab=suscripcion')}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink px-4 py-2 rounded-xl text-sm font-semibold">
              <ArrowUpRight size={16} /> Subir de plan
            </button>
          )
        ) : (
          <div className="flex items-center gap-2">
            {/* Subir varios va al lado de agregar uno: es la misma tarea con
                otro volumen, y quien llega con 40 personas en un Excel no
                debería tener que buscarla en otro menú. */}
            <button onClick={() => setModalImportar(true)}
              className="flex items-center gap-2 border-2 border-gray-200 hover:border-primary text-ink px-4 py-2 rounded-xl text-sm font-semibold">
              <FileSpreadsheet size={16} /><span className="hidden sm:inline">Subir varios</span>
            </button>
            <button onClick={() => abrir()} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink px-4 py-2 rounded-xl text-sm font-semibold">
              <Plus size={16} />Agregar
            </button>
          </div>
        )}
      </div>

      {limite != null && (
        <div className="bg-white rounded-card border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted">Plan <b className="text-ink">{plan?.nombrePlan}</b> · usas <b className="text-ink">{usados}</b> de <b className="text-ink">{limite}</b> colaboradores</span>
            {topado && <span className="text-xs font-semibold text-orange-600">Cupo lleno</span>}
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${topado ? 'bg-orange-500' : pct >= 80 ? 'bg-amber-400' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
          </div>
          {topado && (
            <p className="text-xs text-muted mt-2">
              {esEmpresarial
                ? 'Llegaste al máximo de tu plan. Escríbenos por WhatsApp para un plan a la medida.'
                : 'Llegaste al límite de tu plan. Sube de plan para agregar más colaboradores.'}
            </p>
          )}
        </div>
      )}

      <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
      {/* La pestaña de retirados solo aparece cuando hay alguien: si no, es una
          pestaña vacía que solo estorba. */}
      {retirados.length > 0 ? (
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit text-sm font-semibold">
          {([
            ['activos', 'Activos', lista.length],
            ['retirados', 'Retirados', retirados.length],
            ['todos', 'Todos', lista.length + retirados.length],
          ] as const).map(([clave, texto, n]) => (
            <button key={clave} onClick={() => setPestana(clave)}
              className={`px-4 py-1.5 rounded-lg transition-colors ${pestanaActiva === clave ? 'bg-white shadow text-ink' : 'text-muted hover:text-ink'}`}>
              {texto} <span className="font-normal">({n})</span>
            </button>
          ))}
        </div>
      ) : <span />}

        {/* Los filtros no son una pestaña más porque se cruzan con ellas: se
            puede querer ver los activos por vencer de una sede en concreto. */}
        {lista.length > 0 && (
          <MenuFiltros
            grupos={[
              { clave: 'contrato', titulo: 'Contrato', opciones: OPCIONES_CONTRATO },
              { clave: 'sede', titulo: 'Sede', opciones: sedesDelFiltro.length
                  ? [...sedesDelFiltro, { valor: SIN_SEDE, texto: 'Sin sede' }]
                  : [] },
            ]}
            seleccion={filtros}
            onCambiar={setFiltros}
            // El botón vive pegado al borde derecho de la pantalla, así que el
            // menú tiene que crecer hacia la izquierda o se sale.
            alinear="derecha"
          />
        )}
      </div>

      <div className="bg-white rounded-card border border-gray-200 overflow-hidden">
        {pestanaActiva !== 'activos' && (
          <p className="text-xs text-muted px-4 py-3 border-b border-gray-100">
            Los retirados no cuentan para el cupo de tu plan y no aparecen en reportes ni en el kiosco,
            pero conservan todo su historial. Reingresar recupera la ficha completa.
          </p>
        )}
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-muted uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">Contrato</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Sede</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Cargo</th>
              <th className="px-4 py-3 text-right hidden sm:table-cell">Salario</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibles.map(col => (
              <tr key={col.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/app/colaboradores/${col.id}`)}>
                {/* La cédula va bajo el nombre y no en su propia columna: es
                    el dato con el que se confirma que es la persona correcta,
                    y ahí se lee de un vistazo sin cruzar la fila entera. */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarMini nombre={col.nombre} apellido={col.apellido}
                      foto={col.fotoMini} activo={col.activo} />
                    <div className="min-w-0">
                      <p className="font-semibold text-ink truncate">{col.nombre} {col.apellido}</p>
                      <p className="text-xs text-muted">{col.cedula}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {col.activo ? (
                    <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">ACTIVO</span>
                  ) : (
                    <>
                      <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">RETIRADO</span>
                      {/* La fecha y el motivo van pegados al estado: sin eso,
                          "retirado" no dice ni cuándo ni por qué, que es
                          justamente lo que se busca al mirar esta lista. */}
                      <span className="block text-[11px] text-muted mt-1">
                        {col.fechaRetiro ? fechaCorta(col.fechaRetiro) : 'sin fecha'}
                        {col.motivoRetiro ? ` · ${ETIQUETA_MOTIVO[col.motivoRetiro] ?? col.motivoRetiro}` : ''}
                      </span>
                    </>
                  )}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  {col.activo ? (() => {
                    const e = estadoContrato(col.estadoContrato);
                    // whitespace-nowrap: "SE PRORROGÓ SOLO" se partía en dos líneas y
                    // desnivelaba la fila entera.
                    return <span className={`inline-block whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded-full ${TONO_CHIP[e.tono]}`}>{e.etiqueta.toUpperCase()}</span>;
                  })() : <span className="text-muted">—</span>}
                </td>
                <td className="px-4 py-3 text-muted hidden lg:table-cell">
                  {/* La modalidad va DENTRO de esta celda y no en una columna
                      nueva: la tabla ya tiene siete y una octava se escondería
                      en móvil igual que estas. Y aquí explica el hueco, porque
                      "Sin sede" en un remoto no es un dato que falte. */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span>
                      {col.sedeNombres?.length
                        ? col.sedeNombres.join(' · ')
                        : <span className="text-gray-400">Sin sede</span>}
                    </span>
                    {col.activo && normalizarModalidad(col.modalidad) !== 'PRESENCIAL' && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${TONO_CHIP[TONO_MODALIDAD[normalizarModalidad(col.modalidad)]]}`}>
                        {ETIQUETA_MODALIDAD[normalizarModalidad(col.modalidad)]}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted hidden lg:table-cell">{col.cargo || '-'}</td>
                <td className="px-4 py-3 text-right text-ink hidden sm:table-cell">{fmt(col.salarioMensual)}</td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => navigate(`/app/colaboradores/${col.id}`)} title={col.activo ? 'Ver detalle' : 'Ver historial'} className="p-1.5 text-muted hover:bg-primary/30 hover:text-ink rounded-lg"><Eye size={15} /></button>
                    {col.activo ? (
                      <>
                        <button onClick={() => abrir(lista.find(c => c.id === col.id))} title="Editar" className="p-1.5 text-muted hover:bg-primary/30 hover:text-ink rounded-lg"><Edit2 size={15} /></button>
                        <button onClick={() => setRetirando(lista.find(c => c.id === col.id) ?? null)} title="Registrar retiro" className="p-1.5 text-muted hover:bg-gray-100 hover:text-ink rounded-lg"><LogOut size={15} /></button>
                      </>
                    ) : (
                      <button onClick={() => setReingresando(col)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-ink border border-gray-300 hover:bg-gray-50 px-2.5 py-1.5 rounded-lg">
                        <Undo2 size={13} /> Reingresar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">
                {pestanaActiva === 'retirados' ? 'Nadie se ha retirado todavía' : 'Aún no hay colaboradores'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {reingresando && (
        <ModalReingreso
          persona={reingresando}
          plan={plan}
          onCerrar={() => setReingresando(null)}
          onListo={async () => { setReingresando(null); await recargarTodo(); recargarPlan(); }}
        />
      )}

      {retirando && (
        <ModalRetiro
          colaborador={retirando}
          onCerrar={() => setRetirando(null)}
          // Las dos listas se refrescan JUNTAS. Lanzándolas sueltas, React
          // pintaba en cuanto respondía la primera: la persona ya aparecía como
          // retirada y todavía seguía en la lista de activos, o sea dos veces.
          onListo={async () => { setRetirando(null); await recargarTodo(); recargarPlan(); }}
        />
      )}

      <Toast mensaje={toast} onClose={() => setToast(null)} />

      {modalImportar && (
        <ModalImportar
          plan={plan}
          onCerrar={() => setModalImportar(false)}
          onListo={async (creados) => {
            setModalImportar(false);
            await recargarTodo();
            recargarPlan();
            setToast(`Se ${creados === 1 ? 'creó 1 colaborador' : `crearon ${creados} colaboradores`}.`);
          }}
        />
      )}

      {/* Modal formulario */}
      {modal && (
        <div className="fixed inset-0 !mt-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-ink">{editando ? 'Editar colaborador' : 'Nuevo colaborador'}</h3>
              <button onClick={() => setModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={guardar} className="grid grid-cols-2 gap-4">
              {(['nombre', 'apellido', 'cedula', 'cargo', 'email', 'telefono'] as const).map(field => (
                <div key={field} className={field === 'email' ? 'col-span-2' : ''}>
                  <label className="block text-xs font-medium text-muted mb-1 capitalize">{field}</label>
                  <input value={form[field] as string} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    required={['nombre', 'apellido', 'cedula'].includes(field)} />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted mb-1">Fecha de nacimiento</label>
                <input type="date" value={(form.fechaNacimiento as string) || ''}
                  onChange={e => setForm(p => ({ ...p, fechaNacimiento: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted mb-1">Horario de trabajo</label>
                <select value={form.horarioId || ''} onChange={e => setForm(p => ({ ...p, horarioId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Sin horario (no controla llegadas tarde)</option>
                  {horarios.map(h => <option key={h.id} value={h.id}>{h.nombre} · {resumenFranjas(h.franjas)}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <SelectorModalidad valor={normalizarModalidad(form.modalidad)}
                  onChange={m => setForm(p => ({ ...p, modalidad: m }))} />
              </div>
              <div className="col-span-2">
                <SelectorSedes sedes={sedes} valor={(form.sedeIds as string[]) ?? []}
                  onChange={ids => setForm(p => ({ ...p, sedeIds: ids }))}
                  modalidad={normalizarModalidad(form.modalidad)} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted mb-1">Salario mensual (COP)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatearMiles(form.salarioMensual)}
                    onChange={e => setForm(p => ({ ...p, salarioMensual: parsearMiles(e.target.value) }))}
                    placeholder="1.750.000"
                    required
                    className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              {errorForm && <p className="col-span-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{errorForm}</p>}
              <div className="col-span-2 flex gap-3 justify-end mt-2">
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm text-muted border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={guardando} className="px-4 py-2 text-sm bg-primary text-ink font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-60">{guardando ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
