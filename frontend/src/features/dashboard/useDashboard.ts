import { useEffect, useState } from 'react';
import { getDashboard } from './api';
import type { Dash } from './types';

// Carga del panel de inicio. `reload` sirve tanto al montar como para refrescar
// tras cerrar un turno.
export function useDashboard() {
  const [data, setData] = useState<Dash | null>(null);
  const reload = () => getDashboard().then(setData);
  useEffect(() => { reload(); }, []);
  return { data, reload };
}
