import { Fragment, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, ChevronRight, FileSignature, Laptop, FileSpreadsheet, History, ListFilter, ScanFace, ArrowLeftRight, Coffee,
  Clock, LogIn, CalendarDays, MousePointerSquareDashed, ShieldAlert, Tag, UserCheck, Smile,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import giraIzquierda from '../assets/rostro/gira-izquierda.svg';
import { IMAGEN_DE_CARITA } from '../features/clima/caritas';
import { debeMostrarNovedades, loteEsIneludible, vistaKey, apagadoKey, guiaKey } from './novedadesVisibles';
import { puntosVisibles } from './puntosDeNovedades';

// Novedades de la versión: se muestran UNA vez por usuario al entrar.
//
// Lo nuevo va PRIMERO y lo anterior se queda detrás: decisión del dueño del 14 de
// septiembre de 2026 (antes el lote se reemplazaba). Al agregar novedades hay que
// subir VERSION en novedadesVisibles.ts, o quien vio el lote anterior no ve lo
// nuevo. La decisión de mostrarlas y las llaves de localStorage viven en ese
// archivo, que sí tiene pruebas.

type Novedad = {
  icono: typeof FileSignature;
  titulo: string;
  texto: string;
  // A dónde lleva, para que la novedad no se quede en el anuncio.
  enlace?: { texto: string; a: string };
  // Vista previa: se arma con los mismos ladrillos del producto en vez de una
  // imagen, así no se desactualiza cuando la pantalla cambie.
  vista: React.ReactNode;
};

const Chip = ({ tono, children }: { tono: string; children: React.ReactNode }) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${tono}`}>{children}</span>
);

const NOVEDADES: Novedad[] = [
  // Lote del 4 de octubre de 2026: el clima laboral. Se le muestra a TODOS, también a quien apagó las
  // novedades (LOTE_INELUDIBLE en novedadesVisibles.ts, pedido del dueño).
  {
    icono: Smile,
    titulo: 'Mide cómo termina tu equipo cada jornada',
    // Lo confidencial se dice como es: el administrador la ve SIN nombre. No se escribe «anónimo», porque
    // el autor queda guardado cifrado (docs/CLIMA_LABORAL.md §3.4) y un texto para clientes no puede
    // prometer más de lo que pasa. El «esa» es a propósito: con un «que» detrás de coma, la frase se leía
    // como si también la observación con nombre llegara sin él (revisión del 4 de octubre de 2026). Y
    // el plan va dicho: la novedad le sale también a quien no lo tiene.
    //
    // CABE EN CINCO LÍNEAS y no en seis: con seis, el enlace de abajo queda cortado en la ventana de
    // escritorio. Medido en el navegador: cinco líneas en los 528 px del texto y todavía en 495, para que
    // otra letra (la de Windows no es la del Mac) no lo empuje a seis. Si se alarga, medirlo otra vez.
    texto: 'Al marcar su salida del día, el kiosco pregunta «¿Cómo te fue hoy?» con cinco caritas. Con Normal o peor, puede marcar qué pasó con tus motivos. Siempre puede dejar una observación con su nombre, o confidencial: esa la ves sin nombre y al día siguiente. En «Clima laboral» ves el ánimo y quién lleva tres caritas seguidas en Muy mal o Mal. Solo en el plan Empresarial.',
    enlace: { texto: 'Abrir Clima laboral', a: '/app/clima' },
    // La ventana del kiosco en chiquito, con sus caritas de verdad, y debajo la fila del panel.
    vista: (
      <div className="w-full max-w-[250px] flex flex-col gap-1.5">
        <div className="rounded-2xl bg-ink p-2.5 text-center text-white shadow-sm">
          <p className="text-[9px] font-semibold text-green-400">Salida registrada · 5:02 p. m.</p>
          <p className="mt-0.5 text-[11px] font-bold">¿Cómo te fue hoy, Ana?</p>
          <div className="mt-1.5 flex justify-between px-1">
            {[1, 2, 3, 4, 5].map(v => (
              <img key={v} src={IMAGEN_DE_CARITA[v]} alt="" width={26} height={26}
                className={`h-[26px] w-[26px] rounded-full ${v === 2 ? 'ring-2 ring-white' : 'opacity-40'}`} />
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap justify-center gap-1">
            <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-medium text-ink">Mucho trabajo</span>
            <span className="rounded-full border border-white/20 px-2 py-0.5 text-[9px] text-white/80">Compañeros</span>
          </div>
        </div>
        <div className="rounded-lg bg-white/95 border border-gray-200 px-2.5 py-1.5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-ink">Necesitan atención</span>
            <span className="ml-auto shrink-0"><Chip tono="bg-orange-50 text-orange-800">1 persona</Chip></span>
          </div>
          <p className="mt-0.5 text-[9px] text-muted">Ana Giraldo · 3 respuestas negativas consecutivas</p>
        </div>
      </div>
    ),
  },

  // Lote del 3 de octubre de 2026: el kiosco confirma quién marca. UNA sola vista a propósito
  // (pedido del dueño): es un cambio de la misma pantalla, y repartido en cinco no se leería.
  {
    icono: UserCheck,
    titulo: 'El kiosco confirma quién marca antes de guardar',
    // La foto va condicionada a propósito: quien entra con la cédula, o tiene la ficha sin foto, ve
    // sus iniciales, y un texto para clientes no puede prometer lo que no siempre pasa.
    texto: 'Antes de marcar, el kiosco pregunta «¿Eres tú, Ana?» y muestra las marcas que la persona ya tiene hoy. Si entró con su rostro, ve además la foto de su ficha, o sus iniciales si no tiene. Para marcar hay que mantener presionado el botón un segundo: un toque por descuido ya no cuenta. Si algo no cuadra —por ejemplo, una salida a los pocos minutos de la entrada, o una cara que se parece poco a la registrada— lo avisa y pide sostenerlo dos segundos. Y quien no es, lo dice con «No soy Ana».',
    // La pantalla del kiosco en chiquito, con sus mismos colores y textos.
    vista: (
      <div className="w-full max-w-[230px] rounded-2xl bg-ink p-2.5 shadow-sm text-white">
        <p className="text-[12px] font-bold leading-tight">¿Eres tú, Ana?</p>
        <div className="mt-1 flex items-center gap-2 rounded-xl bg-black/25 px-2 py-1">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-[9px] font-bold text-ink">AG</span>
          <span className="text-[10px] font-semibold">Ana Giraldo</span>
        </div>
        <p className="mt-1.5 text-[9px] font-medium">Marcas de hoy</p>
        <p className="mt-1 rounded-full bg-green-500/15 py-1 text-center text-[9px] font-semibold text-green-400">
          Entrada registrada a las 7:02 a. m.
        </p>
        <p className="mt-1.5 rounded-full bg-orange-500 py-1.5 text-center text-[10px] font-bold">Soy Ana, registrar salida</p>
        <p className="mt-1 text-center text-[8px] text-[#74c15c]">Mantén presionado durante 1 segundo</p>
        <p className="mt-1 text-center text-[10px] font-semibold">No soy Ana</p>
      </div>
    ),
  },

  // Despliegue del 30 de septiembre de 2026: el módulo de turnos.
  {
    icono: CalendarDays,
    titulo: 'Programa los turnos de tu equipo en un calendario',
    texto: 'Arma tu catálogo de turnos —Mañana, Noche, el que uses— cada uno con su color, y repártelos en una rejilla de día, semana o mes. Cada persona lleva su total de horas de la semana y te avisa si se pasa de las 42. Está en el menú, bajo «Turnos».',
    enlace: { texto: 'Abrir el calendario de turnos', a: '/app/turnos' },
    vista: (
      <div className="w-full max-w-[260px] rounded-xl bg-white/95 border border-gray-200 shadow-sm p-2.5">
        <div className="grid grid-cols-[auto_repeat(4,1fr)] gap-1 text-[9px]">
          <span />
          {['L', 'M', 'M', 'J'].map((d, i) => (
            <span key={i} className="text-center font-semibold text-muted">{d}</span>
          ))}
          {[
            { n: 'Ana', t: [['Mañana', 'bg-emerald-200 text-emerald-900'], ['Mañana', 'bg-emerald-200 text-emerald-900'], ['Libre', 'bg-gray-100 text-gray-500'], ['Mañana', 'bg-emerald-200 text-emerald-900']] },
            { n: 'Luis', t: [['Noche', 'bg-sky-200 text-sky-900'], ['Noche', 'bg-sky-200 text-sky-900'], ['Noche', 'bg-sky-200 text-sky-900'], ['Libre', 'bg-gray-100 text-gray-500']] },
            { n: 'Sara', t: [['Tarde', 'bg-amber-200 text-amber-900'], ['Libre', 'bg-gray-100 text-gray-500'], ['Tarde', 'bg-amber-200 text-amber-900'], ['Tarde', 'bg-amber-200 text-amber-900']] },
          ].map(f => (
            <Fragment key={f.n}>
              <span className="pr-1 font-medium text-ink self-center">{f.n}</span>
              {f.t.map(([texto, clase], i) => (
                <span key={i} className={`rounded px-1 py-1 text-center font-semibold truncate ${clase}`}>{texto}</span>
              ))}
            </Fragment>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1.5 border-t border-gray-100 pt-1.5">
          <span className="text-[9px] text-muted">Ana</span>
          <span className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
            <span className="block h-full w-[78%] rounded-full bg-primary-dark" />
          </span>
          <span className="text-[9px] font-semibold text-ink tabular-nums">33 h / 42 h</span>
        </div>
      </div>
    ),
  },
  {
    icono: MousePointerSquareDashed,
    titulo: 'Marca un bloque de celdas y prográmalas de una',
    texto: 'Haz clic en una esquina y en la otra: todo lo que quede en medio se marca. Eliges el turno una vez y se escribe en todas. Antes de escribir nada te dice cuántas jornadas cambian, cuántas quedan igual y cuáles no se pueden tocar, y puedes cancelar ahí mismo.',
    enlace: { texto: 'Probarlo en el calendario', a: '/app/turnos' },
    vista: (
      <div className="w-full max-w-[250px] rounded-xl bg-white/95 border border-gray-200 shadow-sm p-3">
        <div className="grid grid-cols-4 gap-1">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className={`h-6 rounded ${i >= 1 && i <= 6 ? 'bg-[#fff7df] ring-2 ring-primary-dark' : 'bg-gray-100'}`} />
          ))}
        </div>
        <div className="mt-2 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[10px]">
          <p className="font-semibold text-ink">Se escriben 6 jornadas</p>
          <p className="text-muted">2 quedan igual · 1 no se puede tocar</p>
        </div>
      </div>
    ),
  },
  {
    icono: ShieldAlert,
    titulo: 'Te avisa antes de que una programación salga cara',
    texto: 'Antes de escribir revisa lo que vas a dejar: semanas que se pasan de las 42 horas, semanas que quedarían sin ningún día de descanso, y a quién le falta marcarle su día libre. Cada aviso dice a quién le pasa y de qué semana, y el que tiene arreglo te dice cuál es.',
    vista: (
      <div className="w-full max-w-[250px] flex flex-col gap-1.5">
        {[
          ['bg-rose-50 border-rose-200 text-rose-900', '1 semana sin ningún descanso'],
          ['bg-amber-50 border-amber-200 text-amber-900', '2 semanas por encima de 42 h'],
          ['bg-amber-50 border-amber-200 text-amber-900', 'Sin horario y sin descanso marcado'],
        ].map(([clase, texto]) => (
          <div key={texto} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-semibold ${clase}`}>
            <ShieldAlert size={11} className="shrink-0" /> {texto}
          </div>
        ))}
      </div>
    ),
  },
  {
    icono: Tag,
    titulo: 'El recargo ya no se llama «dominical»',
    texto: 'La ley cambió el nombre: lo que se paga con recargo es el día de DESCANSO OBLIGATORIO, que no siempre es el domingo. Quien trabaja los domingos y descansa el miércoles cobra el recargo por su miércoles, no por su domingo. En tus reportes verás «Descanso obligatorio o festivo» donde antes decía «Dominical».',
    enlace: { texto: 'Ver el reporte de nómina', a: '/app/reportes/nomina' },
    vista: (
      <div className="w-full max-w-[250px] rounded-xl bg-white/95 border border-gray-200 shadow-sm p-3 text-[10px]">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-1.5">
          <span className="text-gray-400 line-through">Dominical o festivo</span>
        </div>
        <div className="flex items-center gap-2 pt-1.5">
          <span className="font-semibold text-ink">Descanso obligatorio o festivo</span>
        </div>
        <div className="mt-2 rounded-lg bg-primary-light/60 px-2 py-1.5 text-[9px] text-ink">
          Miércoles trabajado · descansa ese día<br />
          <b>8 h con recargo</b>
        </div>
      </div>
    ),
  },

  // Despliegue del 14 de septiembre de 2026.
  {
    icono: ScanFace,
    titulo: 'Cada persona registra su rostro desde su celular',
    texto: 'Desde la ficha creas un enlace, copias el mensaje y se lo mandas por WhatsApp o por correo. Dura una hora: la persona confirma su cédula, lee la autorización y decide si registra su rostro o no. Lo que decida queda guardado con la fecha y el texto que leyó, y en la lista de colaboradores ves quién ya lo registró y quién no autorizó.',
    enlace: { texto: 'Crear un enlace desde una ficha', a: '/app/colaboradores' },
    vista: (
      <div className="w-full max-w-[250px] rounded-xl bg-white/95 border border-gray-200 shadow-sm p-3">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink mb-2">
          <ScanFace size={12} className="text-ink/70" /> Reconocimiento facial
        </p>
        <div className="flex flex-col gap-1.5">
          {[
            { n: 'Ana Giraldo', chip: 'Rostro registrado', tono: 'bg-green-100 text-green-800' },
            { n: 'Julián Torres', chip: 'No autorizó', tono: 'bg-gray-200 text-gray-700' },
          ].map(x => (
            <div key={x.n} className="flex items-center gap-2 rounded-lg bg-white border border-gray-200 px-2.5 py-1.5">
              <span className="text-[11px] text-ink font-medium truncate">{x.n}</span>
              <span className="ml-auto shrink-0"><Chip tono={x.tono}>{x.chip}</Chip></span>
            </div>
          ))}
        </div>
        <div className="mt-2 rounded-lg border-2 border-gray-200 px-2 py-1 text-center text-[10px] font-semibold text-ink">
          Crear enlace de registro facial
        </div>
      </div>
    ),
  },
  {
    icono: ArrowLeftRight,
    titulo: 'El registro del rostro te dice hacia dónde girar',
    texto: 'Cada paso muestra un dibujo de la pose, y en los giros una flecha sobre la cámara indica hacia dónde girar la cabeza. Ya no hay que adivinar qué es derecha o izquierda frente a una imagen que se ve como en un espejo.',
    vista: (
      <div className="flex items-center gap-3 w-full max-w-[250px]">
        <img src={giraIzquierda} alt="" width={88} height={99} className="w-[88px] h-[99px] shrink-0 rounded-lg shadow-sm" />
        <div className="flex flex-col items-start gap-1.5">
          <Chip tono="bg-green-100 text-green-700">Frente</Chip>
          <Chip tono="bg-white text-ink ring-2 ring-ink">Giro ←</Chip>
          <Chip tono="bg-white/80 text-muted">Giro →</Chip>
        </div>
      </div>
    ),
  },
  // Despliegue del 13 de septiembre de 2026.
  {
    icono: Coffee,
    titulo: 'Pon hasta tres descansos en cada horario',
    texto: 'Además del almuerzo, cada franja del horario puede tener hasta 3 descansos, cada uno con su hora de inicio y de fin. No se pagan: cuestan su tiempo aunque los tomen a otra hora, igual que el almuerzo. En el kiosco la persona marca «Salgo a mi descanso» y «Volví de mi descanso».',
    enlace: { texto: 'Configurar mi horario', a: '/app/configuracion?tab=horario' },
    vista: (
      <div className="w-full max-w-[250px] rounded-xl bg-white/95 border border-gray-200 shadow-sm p-3 text-[10px]">
        <p className="text-[9px] font-semibold uppercase text-muted mb-1">Lunes a viernes · 8:00 a 17:00</p>
        {[['Descanso 1', '09:30', '09:45'], ['Almuerzo', '12:00', '13:00'], ['Descanso 2', '15:30', '15:45']].map(([n, desde, hasta]) => (
          <div key={n} className="flex items-center gap-2 py-1 border-t border-gray-100">
            <Coffee size={11} className="text-ink/60 shrink-0" />
            <span className="text-ink font-medium">{n}</span>
            <span className="ml-auto font-mono text-gray-600">{desde}–{hasta}</span>
          </div>
        ))}
        <p className="text-[9px] font-semibold text-ink text-center border-t border-gray-100 mt-1 pt-1.5">+ Agregar descanso</p>
      </div>
    ),
  },
  {
    icono: Clock,
    titulo: 'Carga la jornada completa de un solo paso',
    texto: 'Con «Agregar manual» registras en una sola ventana la entrada, la salida, el almuerzo y hasta 3 descansos. El botón «Traer su horario» llena las horas con el horario de ese día, y tú solo corriges lo que cambió. La pausa que no marcó se deja vacía.',
    enlace: { texto: 'Ir a Registros', a: '/app/registros' },
    vista: (
      <div className="w-full max-w-[260px] rounded-xl bg-white/95 border border-gray-200 shadow-sm p-3 text-[10px]">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-[11px] font-semibold text-ink">Nuevo registro</p>
          <span className="flex items-center gap-1 bg-primary rounded-md px-2 py-0.5 text-[9px] font-semibold text-ink">
            <Clock size={10} /> Traer su horario
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          {[['Entrada', '08:00'], ['Salida', '17:00']].map(([rotulo, hora]) => (
            <div key={rotulo} className="rounded-md border border-gray-200 px-2 py-1">
              <p className="text-[8px] uppercase text-muted">{rotulo}</p>
              <p className="font-mono text-ink">{hora}</p>
            </div>
          ))}
        </div>
        <div className="rounded-lg bg-blue-50 px-2 py-1.5">
          {[['Almuerzo', '12:00', '13:00'], ['Descanso 1', '15:30', '15:45']].map(([n, salida, regreso]) => (
            <div key={n} className="flex items-center justify-between py-0.5">
              <span className="text-ink">{n}</span>
              <span className="font-mono text-gray-600">{salida}–{regreso}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icono: LogIn,
    titulo: 'El detalle de la jornada, parte por parte',
    texto: 'Al abrir una marcación ves a qué hora entró y si llegó tarde, a qué hora salió, sus pausas, y cuánto se contó ese día frente a lo que pedía su horario. Las fotos van separadas en entrada y salida, almuerzo y descanso. Y si la jornada sigue abierta, lo dice.',
    enlace: { texto: 'Ver las marcaciones', a: '/app/registros' },
    vista: (
      <div className="w-full max-w-[260px] flex flex-col gap-1.5 text-[10px]">
        <div className="grid grid-cols-3 gap-1.5">
          {[['Entró', '08:04', 'a tiempo'], ['Salió', '17:02', ''], ['Almuerzo', '58 min', '']].map(([rotulo, valor, nota]) => (
            <div key={rotulo} className="rounded-lg bg-white/95 border border-gray-200 px-2 py-1.5 shadow-sm">
              <p className="text-[8px] uppercase text-muted">{rotulo}</p>
              <p className="font-semibold text-ink tabular-nums">{valor}</p>
              {nota && <p className="text-[8px] text-green-700">{nota}</p>}
            </div>
          ))}
        </div>
        <div className="rounded-lg bg-white/95 border border-primary px-2.5 py-1.5 shadow-sm">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[8px] text-muted">Contado ese día</p>
              <p className="text-sm font-bold text-ink tabular-nums">7 h 55 min</p>
            </div>
            <p className="text-[9px] text-gray-600">el horario pedía 8 h</p>
          </div>
          <div className="h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
            <div className="h-full w-[98%] bg-primary rounded-full" />
          </div>
        </div>
      </div>
    ),
  },
  {
    icono: FileSignature,
    titulo: 'Tus contratos avisan antes de vencerse',
    texto: 'Un contrato a término fijo que no se preavisa con 30 días de anticipación se prorroga solo, por ley, por el mismo tiempo. HoraPro ahora lleva tus contratos, te avisa cuándo vence el preaviso y te deja adjuntar el documento y los otrosíes.',
    enlace: { texto: 'Ver mis contratos', a: '/app/colaboradores' },
    vista: (
      <div className="flex flex-col gap-1.5 w-full max-w-[250px]">
        {[
          { n: 'Ana Giraldo', chip: 'Preaviso en 12 días', tono: 'bg-amber-100 text-amber-800' },
          { n: 'Julián Torres', chip: 'Se prorrogó solo', tono: 'bg-red-100 text-red-700' },
          { n: 'Sofía Ramos', chip: 'Vigente', tono: 'bg-green-50 text-green-700' },
        ].map(x => (
          <div key={x.n} className="flex items-center gap-2 rounded-lg bg-white/90 border border-gray-200 px-2.5 py-1.5 shadow-sm">
            <span className="text-[11px] text-ink font-medium truncate">{x.n}</span>
            <span className="ml-auto shrink-0"><Chip tono={x.tono}>{x.chip}</Chip></span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icono: Laptop,
    titulo: 'Quien trabaja desde la casa ya puede marcar',
    texto: 'Cada persona tiene su modalidad: presencial, híbrida o remota. Al remoto no se le pide ni se le mira la ubicación. Al híbrido no se le bloquea nunca, pero si está en una de tus sedes queda registrado en cuál. El presencial sigue igual que siempre.',
    enlace: { texto: 'Asignarla en Colaboradores', a: '/app/colaboradores' },
    vista: (
      <div className="flex flex-col gap-2 w-full max-w-[250px]">
        <div className="rounded-xl bg-white/95 border border-gray-200 px-3 py-2.5 shadow-sm">
          <p className="text-[9px] font-semibold uppercase text-muted mb-1.5">Modalidad de trabajo</p>
          <div className="flex gap-1.5">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white border border-gray-300 text-muted">Presencial</span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-primary/25 border border-primary text-ink">Híbrido</span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white border border-gray-300 text-muted">Remoto</span>
          </div>
          <p className="text-[9px] text-muted mt-1.5 leading-snug">Puede marcar desde donde sea. Su ubicación solo registra la sede.</p>
        </div>
      </div>
    ),
  },
  {
    icono: FileSpreadsheet,
    titulo: 'Sube todo tu equipo con un Excel',
    texto: 'Descargas el formato, lo llenas y lo cargas. Los datos aparecen en una tabla que puedes corregir antes de guardar, y el horario y la sede se eligen aquí, no en el archivo: a una persona o a todas de una vez.',
    enlace: { texto: 'Probar la carga masiva', a: '/app/colaboradores' },
    vista: (
      <div className="w-full max-w-[265px] rounded-xl bg-white/95 shadow-sm border border-gray-200 overflow-hidden text-[10px]">
        <div className="grid grid-cols-3 gap-1 px-2.5 py-1.5 bg-gray-50 text-[9px] font-semibold uppercase text-muted">
          <span>Nombre</span><span>Cédula</span><span>Horario</span>
        </div>
        {[['Ana Giraldo', '1020304050'], ['Pedro Salazar', '1098765432']].map(([n, c]) => (
          <div key={c} className="grid grid-cols-3 gap-1 px-2.5 py-1.5 items-center border-t border-gray-100">
            <span className="text-ink truncate">{n}</span>
            <span className="font-mono text-gray-600">{c}</span>
            <span className="text-ink/60 truncate">Oficina</span>
          </div>
        ))}
        <div className="px-2.5 py-1.5 border-t border-gray-100 bg-red-50/60 text-[9px] text-red-700">
          Fila 4: la cédula ya existe
        </div>
      </div>
    ),
  },
  {
    icono: History,
    titulo: 'Cada persona tiene su historia completa',
    texto: 'La ficha del colaborador guarda su foto, cuándo entró, si se retiró y por qué, y si volvió. Con su soporte adjunto y su línea de tiempo, que es lo que necesitas el día que pidan un certificado laboral o llegue una inspección.',
    enlace: { texto: 'Abrir un colaborador', a: '/app/colaboradores' },
    vista: (
      <div className="flex flex-col gap-1.5 w-full max-w-[240px]">
        {[
          { t: 'Reingreso', f: '1 sep 2026', tono: 'bg-green-50 text-green-700' },
          { t: 'Retiro · Renuncia', f: '14 mar 2026', tono: 'bg-gray-100 text-gray-600' },
          { t: 'Ingreso', f: '2 ene 2024', tono: 'bg-green-50 text-green-700' },
        ].map(x => (
          <div key={x.f} className="flex items-center gap-2 rounded-lg bg-white/90 border border-gray-200 px-2.5 py-1.5 shadow-sm">
            <Chip tono={x.tono}>{x.t}</Chip>
            <span className="ml-auto text-[10px] text-muted shrink-0">{x.f}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icono: ListFilter,
    titulo: 'Encuentra a quien buscas, no a todos',
    texto: 'La lista de colaboradores muestra su foto, su sede y cómo va su contrato. Y se filtra por sede o por estado del contrato, para responder de una "a quién le vence algo este mes" sin ir persona por persona.',
    enlace: { texto: 'Ir a Colaboradores', a: '/app/colaboradores' },
    vista: (
      <div className="w-full max-w-[235px] rounded-xl bg-white/95 border border-gray-200 shadow-sm p-2.5 text-[10px]">
        <p className="text-[9px] font-semibold uppercase text-muted mb-1.5">Contrato</p>
        {[['Requieren atención', true], ['Por vencer', true], ['Vigentes', false]].map(([txt, on]) => (
          <div key={String(txt)} className="flex items-center gap-2 py-1">
            <span className={`w-3 h-3 rounded border ${on ? 'bg-primary border-primary' : 'border-gray-300'}`} />
            <span className="text-ink">{txt}</span>
          </div>
        ))}
        <p className="text-[9px] text-muted text-center border-t border-gray-100 mt-1.5 pt-1.5">Limpiar filtros</p>
      </div>
    ),
  },
];

// `forzado` la abre desde el botón de ayuda del menú. Cerrarla sin querer no
// puede significar perderse lo que cambió.
export default function Novedades({ forzado = false, onCerrar }: { forzado?: boolean; onCerrar?: () => void }) {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [cerrado, setCerrado] = useState(false);
  const [i, setI] = useState(0);
  const [noMostrar, setNoMostrar] = useState(false);
  // Un clic por fuera ya no la cierra: la sacude, para que se note que sigue ahí y que se cierra
  // con la X (pedido del dueño del 3 de octubre de 2026; ver la prueba).
  const [sacudiendo, setSacudiendo] = useState(false);
  // Si el gesto EMPEZÓ en el fondo. Seleccionar texto de la novedad y soltar fuera también le manda
  // el clic al fondo, y esa sacudida no la pidió nadie.
  const pulsoEnElFondo = useRef(false);

  // El efecto solo ESCRIBE en localStorage, que es un sistema externo. Al
  // usuario nuevo le toca el video de bienvenida, y estas novedades no le dicen
  // nada porque para él todo es nuevo: se marcan como vistas para que tampoco
  // le salten cuando cierre el video.
  useEffect(() => {
    if (!usuario || usuario.rol === 'SUPER_ADMIN') return;
    if (localStorage.getItem(guiaKey(usuario.id))) return;
    localStorage.setItem(vistaKey(usuario.id), '1');
  }, [usuario]);

  // Si se muestran o no se DERIVA, no se guarda en estado: son lecturas que no
  // cambian mientras la pantalla está viva.
  const abierto = !cerrado && debeMostrarNovedades({
    rol: usuario?.rol ?? null,
    vioLaGuia: !!usuario && !!localStorage.getItem(guiaKey(usuario.id)),
    vioEstaVersion: !!usuario && !!localStorage.getItem(vistaKey(usuario.id)),
    apagadas: !!usuario && !!localStorage.getItem(apagadoKey(usuario.id)),
    forzado,
    // Si ESTE lote es de los que se muestran aunque las tenga apagadas. Lo decide una constante en
    // `novedadesVisibles.ts` y no una condición aquí, para que la regla siga siendo pura y probada.
    ineludible: loteEsIneludible(),
  });

  const cerrar = () => {
    if (usuario) {
      localStorage.setItem(vistaKey(usuario.id), '1');
      if (noMostrar) localStorage.setItem(apagadoKey(usuario.id), '1');
    }
    setCerrado(true);
    onCerrar?.();
  };

  const irA = (a: string) => { cerrar(); navigate(a); };

  if (!abierto) return null;
  const n = NOVEDADES[i];
  const Icono = n.icono;
  const ultima = i === NOVEDADES.length - 1;

  return (
    <div data-testid="fondo" className="fixed inset-0 !mt-0 z-[60] bg-black/50 flex items-center justify-center p-4"
      onPointerDown={e => { pulsoEnElFondo.current = e.target === e.currentTarget; }}
      onClick={() => { if (pulsoEnElFondo.current) setSacudiendo(true); }}>
      {/* La sacudida va en este envoltorio y no en la ventana: compartir elemento con hp-pop haría
          que al terminar volviera a correr la animación de entrada (ver hp-sacudida en index.css).
          `data-sacudiendo` es para las pruebas, que no miran clases de CSS. */}
      <div
        data-sacudiendo={sacudiendo || undefined}
        className={`w-full max-w-xl ${sacudiendo ? 'hp-sacudida' : ''}`}
        // Solo la de este elemento: la entrada de la ventana burbujea hasta aquí.
        onAnimationEnd={e => { if (e.target === e.currentTarget) setSacudiendo(false); }}
        onClick={e => e.stopPropagation()}
      >
      {/* ALTO FIJO (3 de octubre de 2026). Cambiaba de una novedad a otra, de 507 a 605 px, así que
          «Continuar» se movía y el clic que iba para él caía en otra parte: en el fondo, que antes la
          cerraba, o en la casilla de no volver a mostrarlas. Con el alto fijo el pie no se mueve. En un
          celular, que no le alcanza, la cabecera y el pie quedan quietos y solo se desplaza el centro,
          como en ModalImportar: si se desplazaba la ventana entera, la X se iba de la vista. */}
      <div className="hp-pop bg-white rounded-2xl w-full shadow-xl flex flex-col h-[min(620px,calc(100dvh-2rem))] overflow-hidden">
        <div className="shrink-0 flex items-center justify-between px-6 pt-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Novedades de HoraPro</p>
          {/* Ahora es LA forma de cerrar: el área del toque crece sin mover el ícono. */}
          <button onClick={cerrar} aria-label="Cerrar" className="-m-2 p-2"><X size={18} className="text-gray-400" /></button>
        </div>

        {/* La `key` lo vuelve a montar en cada novedad: así la siguiente arranca desde arriba, no a
            medio desplazar. */}
        <div key={i} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {/* Vista previa sobre el amarillo de la marca */}
          <div className="mx-6 mt-3 rounded-xl bg-gradient-to-br from-primary/70 via-primary/40 to-amber-100 h-56 flex items-center justify-center p-5">
            {n.vista}
          </div>

          <div className="px-6 pt-5 pb-3">
            <h3 className="font-bold text-xl text-ink flex items-start gap-2.5">
              <Icono size={20} className="mt-1 shrink-0 text-ink/70" />
              {n.titulo}
            </h3>
            <p className="text-sm text-muted mt-1.5 leading-relaxed">{n.texto}</p>

            {n.enlace && (
              <button onClick={() => irA(n.enlace!.a)}
                className="mt-3 w-full flex items-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-xl px-4 py-2.5 text-sm font-semibold text-ink transition-colors">
                {n.enlace.texto}
                <ChevronRight size={16} className="ml-auto text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Del ancho de su texto y no de la fila entera: un clic suelto en esa franja la marcaba sin
            que nadie lo notara, y al cerrar apagaba las novedades para siempre. */}
        <label className="shrink-0 mx-6 my-3 flex w-fit items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={noMostrar} onChange={e => setNoMostrar(e.target.checked)}
            className="rounded accent-primary" />
          <span className="text-xs text-muted">No volver a mostrarme las novedades</span>
        </label>

        <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={() => setI(x => x - 1)} disabled={i === 0}
            className="shrink-0 px-3 sm:px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-ink hover:bg-gray-50 disabled:opacity-0 disabled:pointer-events-none">
            Anterior
          </button>

          {/* Cuatro puntos que se corren al avanzar (puntosDeNovedades.ts). Antes eran quince, y en un
              celular de 384 px sacaban a «Continuar» 61 px por la derecha. En 320 px los cuatro caben
              en una fila porque los botones se angostan; el `flex-wrap` queda de red por debajo. */}
          <div role="img" aria-label={`Novedad ${i + 1} de ${NOVEDADES.length}`}
            className="flex min-w-0 flex-wrap items-center justify-center gap-1 sm:gap-1.5">
            {puntosVisibles(i, NOVEDADES.length).map(k => (
              <span key={k} aria-current={k === i ? 'step' : undefined}
                className={`rounded-full transition-all ${k === i ? 'w-2 h-2 bg-ink' : 'w-1.5 h-1.5 bg-gray-300'}`} />
            ))}
          </div>

          {/* Mide siempre lo que «Continuar», también cuando dice «Listo» (pedido del dueño). Las dos
              palabras van encimadas en la misma celda y la que sobra es invisible: así el ancho no
              depende de un número de píxeles que cambie con la letra o el zoom. */}
          <button onClick={() => (ultima ? cerrar() : setI(x => x + 1))}
            className="shrink-0 grid text-center px-3 sm:px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-ink text-sm font-bold">
            <span aria-hidden="true" className="invisible col-start-1 row-start-1">Continuar</span>
            <span className="col-start-1 row-start-1">{ultima ? 'Listo' : 'Continuar'}</span>
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
