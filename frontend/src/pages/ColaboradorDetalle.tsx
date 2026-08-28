import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import {
  Edit2, Plus, X, CalendarOff, LogIn, LogOut, BadgeDollarSign, AlarmClock,
  ScanFace, Check, Trash2, ShieldCheck, FileText, Image as ImageIcon, Lock, Undo2,
} from 'lucide-react';
import api from '../lib/api';
import { formatearMiles, parsearMiles, resumenFranjas, type Franja } from './Colaboradores';
import CamaraRostro from '../components/CamaraRostro';
import ConfirmDialog from '../components/ConfirmDialog';
import SelectorSedes from '../components/SelectorSedes';
import Toast from '../components/Toast';
import CampoEvidencia, { type CambioEvidencia } from '../components/CampoEvidencia';
import PanelContratos from '../features/contratos/PanelContratos';
import VisorDocumento from '../components/VisorDocumento';
import { TIPO_PERMISO_LABEL } from '../constants/permisos';
import { ETIQUETA_MOTIVO } from '../features/colaboradores/motivos';
import ModalReingreso from '../features/colaboradores/ModalReingreso';
import CabeceraFicha from '../features/colaboradores/CabeceraFicha';
import LineaDeTiempo from '../components/LineaDeTiempo';
import { aspectoDeNovedad, rangoDeNovedad } from '../features/colaboradores/novedades';
import { tiempoRelativo } from '../features/colaboradores/tiempoRelativo';
import { aFotoDePerfil, miniaturaDe } from '../features/colaboradores/foto';
import { fechaLarga } from '../lib/fechas';
import { diasDeVinculacion, enPalabras } from '../features/colaboradores/tiempoVinculado';
import HistorialVinculacion, { type Evento as EventoVinculacion } from '../features/colaboradores/HistorialVinculacion';
import TabsFicha from '../features/colaboradores/TabsFicha';
import { useTabFicha } from '../features/colaboradores/useTabFicha';
import { useMiPlan } from '../lib/plan';

type Horario = { id: string; nombre: string; toleranciaMin: number; franjas: Franja[] };
type Colaborador = {
  id: string; nombre: string; apellido: string; cedula: string; cargo?: string;
  email?: string; telefono?: string; fechaNacimiento?: string | null; salarioMensual: number; activo: boolean;
  horarioId?: string | null; horario?: Horario | null; rostroEnroladoEn?: string | null; foto?: string | null;
  sedeIds?: string[];
  creadoEn?: string;
  fechaRetiro?: string | null; motivoRetiro?: string | null;
};
type Tardanzas = {
  sinHorario: boolean;
  detalle: { fecha: string; horaEsperada: string; horaLlegada: string; minutosTarde: number }[];
  totalMinutos: number; diasTarde: number;
};

