import api from '../../lib/api';
import type { Notificacion } from './types';

export const getNotificaciones = () =>
  api.get('/notificaciones').then(r => r.data as { items: Notificacion[]; noLeidas: number });

export const marcarLeida = (id: string) => api.post(`/notificaciones/${id}/leer`);

export const marcarTodas = () => api.post('/notificaciones/leer-todas');
