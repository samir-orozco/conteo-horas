import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import api from '../../lib/api';
import { fechaYHora } from '../../lib/fechas';

type Cambio = {
  id: string;
  campo: string;
  antes: string;
  despues: string;
  usuarioNombre: string | null;
  creadoEn: string;
};

const NOMBRE_CAMPO: Record<string, string> = {
  entrada: 'la entrada',
  salida: 'la salida',
  fecha: 'la fecha',
  tipo: 'el tipo',
  observacion: 'la observación',
  salidaAlmuerzo: 'la marca de salida al almuerzo',
};



// Actividad de una marcación: qué se cambió, quién y cuándo.
//
// El sistema ya guardaba que alguien había editado, pero no qué. Eso no sirve
// el día que un trabajador reclama una llegada tarde: hay que poder decir que
// la entrada pasó de 8:15 a 8:00, no solo que "alguien editó esto".
export default function ActividadRegistro({ registroId }: { registroId: string }) {
  const [cambios, setCambios] = useState<Cambio[] | null>(null);

  useEffect(() => {
    api.get(`/registros/${registroId}/cambios`)
      .then(r => setCambios(r.data))
      .catch(() => setCambios([]));
  }, [registroId]);

  // Una marcación sin ediciones no necesita una sección que diga que no pasó
  // nada: solo alargaría el formulario.
  if (!cambios || cambios.length === 0) return null;

  return (
    <div className="border-t border-gray-100 pt-4">
      <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5 mb-2">
        <History size={13} /> Actividad
      </p>
      <ul className="space-y-2 max-h-40 overflow-y-auto">
        {cambios.map(c => (
          <li key={c.id} className="text-xs leading-relaxed">
            <span className="text-gray-600">
              Cambió <b className="text-ink">{NOMBRE_CAMPO[c.campo] ?? c.campo}</b> de{' '}
              <span className="font-mono bg-gray-100 px-1 rounded">{c.antes}</span> a{' '}
              <span className="font-mono bg-primary/30 px-1 rounded">{c.despues}</span>
            </span>
            <span className="block text-gray-400 mt-0.5">
              {c.usuarioNombre ?? 'Usuario eliminado'} · {fechaYHora(c.creadoEn)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
