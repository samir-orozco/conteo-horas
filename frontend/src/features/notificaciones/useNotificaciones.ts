import { useCallback, useEffect, useState } from 'react';
import { getNotificaciones, marcarLeida as apiLeida, marcarTodas as apiTodas } from './api';
import type { Notificacion } from './types';

// Estado de la campana: refresca al montar y cada 60s. `enabled` en false para
// usuarios sin empresa (super admin), así no golpea el endpoint que da 401.
export function useNotificaciones(enabled = true) {
  const [items, setItems] = useState<Notificacion[]>([]);

  const reload = useCallback(async () => {
    try { const d = await getNotificaciones(); setItems(d.items); } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    reload();
    const t = setInterval(reload, 60_000);
    return () => clearInterval(t);
  }, [enabled, reload]);

  const marcarLeida = useCallback(async (id: string) => {
    setItems(prev => prev.map(n => (n.id === id ? { ...n, leida: true } : n)));
    try { await apiLeida(id); } catch { reload(); }
  }, [reload]);

  const marcarTodas = useCallback(async () => {
    setItems(prev => prev.map(n => ({ ...n, leida: true })));
    try { await apiTodas(); } catch { reload(); }
  }, [reload]);

  const noLeidas = items.filter(n => !n.leida).length;
  return { items, noLeidas, reload, marcarLeida, marcarTodas };
}

export type NotifState = ReturnType<typeof useNotificaciones>;
