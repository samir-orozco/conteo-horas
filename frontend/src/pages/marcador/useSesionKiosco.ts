import { useState } from 'react';
import { loginCedula, loginRostro, getEstado } from './api';
import type { Colaborador, Estado, Sede } from './tipos';

// Sesión del colaborador en el kiosco: login (cédula o rostro) + estado del día.
// El login carga el estado ANTES de fijar token/colaborador: si /estado falla (red
// intermitente), no se entra a una pantalla de marcación bloqueada. Los errores se
// propagan al llamador (que decide mostrar shake, vinculación de dispositivo, etc.).
export function useSesionKiosco(marcadorToken: string | undefined) {
  const [token, setToken] = useState<string | null>(null);
  const [colaborador, setColaborador] = useState<Colaborador | null>(null);
  const [sedes, setSedes] = useState<Sede[]>([]);
  // Si a ESTA persona se le va a validar la ubicación. Lo dice el login: la
  // configuración de la empresa no alcanza para saberlo.
  const [validaUbicacion, setValidaUbicacion] = useState<boolean | null>(null);
  const [estado, setEstado] = useState<Estado | null>(null);

  const cargarEstado = async (t: string) => { setEstado(await getEstado(t)); };

  const ingresar = async (cedula: string, deviceToken?: string) => {
    const r = await loginCedula({ cedula, marcadorToken: marcadorToken!, deviceToken });
    await cargarEstado(r.token);
    setToken(r.token);
    setColaborador(r.colaborador);
    setSedes(r.sedes ?? []);
    setValidaUbicacion(r.validaUbicacion ?? null);
  };

  const ingresarRostro = async (descriptor: number[], deviceToken?: string) => {
    const r = await loginRostro({ descriptor, marcadorToken: marcadorToken!, deviceToken });
    await cargarEstado(r.token);
    setToken(r.token);
    setColaborador(r.colaborador);
    setSedes(r.sedes ?? []);
    setValidaUbicacion(r.validaUbicacion ?? null);
  };

  // Se limpia TODO lo de la persona que se va, incluidas las sedes y el dato de
  // si se le validaba la ubicación: en una tablet compartida, lo que quede vivo
  // se lo aplica el siguiente.
  const limpiarSesion = () => {
    setToken(null); setColaborador(null); setEstado(null);
    setSedes([]); setValidaUbicacion(null);
  };

  return { token, colaborador, sedes, validaUbicacion, estado, ingresar, ingresarRostro, cargarEstado, limpiarSesion };
}
