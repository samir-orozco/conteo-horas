import axios from 'axios';
import type { Sede, Colaborador, Estado } from './tipos';

// Instancia propia del kiosco: es público (sin token de admin) y NO debe usar la
// instancia compartida ni redirigir a /login ante un 401.
export const apiKiosco = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api' });

const authHeader = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

type InfoKiosco = { empresa: string; requiereDispositivo: boolean; permiteCedula: boolean; exigeUbicacion: boolean };
type SesionResp = { token: string; colaborador: Colaborador; sedes?: Sede[] };
type MarcaResp = { accion: 'ENTRADA' | 'SALIDA'; hora: string; salidaTemprana?: boolean };

export const infoKiosco = (marcadorToken: string) =>
  apiKiosco.get(`/worker/kiosco/${marcadorToken}`).then(r => r.data as InfoKiosco);

export const vincularDispositivo = (marcadorToken: string, codigo: string) =>
  apiKiosco.post('/worker/vincular', { marcadorToken, codigo }).then(r => r.data as { deviceToken: string; nombre: string });

export const loginCedula = (body: { cedula: string; marcadorToken: string; deviceToken?: string }) =>
  apiKiosco.post('/worker/login', body).then(r => r.data as SesionResp);

export const loginRostro = (body: { descriptor: number[]; marcadorToken: string; deviceToken?: string }) =>
  apiKiosco.post('/worker/login-rostro', body).then(r => r.data as SesionResp);

export const getEstado = (token: string) =>
  apiKiosco.get('/worker/estado', authHeader(token)).then(r => r.data as Estado);

export const marcar = (token: string, body: { foto?: string; lat?: number; lng?: number }) =>
  apiKiosco.post('/worker/marcar', body, authHeader(token)).then(r => r.data as MarcaResp);

export const enviarNovedad = (token: string, body: { tipo: string; descripcion: string }) =>
  apiKiosco.post('/worker/novedad', body, authHeader(token));