const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}min` : `${m} min`);
type Registro = { id: string; fecha: string; entrada?: string; salida?: string; tipo: string; observacion?: string };
type Permiso = { id: string; fechaInicio: string; fechaFin: string; tipo: string; descripcion?: string; aprobado: boolean; evidenciaTipo?: string | null; evidenciaNombre?: string | null };
type Liquidacion = {
  liquidacion: { codigo: string; nombre: string; horas: number; recargo: number; esExtra: boolean; factorPagado: number; subtotal: number }[];
  salarioBase: number; totalRecargos: number; totalExtra: number; totalAdicional: number;
  totalPagar: number; jornadaSemanal: number; horasMes: number;
};

const cop = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

// Reexportado para no romper a Reportes/Marcador, que aún lo importan desde aquí.
// La definición vive en constants/permisos.ts (arriba se importa a este scope).
export { TIPO_PERMISO_LABEL };

const EMPTY_NOVEDAD = { tipo: 'VACACIONES', fechaInicio: '', fechaFin: '', descripcion: '', aprobado: true };

export default function ColaboradorDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { plan, recargar: recargarPlan } = useMiPlan();
  const [col, setCol] = useState<Colaborador | null>(null);
  // La historia vive aquí y no dentro del componente porque la tarjeta de
  // retiro necesita los mismos eventos para calcular cuánto estuvo. Pedirlos
  // dos veces sería pedir dos veces lo mismo.
  // Guarda de quién es, no solo qué es. Sin el id, una respuesta lenta de la
  // ficha anterior se pinta sobre la que se está viendo, y la tarjeta de
  // retiro le atribuye a esta persona la antigüedad de la otra.
  const [historia, setHistoria] = useState<{ id: string; eventos: EventoVinculacion[] | null; error: boolean }>(
    { id: '', eventos: null, error: false });
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [liq, setLiq] = useState<Liquidacion | null>(null);
  const [tardanzas, setTardanzas] = useState<Tardanzas | null>(null);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [sedes, setSedes] = useState<{ id: string; nombre: string }[]>([]);

  const [modalEditar, setModalEditar] = useState(false);
  const [formEdit, setFormEdit] = useState<any>(null);
  const [modalNovedad, setModalNovedad] = useState(false);
  const [novedad, setNovedad] = useState(EMPTY_NOVEDAD);
  const [errorNovedad, setErrorNovedad] = useState('');
  const [guardandoNovedad, setGuardandoNovedad] = useState(false);
  const [verNovedad, setVerNovedad] = useState<Permiso | null>(null);
  const [editandoNovedad, setEditandoNovedad] = useState<Permiso | null>(null);
  const [aprobando, setAprobando] = useState(false);
  const [cambioEvidencia, setCambioEvidencia] = useState<CambioEvidencia>({ tipo: 'sin-cambio' });
  const [evidenciaVer, setEvidenciaVer] = useState<{ data: string; tipo: string; nombre?: string | null } | null>(null);
  const [cargandoEvidencia, setCargandoEvidencia] = useState(false);

  const [consentimientoRostro, setConsentimientoRostro] = useState(false);
  const [usaGafas, setUsaGafas] = useState(false);
  const [modalCamara, setModalCamara] = useState(false);
  const [guardandoRostro, setGuardandoRostro] = useState(false);
  const [errorRostro, setErrorRostro] = useState('');
  const [confirmarEliminarRostro, setConfirmarEliminarRostro] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const hace30 = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const [guardandoFoto, setGuardandoFoto] = useState(false);

  const cargarHistoria = useCallback(() => {
    if (!id) return;
    api.get(`/colaboradores/${id}/vinculacion`)
      .then(r => setHistoria({ id, eventos: r.data, error: false }))
      .catch(() => setHistoria({ id, eventos: null, error: true }));
  }, [id]);

  const cargar = useCallback(() => {
    if (!id) return;
    api.get(`/colaboradores/${id}`).then(r => setCol(r.data));
    cargarHistoria();
    api.get('/registros', { params: { colaboradorId: id, desde: iso(hace30), hasta: iso(hoy) } }).then(r => setRegistros(r.data));
    api.get('/permisos', { params: { colaboradorId: id } }).then(r => setPermisos(r.data));
    api.get('/reportes/liquidacion', { params: { colaboradorId: id, desde: iso(inicioMes), hasta: iso(hoy) } }).then(r => setLiq(r.data));
    api.get('/reportes/tardanzas', { params: { colaboradorId: id, desde: iso(inicioMes), hasta: iso(hoy) } }).then(r => setTardanzas(r.data));
    api.get('/horarios').then(r => setHorarios(r.data));
    api.get('/sedes').then(r => setSedes(r.data)).catch(() => setSedes([]));
  }, [id, cargarHistoria]);
  useEffect(() => { cargar(); }, [cargar]);

  // Van después de `cargar` porque lo llaman: definirlas antes deja una
  // referencia hacia adelante que el compilador de React no puede memoizar.
  //
  // La foto se recorta en el navegador antes de subirla. Una foto de celular
  // sin tocar son varios megabytes dentro de la fila del colaborador.
  const cambiarFoto = async (archivo: File) => {
    setGuardandoFoto(true);
    try {
      const { foto, mini } = await aFotoDePerfil(archivo);
      await api.put(`/colaboradores/${id}/foto`, { foto, fotoMini: mini });
      setToast('Foto actualizada');
      cargar();
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setToast(e.response?.data?.error ?? e.message ?? 'No pudimos guardar la foto');
    } finally { setGuardandoFoto(false); }
  };

  const quitarFoto = async () => {
    setGuardandoFoto(true);
    try {
      await api.delete(`/colaboradores/${id}/foto`);
      setToast('Foto quitada');
      cargar();
    } catch {
      setToast('No pudimos quitar la foto');
    } finally { setGuardandoFoto(false); }
  };

  const suHistoria = historia.id === id ? historia : { eventos: null, error: false };

  // Se suman las etapas reales de vinculación, no el lapso de punta a punta.
  // Quien entró en 2022, se fue, y volvió en 2026 trabajó dos meses, no cuatro
  // años, y la historia que está en el tab de al lado lo deja en evidencia.
  const duracion = suHistoria.eventos ? enPalabras(diasDeVinculacion(suHistoria.eventos, hoy)) : '—';

  // Sirve para cualquier documento pedido por su ruta: el soporte de un evento
  // de vinculación, y lo que venga después.
  const verDocumento = async (url: string, nombre: string | null) => {
    try {
      const r = await api.get(url);
      setEvidenciaVer({ data: r.data.documento, tipo: r.data.documentoTipo, nombre: r.data.documentoNombre ?? nombre });
    } catch {
      setToast('No pudimos abrir el documento.');
    }
  };

  const [confirmandoReingreso, setConfirmandoReingreso] = useState(false);

  // El tab abierto vive en la direccion, no solo en el estado: asi se puede
  // compartir un enlace directo a los contratos de alguien, y el boton de
  // atras del navegador devuelve al tab anterior en vez de salir de la ficha.
  const [tab, cambiarTab] = useTabFicha();

  const guardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.put(`/colaboradores/${id}`, { ...formEdit, horarioId: formEdit.horarioId || null, sedeIds: formEdit.sedeIds ?? [] });
    setModalEditar(false);
    cargar();
  };

  const guardarNovedad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novedad.fechaFin < novedad.fechaInicio) {
      setErrorNovedad('La fecha "Hasta" no puede ser anterior a "Desde".');
      return;
    }
    setGuardandoNovedad(true);
    setErrorNovedad('');
    try {
      const datos: any = {
        ...novedad,
        colaboradorId: id,
        // Medianoche de Bogotá (Colombia siempre es UTC-5, sin horario de verano):
        // evita que la fecha se corra un día por zona horaria.
        fechaInicio: new Date(`${novedad.fechaInicio}T00:00:00-05:00`),
        fechaFin: new Date(`${novedad.fechaFin}T00:00:00-05:00`),
      };
      if (cambioEvidencia.tipo === 'nuevo') {
        datos.evidencia = cambioEvidencia.evidencia.data;
        datos.evidenciaNombre = cambioEvidencia.evidencia.nombre;
      } else if (cambioEvidencia.tipo === 'quitar') {
        datos.evidencia = null;
      }
      if (editandoNovedad) await api.put(`/permisos/${editandoNovedad.id}`, datos);
      else await api.post('/permisos', datos);
      setModalNovedad(false);
      setNovedad(EMPTY_NOVEDAD);
      setEditandoNovedad(null);
      setToast(editandoNovedad ? 'Novedad actualizada' : 'Novedad registrada');
      cargar();
    } catch (err: any) {
      setErrorNovedad(err.response?.data?.error ?? 'No pudimos guardar la novedad. Intenta de nuevo.');
    } finally {
      setGuardandoNovedad(false);
    }
  };

  // La primera toma del escaneo viaja como foto de perfil. El servidor solo la
  // usa si la ficha no tiene una todavía, así que volver a enrolar no le pisa
  // la foto a quien ya eligió otra.
  const capturarRostro = async (descriptores: number[][], foto: string) => {
    setGuardandoRostro(true);
    setErrorRostro('');
    try {
      // La miniatura se saca aquí y no en el servidor: el navegador ya tiene la
      // imagen y un canvas, y el servidor tendría que traerse una librería
      // entera para hacer lo mismo.
      const fotoMini = await miniaturaDe(foto).catch(() => null);
      await api.post(`/colaboradores/${id}/rostro`, { descriptores, foto, fotoMini });
      setModalCamara(false);
      setConsentimientoRostro(false);
      setToast('Rostro registrado con éxito');
      cargar();
    } catch (err: any) {
      setErrorRostro(err.response?.data?.error ?? 'No pudimos guardar el registro facial');
    } finally {
      setGuardandoRostro(false);
    }
  };

  const eliminarRostro = async () => {
    await api.delete(`/colaboradores/${id}/rostro`);
    setConfirmarEliminarRostro(false);
    setToast('Registro facial eliminado');
    cargar();
  };

  // Borrar una novedad. El endpoint existía desde siempre; lo que faltaba era
  // poder llamarlo: una novedad se podía crear y aprobar, pero no quitar. Y las
  // que quedaron huérfanas de una marcación borrada no había forma de limpiarlas.
  const [porBorrarNovedad, setPorBorrarNovedad] = useState<Permiso | null>(null);
  const [borrandoNovedad, setBorrandoNovedad] = useState(false);

  const eliminarNovedad = async () => {
    if (!porBorrarNovedad) return;
    setBorrandoNovedad(true);
    try {
      await api.delete(`/permisos/${porBorrarNovedad.id}`);
      setPorBorrarNovedad(null);
      setVerNovedad(null);
      setToast('Novedad eliminada');
      cargar();
    } catch {
      setToast('No pudimos eliminar la novedad');
    } finally {
      setBorrandoNovedad(false);
    }
  };

  const aprobarNovedad = async () => {
    if (!verNovedad) return;
    setAprobando(true);
    try {
      await api.put(`/permisos/${verNovedad.id}`, { aprobado: true });
      setVerNovedad(null);
      setToast('Novedad aprobada');
      cargar();
    } catch {
      setToast('No pudimos aprobar la novedad');
    } finally {
      setAprobando(false);
    }
  };

  // Abre el formulario de novedad pre-llenado para editar una existente
  const editarNovedad = (p: Permiso) => {
    const aFecha = (iso: string) => format(toZonedTime(new Date(iso), 'America/Bogota'), 'yyyy-MM-dd');
    setEditandoNovedad(p);
    setNovedad({
      tipo: p.tipo,
      fechaInicio: aFecha(p.fechaInicio),
      fechaFin: aFecha(p.fechaFin),
      descripcion: p.descripcion ?? '',
      aprobado: p.aprobado,
    });
    setCambioEvidencia({ tipo: 'sin-cambio' });
    setErrorNovedad('');
    setVerNovedad(null);
    setModalNovedad(true);
  };

  // Trae la evidencia (base64) de una novedad para verla/descargarla
  const verEvidencia = async (permisoId: string) => {
    setCargandoEvidencia(true);
    try {
      const r = await api.get(`/permisos/${permisoId}/evidencia`);
      setEvidenciaVer({ data: r.data.evidencia, tipo: r.data.evidenciaTipo, nombre: r.data.evidenciaNombre });
    } catch {
      setToast('No pudimos abrir la evidencia');
    } finally {
      setCargandoEvidencia(false);
    }
  };

  if (!col) return <div className="p-8 text-muted">Cargando...</div>;

  // Kardex: registros y novedades entrelazados por fecha, más reciente primero
  const kardex = [
    ...registros.map(r => ({ fecha: r.entrada ?? r.fecha, tipo: 'REGISTRO' as const, registro: r, permiso: undefined as Permiso | undefined })),
    ...permisos.map(p => ({ fecha: p.fechaInicio, tipo: 'NOVEDAD' as const, registro: undefined as Registro | undefined, permiso: p })),
  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 25);

  const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <div className="p-6 md:p-8 space-y-6">
      <CabeceraFicha
        persona={{
          nombre: col.nombre, apellido: col.apellido, cargo: col.cargo,
          cedula: col.cedula, salarioMensual: col.salarioMensual,
          creadoEn: col.creadoEn, activo: col.activo, foto: col.foto,
        }}
        onArchivoFoto={cambiarFoto}
        onQuitarFoto={quitarFoto}
        guardandoFoto={guardandoFoto}
        onVolver={() => navigate('/app/colaboradores')}
        onEditar={() => {
          setFormEdit({
            nombre: col.nombre, apellido: col.apellido, cedula: col.cedula,
            cargo: col.cargo || '', email: col.email || '', telefono: col.telefono || '',
            fechaNacimiento: col.fechaNacimiento ? new Date(col.fechaNacimiento).toISOString().slice(0, 10) : '',
            salarioMensual: col.salarioMensual, horarioId: col.horarioId || '',
            sedeIds: col.sedeIds ?? [],
          });
          setModalEditar(true);
        }}
      />

      {/* Constancia del retiro.
          Va arriba de todo y no en una pestaña porque es lo primero que hay que
          saber al abrir esta ficha: lo que se vea más abajo (horas, novedades,
          contratos) es historia, no la operación de hoy. */}
      {!col.activo && (
        <div className="bg-white rounded-card border border-gray-200 p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="font-semibold text-ink flex items-center gap-2 mb-1"><LogOut size={16} /> Ya no trabaja aquí</p>
              <p className="text-sm text-muted">
                Todo lo que ves abajo es su historial y se conserva completo. No cuenta para el cupo de tu plan
                ni aparece en reportes ni en el kiosco.
              </p>
            </div>
            <button onClick={() => setConfirmandoReingreso(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-ink border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg shrink-0">
              <Undo2 size={13} /> Reingresar
            </button>
          </div>

          <div className="bg-gray-50 rounded-xl px-4 py-3 grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-x-4 gap-y-3 mt-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Último día</p>
              <p className="text-sm font-semibold text-ink">
                {col.fechaRetiro ? fechaLarga(col.fechaRetiro) : 'Sin registrar'}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Motivo</p>
              <p className="text-sm font-semibold text-ink">
                {col.motivoRetiro ? (ETIQUETA_MOTIVO[col.motivoRetiro] ?? col.motivoRetiro) : 'Sin registrar'}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Alcanzó a estar</p>
              <p className="text-sm font-semibold text-ink">{duracion}</p>
            </div>
          </div>

          <p className="text-[11px] text-muted mt-3">
            El soporte de esta salida y las anteriores están en su historia, más abajo.
          </p>
        </div>
      )}

      <TabsFicha activo={tab} onCambiar={cambiarTab} contadores={{
        contratos: undefined, novedades: permisos.length || undefined,
      }} />

      {tab === 'resumen' && (<>
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Datos */}
        {/* Editar vive solo en la cabecera. Dos botones que abren el mismo
            formulario obligan a decidir cuál usar, y no hay diferencia. */}
        <div className="bg-white rounded-card border border-gray-200 p-5 flex flex-col">
          <p className="font-semibold text-ink mb-3">Datos</p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-2"><dt className="text-muted">Cédula</dt><dd className="text-ink font-medium">{col.cedula}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">Email</dt><dd className="text-ink font-medium truncate">{col.email || '—'}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">Teléfono</dt><dd className="text-ink font-medium">{col.telefono || '—'}</dd></div>
            {/* El nombre arriba y las franjas debajo, en gris más pequeño. En
                una sola línea el valor se partía por la mitad y quedaba dentado. */}
            <div className="flex justify-between gap-3">
              <dt className="text-muted shrink-0">Horario</dt>
              <dd className="text-right min-w-0">
                {col.horario ? (
                  <>
                    <span className="block text-ink font-medium truncate">{col.horario.nombre}</span>
                    <span className="block text-xs text-muted">{resumenFranjas(col.horario.franjas)}</span>
                  </>
                ) : <span className="text-ink font-medium">Sin asignar</span>}
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-t border-gray-100 pt-2"><dt className="text-muted">Salario</dt><dd className="text-ink font-bold">{cop(col.salarioMensual)}</dd></div>
          </dl>
        </div>

        {/* Resumen del mes: adicional al salario (recargos + extras) */}
        <div className="bg-white rounded-card border border-gray-200 p-5 flex flex-col">
          <p className="font-semibold text-ink mb-1 flex items-center gap-2"><BadgeDollarSign size={16} /> Adicional al salario · este mes</p>
          <p className="text-xs text-muted mb-3">Recargos y horas extra que se pagan además del salario base</p>
          {liq && liq.liquidacion.length > 0 ? (
            <>
              <div className="space-y-1.5 text-sm max-h-36 overflow-y-auto">
                {liq.liquidacion.map(l => (
                  <div key={l.codigo} className="flex justify-between gap-2">
                    <span className="text-muted">{l.codigo} · {l.horas}h{l.esExtra ? ' · extra' : ''}</span>
                    <span className="text-ink font-medium">{l.factorPagado === 0 ? <span className="text-xs text-muted">en salario</span> : cop(l.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
                <span className="font-semibold text-ink">Total adicional</span>
                <span className="font-bold text-ink">{cop(liq.totalAdicional)}</span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center">
              <p className="text-sm text-muted">Sin horas registradas este mes.</p>
            </div>
          )}
        </div>

        {/* Llegadas tarde del mes */}
        <div className="bg-white rounded-card border border-gray-200 p-5 flex flex-col">
          <p className="font-semibold text-ink mb-3 flex items-center gap-2">
            <AlarmClock size={16} className={tardanzas && tardanzas.diasTarde > 0 ? 'text-orange-500' : 'text-green-600'} /> Llegadas tarde
          </p>
          {!tardanzas || tardanzas.sinHorario ? (
            <div className="flex-1 flex items-center">
              <p className="text-sm text-muted">Asigna un horario para controlar las llegadas tarde.</p>
            </div>
          ) : tardanzas.diasTarde === 0 ? (
            <div className="flex-1 flex items-center gap-2 text-green-700">
              <Check size={16} className="shrink-0" />
              <p className="text-sm">Sin llegadas tarde este mes</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-orange-700 font-semibold mb-2">
                {tardanzas.diasTarde} día{tardanzas.diasTarde === 1 ? '' : 's'} · {fmtMin(tardanzas.totalMinutos)} en total
              </p>
              <div className="space-y-1 max-h-28 overflow-y-auto text-xs">
                {tardanzas.detalle.map(t => (
                  <div key={t.fecha} className="flex justify-between text-muted">
                    <span>{format(new Date(t.fecha + 'T12:00:00'), 'd MMM', { locale: es })} · llegó {t.horaLlegada}</span>
                    <span className="text-orange-600 font-medium">{fmtMin(t.minutosTarde)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Reconocimiento facial */}
        <div className="bg-white rounded-card border border-gray-200 p-5 flex flex-col lg:col-span-2">
          <p className="font-semibold text-ink mb-1 flex items-center gap-2"><ScanFace size={16} /> Reconocimiento facial</p>
          {col.rostroEnroladoEn ? (
            <>
              {/* La tarjeta ocupa todo el ancho, así que el botón no se estira:
                  un "Actualizar" de 900px no se lee como un botón. El estado a
                  la izquierda y las acciones a la derecha, como cualquier fila. */}
              <div className="flex flex-col items-start gap-3 mt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-x-4">
                <p className="text-xs text-green-700 flex items-center gap-1.5 min-w-0">
                  <Check size={14} className="shrink-0" />
                  <span>Registrado el {format(new Date(col.rostroEnroladoEn), "d 'de' MMMM 'de' yyyy", { locale: es })}. Ya puede marcar con su rostro en el kiosco.</span>
                </p>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setModalCamara(true)}
                    className="border-2 border-gray-200 hover:border-primary text-ink font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-2">
                    <ScanFace size={16} /> Actualizar
                  </button>
                  <button onClick={() => setConfirmarEliminarRostro(true)}
                    className="px-3 py-2 rounded-xl text-red-500 border-2 border-transparent hover:border-red-100 hover:bg-red-50"
                    title="Eliminar registro" aria-label="Eliminar registro de rostro">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-muted mb-3 flex-1">Registra su rostro para que marque en el kiosco sin digitar la cédula. La captura es guiada (frente y perfiles). Del rostro se guarda un cálculo matemático, no una imagen: ese cálculo no se puede volver a convertir en una cara. La primera toma sí queda como foto de perfil, y se puede quitar desde el círculo de la foto.</p>
              <label className="flex items-start gap-2 text-xs text-muted mb-2 cursor-pointer">
                <input type="checkbox" checked={consentimientoRostro} onChange={e => setConsentimientoRostro(e.target.checked)} className="mt-0.5 rounded" />
                <span>El colaborador autoriza el tratamiento de su rostro como dato biométrico, conforme a la Ley 1581 de 2012 (Habeas Data).</span>
              </label>
              <label className="flex items-start gap-2 text-xs text-muted mb-3 cursor-pointer">
                <input type="checkbox" checked={usaGafas} onChange={e => setUsaGafas(e.target.checked)} className="mt-0.5 rounded" />
                <span>Usa gafas habitualmente (se hará una toma adicional sin gafas para reconocerlo en ambos casos).</span>
              </label>
              <button onClick={() => setModalCamara(true)} disabled={!consentimientoRostro}
                className="w-full sm:w-auto sm:px-6 bg-primary hover:bg-primary-dark text-ink font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                <ScanFace size={16} /> Registrar rostro
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modal cámara: enrolar/actualizar rostro */}
      {modalCamara && (
        <div className="fixed inset-0 !mt-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !guardandoRostro && setModalCamara(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-ink flex items-center gap-2"><ShieldCheck size={18} /> Registrar rostro</h3>
              <button onClick={() => setModalCamara(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <CamaraRostro modo="enrolar" pasoGafas={usaGafas} onCapturado={capturarRostro} />
            {errorRostro && <p className="text-red-600 text-sm text-center mt-3">{errorRostro}</p>}
            {guardandoRostro && <p className="text-muted text-sm text-center mt-3">Guardando...</p>}
          </div>
        </div>
      )}

      <ConfirmDialog
        abierto={porBorrarNovedad !== null}
        peligro
        titulo="¿Eliminar esta novedad?"
        // Si estaba aprobada, sus días dejaban de exigirse: quitarla los vuelve a
        // exigir y cambia la liquidación. Eso se dice antes, no se descubre en la
        // nómina del mes.
        subtitulo={porBorrarNovedad?.aprobado
          ? 'Estaba APROBADA, así que sus días no se exigían. Al eliminarla vuelven a contar como ausencia y la liquidación cambia. No se puede deshacer.'
          : 'Esta acción no se puede deshacer.'}
        textoContinuar={borrandoNovedad ? 'Eliminando...' : 'Sí, eliminar'}
        onContinuar={eliminarNovedad}
        onCancelar={() => setPorBorrarNovedad(null)}
      />

      <ConfirmDialog
        abierto={confirmarEliminarRostro}
        peligro
        titulo="¿Eliminar registro facial?"
        subtitulo={`${col.nombre} ya no podrá marcar con reconocimiento facial hasta que se registre de nuevo.`}
        textoContinuar="Sí, eliminar"
        onContinuar={eliminarRostro}
        onCancelar={() => setConfirmarEliminarRostro(false)}
      />

      <Toast mensaje={toast} onClose={() => setToast(null)} />

      {/* `[&>*]:min-w-0`: por defecto un hijo de rejilla no baja de su ancho
          mínimo de contenido, así que una línea larga de aquí dentro estiraba la
          columna entera y en el celular los dos paneles salían cortados por la
          derecha. Va en la rejilla y no en cada panel para que valga también
          para lo que se agregue después. */}
      </>)}

      {tab === 'contratos' && <PanelContratos colaboradorId={col.id} />}

      {tab === 'historia' && (
        <HistorialVinculacion key={col.id} eventos={suHistoria.eventos} error={suHistoria.error}
          onVerDocumento={verDocumento} onReintentar={cargarHistoria} />
      )}

      <div className={`grid gap-4 [&>*]:min-w-0 ${tab === 'novedades' || tab === 'asistencia' ? '' : 'hidden'}`}>
        {tab === 'novedades' && (<>
        {/* Novedades: vacaciones, incapacidades, licencias, permisos.
            Misma línea de tiempo que la historia de vinculación: son la misma
            forma de leer (qué pasó, cuándo, con qué soporte), así que comparten
            componente en vez de tener dos diseños que se parecen. */}
        <div className="bg-white rounded-card border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-ink flex items-center gap-2"><CalendarOff size={16} /> Novedades</p>
              <p className="text-xs text-muted mt-1">
                Vacaciones, incapacidades, licencias y permisos. Los días con novedad no
                cuentan como ausencia.
              </p>
            </div>
            <button onClick={() => { setErrorNovedad(''); setEditandoNovedad(null); setNovedad(EMPTY_NOVEDAD); setCambioEvidencia({ tipo: 'sin-cambio' }); setModalNovedad(true); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-ink bg-primary hover:bg-primary-dark px-2.5 py-1.5 rounded-lg shrink-0">
              <Plus size={13} /> Agregar
            </button>
          </div>

          {permisos.length === 0 ? (
            <p className="text-sm text-muted px-5 py-6">Sin novedades registradas.</p>
          ) : (
            <LineaDeTiempo
              sustantivo={{ singular: 'novedad', plural: 'novedades' }}
              hitos={permisos.map(p => {
                const a = aspectoDeNovedad(p.tipo, p.aprobado);
                return {
                  id: p.id,
                  icono: a.icono,
                  tono: a.tono,
                  insignia: a.insignia,
                  titulo: TIPO_PERMISO_LABEL[p.tipo] ?? p.tipo,
                  detalle: rangoDeNovedad(p.fechaInicio, p.fechaFin),
                  nota: p.descripcion || null,
                  adjunto: p.evidenciaTipo
                    ? { nombre: p.evidenciaNombre || 'Evidencia', tipo: p.evidenciaTipo, onAbrir: () => verEvidencia(p.id) }
                    : null,
                  rotulo: tiempoRelativo(new Date(p.fechaInicio), new Date()),
                  onAbrir: () => setVerNovedad(p),
                };
              })}
            />
          )}
        </div>

        </>)}

        {tab === 'asistencia' && (
        <div className="bg-white rounded-card border border-gray-200 p-5">
          <p className="font-semibold text-ink mb-3">Kardex — últimos 30 días</p>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {kardex.length === 0 && <p className="text-sm text-muted">Sin movimientos recientes.</p>}
            {kardex.map((m, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                {m.tipo === 'REGISTRO' ? (
                  <>
                    <span className={`p-1.5 rounded-lg ${m.registro!.salida ? 'bg-gray-100 text-muted' : 'bg-green-100 text-green-700'}`}>
                      {m.registro!.salida ? <LogOut size={14} /> : <LogIn size={14} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink font-medium capitalize">
                        {format(new Date(m.fecha), "EEE d 'de' MMMM", { locale: es })}
                        {m.registro!.tipo === 'FESTIVO' && <span className="ml-1.5 text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">FESTIVO</span>}
                      </p>
                      <p className="text-xs text-muted">
                        {m.registro!.entrada ? `Entrada ${format(new Date(m.registro!.entrada), 'HH:mm')}` : ''}
                        {m.registro!.salida ? ` · Salida ${format(new Date(m.registro!.salida), 'HH:mm')}` : ' · turno abierto'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="p-1.5 rounded-lg bg-primary/40 text-ink"><CalendarOff size={14} /></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink font-medium">{TIPO_PERMISO_LABEL[m.permiso!.tipo] ?? m.permiso!.tipo}</p>
                      <p className="text-xs text-muted">
                        {format(new Date(m.permiso!.fechaInicio), 'd MMM', { locale: es })} → {format(new Date(m.permiso!.fechaFin), 'd MMM', { locale: es })}
                      </p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        )}
      </div>

      {/* Modal editar datos */}
      {modalEditar && formEdit && (
        <div className="fixed inset-0 !mt-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-ink">Editar datos</h3>
              <button onClick={() => setModalEditar(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={guardarEdicion} className="grid grid-cols-2 gap-4">
              {(['nombre', 'apellido', 'cedula', 'cargo', 'email', 'telefono'] as const).map(field => (
                <div key={field} className={field === 'email' ? 'col-span-2' : ''}>
                  <label className="block text-xs font-medium text-muted mb-1 capitalize">{field}</label>
                  <input value={formEdit[field]} onChange={e => setFormEdit((p: any) => ({ ...p, [field]: e.target.value }))}
                    className={input} required={['nombre', 'apellido', 'cedula'].includes(field)} />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted mb-1">Fecha de nacimiento</label>
                <input type="date" value={formEdit.fechaNacimiento || ''}
                  onChange={e => setFormEdit((p: any) => ({ ...p, fechaNacimiento: e.target.value }))} className={input} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted mb-1">Horario de trabajo</label>
                <select value={formEdit.horarioId || ''} onChange={e => setFormEdit((p: any) => ({ ...p, horarioId: e.target.value }))} className={input}>
                  <option value="">Sin horario (no controla llegadas tarde)</option>
                  {horarios.map(h => <option key={h.id} value={h.id}>{h.nombre} · {resumenFranjas(h.franjas)}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <SelectorSedes sedes={sedes} valor={formEdit.sedeIds ?? []}
                  onChange={ids => setFormEdit((p: object) => ({ ...p, sedeIds: ids }))} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted mb-1">Salario mensual (COP)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                  <input type="text" inputMode="numeric" value={formatearMiles(formEdit.salarioMensual)}
                    onChange={e => setFormEdit((p: any) => ({ ...p, salarioMensual: parsearMiles(e.target.value) }))}
                    className={`${input} pl-7`} required />
                </div>
              </div>
              <div className="col-span-2 flex gap-3 justify-end mt-2">
                <button type="button" onClick={() => setModalEditar(false)} className="px-4 py-2 text-sm text-muted border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm bg-primary text-ink font-semibold rounded-lg hover:bg-primary-dark">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal nueva novedad */}
      {modalNovedad && (
        <div className="fixed inset-0 !mt-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-ink">{editandoNovedad ? 'Editar novedad' : 'Nueva novedad'}</h3>
              <button onClick={() => { setModalNovedad(false); setEditandoNovedad(null); }}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={guardarNovedad} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Tipo</label>
                <select value={novedad.tipo} onChange={e => setNovedad(p => ({ ...p, tipo: e.target.value }))} className={input}>
                  {Object.entries(TIPO_PERMISO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Desde</label>
                  <input type="date" value={novedad.fechaInicio} onChange={e => setNovedad(p => ({ ...p, fechaInicio: e.target.value }))} required className={input} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Hasta</label>
                  <input type="date" value={novedad.fechaFin} onChange={e => setNovedad(p => ({ ...p, fechaFin: e.target.value }))} required className={input} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Descripción (opcional)</label>
                <input value={novedad.descripcion} onChange={e => setNovedad(p => ({ ...p, descripcion: e.target.value }))} className={input} placeholder="Ej: vacaciones anuales" />
              </div>
              {(!plan || plan.features.evidencia) ? (
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Evidencia (opcional)</label>
                  <CampoEvidencia
                    existente={editandoNovedad?.evidenciaTipo ? { tipo: editandoNovedad.evidenciaTipo, nombre: editandoNovedad.evidenciaNombre } : null}
                    onCambio={setCambioEvidencia}
                  />
                </div>
              ) : (
                <button type="button" onClick={() => navigate('/app/configuracion?tab=suscripcion')}
                  className="w-full flex items-center gap-3 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-left hover:bg-gray-50">
                  <Lock size={16} className="text-muted shrink-0" />
                  <span className="flex-1 text-sm text-muted">¿Quieres adjuntar <b className="text-ink">evidencia</b> (incapacidad, permiso)? Cambia al plan <b className="text-ink">Profesional</b> o <b className="text-ink">Empresarial</b>.</span>
                  <span className="text-xs font-semibold text-ink bg-primary/40 px-2.5 py-1 rounded-lg shrink-0">Subir de plan</span>
                </button>
              )}
              <label className="flex items-center gap-2 text-sm cursor-pointer text-ink">
                <input type="checkbox" checked={novedad.aprobado} onChange={e => setNovedad(p => ({ ...p, aprobado: e.target.checked }))} className="rounded" />
                Aprobada
              </label>
              {errorNovedad && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{errorNovedad}</p>}
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => { setModalNovedad(false); setEditandoNovedad(null); }} className="px-4 py-2 text-sm text-muted border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={guardandoNovedad} className="px-4 py-2 text-sm bg-primary text-ink font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-60">{guardandoNovedad ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detalle de novedad: ver descripción, fechas y aprobar si está pendiente */}
      {verNovedad && (
        <div className="fixed inset-0 !mt-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setVerNovedad(null)}>
          <div className="hp-pop bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-lg text-ink">{TIPO_PERMISO_LABEL[verNovedad.tipo] ?? verNovedad.tipo}</h3>
              <button onClick={() => setVerNovedad(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-4 ${verNovedad.aprobado ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
              {verNovedad.aprobado ? 'APROBADA' : 'PENDIENTE'}
            </span>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted">Fechas</p>
                <p className="text-ink font-medium">
                  {format(new Date(verNovedad.fechaInicio), "d 'de' MMMM yyyy", { locale: es })}
                  {' → '}{format(new Date(verNovedad.fechaFin), "d 'de' MMMM yyyy", { locale: es })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Descripción / motivo</p>
                <p className="text-ink whitespace-pre-wrap">{verNovedad.descripcion || <span className="text-muted">Sin descripción.</span>}</p>
              </div>
              {verNovedad.evidenciaTipo && (
                <div>
                  <p className="text-xs text-muted mb-1">Evidencia</p>
                  <button onClick={() => verEvidencia(verNovedad.id)} disabled={cargandoEvidencia}
                    className="flex items-center gap-2 text-sm font-medium text-primary-dark border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 disabled:opacity-60">
                    {verNovedad.evidenciaTipo === 'application/pdf' ? <FileText size={16} className="text-red-500" /> : <ImageIcon size={16} />}
                    {cargandoEvidencia ? 'Abriendo...' : (verNovedad.evidenciaNombre || 'Ver evidencia')}
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3 justify-end mt-6">
              <button onClick={() => setVerNovedad(null)} className="px-4 py-2 text-sm text-muted border border-gray-300 rounded-lg hover:bg-gray-50">Cerrar</button>
              <button onClick={() => editarNovedad(verNovedad)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 font-medium">
                <Edit2 size={15} /> Editar
              </button>
              <button onClick={() => setPorBorrarNovedad(verNovedad)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 font-medium">
                <Trash2 size={15} /> Eliminar
              </button>
              {!verNovedad.aprobado && (
                <button onClick={aprobarNovedad} disabled={aprobando}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg disabled:opacity-60">
                  <Check size={15} /> {aprobando ? 'Aprobando...' : 'Aprobar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Visor de evidencia (imagen inline o PDF) */}
      {confirmandoReingreso && col && (
        <ModalReingreso
          persona={col}
          plan={plan}
          onCerrar={() => setConfirmandoReingreso(false)}
          onListo={() => {
            setConfirmandoReingreso(false);
            cargar();
            recargarPlan();
            setToast('Reingresado. Vuelve a contar para el cupo de tu plan.');
          }}
        />
      )}

      {evidenciaVer && <VisorDocumento doc={evidenciaVer} onCerrar={() => setEvidenciaVer(null)} />}
    </div>
  );
}
