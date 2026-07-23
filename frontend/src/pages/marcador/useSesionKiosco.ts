import { useState } from 'react';
import { loginCedula, loginRostro, getEstado } from './api';
import type { Colaborador, Estado } from './tipos';

// Sesión del colaborador en el kiosco: login (cédula o rostro) + estado del día.
// El login carga el estado ANTES de fijar token/colaborador: si /estado falla (red
// intermitente), no se entra a una pantalla de marcación bloqueada. Los errores se
// propagan al llamador (que decide mostrar shake, vinculación de dispositivo, etc.).
export function useSesionKiosco(marcadorToken: string | undefined) {
  const [token, setToken] = useState<string | null>(null);
  const [colaborador, setColaborador] = useState<Colaborador | null>(null);
  const [estado, setEstado] = useState<Estado | null>(null);

  const cargarEstado = async (t: string) => { setEstado(await getEstado(t)); };

  const ingresar = async (cedula: string, deviceToken?: string) => {
    const r = await loginCedula({ cedula, marcadorToken: marcadorToken!, deviceToken });
    await cargarEstado(r.token);
    setToken(r.token);
    setColaborador(r.colaborador);
  };

  const ingresarRostro = async (descriptor: number[], deviceToken?: string) => {
    const r = await loginRostro({ descriptor, marcadorToken: marcadorToken!, deviceToken });
    await cargarEstado(r.token);
    setToken(r.token);
    setColaborador(r.colaborador);
  };

  const limpiarSesion = () => { setToken(null); setColaborador(null); setEstado(null); };

  return { token, colaborador, estado, ingresar, ingresarRostro, cargarEstado, limpiarSesion };
}
