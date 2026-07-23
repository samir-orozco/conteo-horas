import { prisma } from '../index';

// Lectura de los flags del kiosco (Configuración → Marcación) y validación de
// dispositivos autorizados. Antes vivían dentro de routes/worker.ts.

// ¿La empresa exige dispositivos autorizados para el kiosco?
export async function exigeDispositivo(empresaId: string): Promise<boolean> {
  const cfg = await prisma.configuracion.findUnique({
    where: { empresaId_clave: { empresaId, clave: 'KIOSCO_SOLO_DISPOSITIVOS' } },
  });
  return cfg?.valor === '1';
}

// ¿La empresa permite marcar con cédula? (por defecto sí; se desactiva en Configuración → Marcación)
export async function permiteCedula(empresaId: string): Promise<boolean> {
  const cfg = await prisma.configuracion.findUnique({
    where: { empresaId_clave: { empresaId, clave: 'KIOSCO_PERMITE_CEDULA' } },
  });
  return cfg?.valor !== '0';
}

// Geocerco: la empresa puede exigir que la marca se haga dentro de un radio de su
// ubicación (GPS del teléfono). Se guarda en Configuración → Marcación.
export type GeoCfg = { lat: number; lng: number; radio: number };
export async function geocercoConfig(empresaId: string): Promise<GeoCfg | null> {
  const cfgs = await prisma.configuracion.findMany({
    where: { empresaId, clave: { in: ['GEO_EXIGIR', 'GEO_LAT', 'GEO_LNG', 'GEO_RADIO'] } },
  });
  const map = Object.fromEntries(cfgs.map(c => [c.clave, c.valor]));
  if (map.GEO_EXIGIR !== '1') return null;
  const lat = Number(map.GEO_LAT), lng = Number(map.GEO_LNG);
  const radio = Number(map.GEO_RADIO) || 150;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null; // activado pero sin ubicación fijada
  return { lat, lng, radio };
}

// ¿El deviceToken corresponde a un dispositivo vinculado de esa empresa?
export async function dispositivoValido(empresaId: string, deviceToken?: string): Promise<boolean> {
  if (!deviceToken) return false;
  const disp = await prisma.dispositivoKiosco.findUnique({ where: { token: deviceToken } });
  if (!disp || disp.empresaId !== empresaId) return false;
  await prisma.dispositivoKiosco.update({ where: { id: disp.id }, data: { ultimoUso: new Date() } });
  return true;
}
