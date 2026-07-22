import api from '../../lib/api';
import type { Dash } from './types';

export const getDashboard = () => api.get('/dashboard/empresa').then(r => r.data as Dash);

export const getEvidencia = (permisoId: string) =>
  api.get(`/permisos/${permisoId}/evidencia`).then(r => r.data as { evidencia: string; evidenciaTipo: string; evidenciaNombre: string | null });

export const cerrarRegistro = (id: string, body: { entrada: Date; salida: Date }) =>
  api.put(`/registros/${id}`, body);

export const getFotos = (registroId: string) =>
  api.get(`/registros/${registroId}/fotos`).then(r => r.data as { fotoEntrada: string | null; fotoSalida: string | null });
