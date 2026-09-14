import axios from 'axios';

// Cliente propio del registro facial por enlace (14 de septiembre de 2026). Es público y sin sesión:
// NO usa la instancia compartida, que manda a /login ante un 401. Igual que el del kiosco
// (pages/marcador/api.ts).
const apiRegistro = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api' });

export type InfoEnlace = {
  nombre: string; empresa: string; venceEn: string;
  textoAutorizacion: string; textoMayorDeEdad: string; permiteCedula: boolean;
};
export type EstadoRegistro = { registradoEn: string | null; tomas: number; foto: string | null; noAutorizoEn: string | null };

const ruta = (token: string, paso = '') => `/registro-facial/${encodeURIComponent(token)}${paso}`;

export const infoDelEnlace = (token: string) =>
  apiRegistro.get(ruta(token)).then(r => r.data as InfoEnlace);

export const verificarCedula = (token: string, cedula: string) =>
  apiRegistro.post(ruta(token, '/verificar'), { cedula }).then(r => r.data as EstadoRegistro);

// `mayorDeEdad` va solo si la persona lo marcó: no marcarlo no es decir que es menor.
export const noAutorizo = (token: string, cuerpo: { cedula: string; texto: string; mayorDeEdad?: true }) =>
  apiRegistro.post(ruta(token, '/no-autorizo'), cuerpo).then(r => r.data as { ok: true });

export const registrarRostro = (token: string, cuerpo: {
  cedula: string; texto: string; mayorDeEdad: true; descriptores: number[][]; foto?: string; fotoMini?: string;
}) => apiRegistro.post(ruta(token, '/registrar'), cuerpo).then(r => r.data as { ok: true; registradoEn: string; tomas: number });
