import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, UserCheck, Clock, TrendingUp, PartyPopper } from 'lucide-react';
import { useDashboard } from '../features/dashboard/useDashboard';
import Kpi from '../features/dashboard/components/Kpi';
import {
  EnPlantaCard, SalidasCard, LlegadasTardeCard, SinMarcarCard, NovedadesCard, FestivosCard, CumpleanosCard,
} from '../features/dashboard/components/Tarjetas';
import ModalCerrarTurno from '../features/dashboard/components/ModalCerrarTurno';
import ModalNovedad from '../features/dashboard/components/ModalNovedad';
import ModalFotos from '../features/dashboard/components/ModalFotos';
import Pendientes from '../features/dashboard/components/Pendientes';
import PrimerosPasos from '../features/dashboard/components/PrimerosPasos';
import AsistenciaSemana from '../features/dashboard/components/AsistenciaSemana';
import LlegadasTarde7d from '../features/dashboard/components/LlegadasTarde7d';
import type { Salida, TurnoOlvidado, Novedad } from '../features/dashboard/types';

export default function DashboardEmpresa() {
  const { data: d, reload } = useDashboard();
  const [cerrarTurno, setCerrarTurno] = useState<TurnoOlvidado | null>(null);
  const [verNovedad, setVerNovedad] = useState<Novedad | null>(null);
  const [fotosDe, setFotosDe] = useState<Salida | null>(null);

  if (!d) return <div className="p-8 text-muted">Cargando...</div>;

  const hora = new Date(d.fecha).getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{saludo}</h1>
          <p className="text-sm text-muted capitalize">{format(new Date(d.fecha), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}</p>
        </div>
        {d.hoyEsFestivo && (
          <span className="flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full bg-red-100 text-red-700">
            <PartyPopper size={15} /> Hoy es festivo
          </span>
        )}
      </div>

      {/* Lo que espera a que alguien haga algo. Los turnos sin cerrar, que antes iban en un recuadro
          naranja más abajo, son uno de estos avisos. */}
      <Pendientes turnos={d.turnosOlvidados} pendientes={d.pendientes} onCerrarTurno={setCerrarTurno} />

      {/* Solo en el primer mes de la empresa y mientras falte algún paso: el servidor manda null si no. */}
      {d.primerosPasos && <PrimerosPasos pasos={d.primerosPasos} />}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* El número cuenta solo a quien está en su puesto. Quien almuerza sale
            de la cuenta pero sigue en la tarjeta de abajo, que lleva el mismo
            título: sin decirlo aquí, el KPI diría 0 mientras la lista muestra
            gente, y las dos cosas parecerían contradecirse. */}
        <Kpi icon={UserCheck} titulo="En planta ahora" valor={String(d.totales.enPlanta)} acento="text-green-600"
          detalle={d.enDescanso?.length
            ? `${d.enDescanso.length} en pausa · de ${d.totales.colaboradoresActivos} colaboradores`
            : `de ${d.totales.colaboradoresActivos} colaboradores`} />
        <Kpi icon={Users} titulo="Colaboradores" valor={String(d.totales.colaboradoresActivos)} detalle="activos en la empresa" />
        <Kpi icon={Clock} titulo="Horas esta semana" valor={`${d.totales.horasSemana}h`} detalle="trabajadas por el equipo" />
        <Kpi icon={TrendingUp} titulo="Horas extra del mes" valor={`${d.totales.horasExtraMes}h`} acento="text-orange-500"
          detalle="acumuladas en el equipo" />
      </div>

      {/* Hoy: quién está junto a quién falta, y debajo las salidas y las novedades. */}
      <div className="grid lg:grid-cols-2 gap-4">
        <EnPlantaCard items={d.enPlanta} enDescanso={d.enDescanso ?? []} />
        <SinMarcarCard items={d.sinMarcarHoy} />
        <SalidasCard items={d.salidasRecientes} onVerFotos={setFotosDe} />
        <NovedadesCard items={d.novedadesHoy} onVer={setVerNovedad} />
      </div>

      {/* La semana. Las llegadas tarde de 7 días reemplazan a la lista de hoy; con un servidor anterior,
          que no las manda, queda la lista. */}
      <div className="grid lg:grid-cols-2 gap-4">
        {d.asistenciaSemana && <AsistenciaSemana dias={d.asistenciaSemana.dias} />}
        {d.llegadasTarde7d ? <LlegadasTarde7d {...d.llegadasTarde7d} /> : <LlegadasTardeCard items={d.llegadasTardeHoy} />}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <FestivosCard items={d.proximosFestivos} />
        <CumpleanosCard items={d.cumpleanos} />
      </div>

      {/* Modales */}
      {cerrarTurno && <ModalCerrarTurno turno={cerrarTurno} onClose={() => setCerrarTurno(null)} onDone={reload} />}
      {verNovedad && <ModalNovedad novedad={verNovedad} onClose={() => setVerNovedad(null)} />}
      {fotosDe && <ModalFotos salida={fotosDe} onClose={() => setFotosDe(null)} />}
    </div>
  );
}
