import { describe, it, expect, beforeEach } from 'vitest';
import {
  debeMostrarResena, esRutaDeInicio, mostradaKey, resenaMostradaEnEstaPestana, marcarResenaMostrada,
  avisosDeLaCarga,
} from './debeMostrarResena';
import { guiaKey, vistaKey, apagadoKey, loteEsIneludible } from '../../components/novedadesVisibles';

// Cuándo se le abre a una empresa la ventana que pide la reseña (docs/RESENAS.md, R2 a R4).
//
// La oportunidad es UNA sola: salir encima de otro aviso, o en mitad de un trabajo, es gastarla mal.
// Y no salir nunca es no enterarse de lo que piensan los clientes.

// El caso en que sí sale. Todos los campos son obligatorios a propósito, igual que en
// `debeMostrarNovedades`: con valores por omisión, una pantalla que se olvidara de uno decidiría sola
// si tapa otro aviso.
const base = {
  rol: 'ADMIN',
  pendiente: true,
  enInicio: true,
  mostradaEnEstaPestana: false,
  trabajandoEnInicio: false,
  emailVerificado: true,
  vioLaGuia: true,
  novedadesPorMostrar: false,
  auxilioPorRevisar: false,
};

describe('debeMostrarResena', () => {
  it('sale al administrador de una empresa pendiente, en Inicio, sin ningún otro aviso', () => {
    expect(debeMostrarResena(base)).toBe(true);
  });

  // R2. El servidor lo vuelve a comprobar con el rol de la base; esto es para no abrirle la ventana a
  // quien de todas formas no puede enviarla.
  it('R2: no le sale al supervisor', () => {
    expect(debeMostrarResena({ ...base, rol: 'SUPERVISOR' })).toBe(false);
  });

  it('R2: tampoco al super admin, al afiliado ni sin sesión', () => {
    expect(debeMostrarResena({ ...base, rol: 'SUPER_ADMIN' })).toBe(false);
    expect(debeMostrarResena({ ...base, rol: 'AFILIADO' })).toBe(false);
    expect(debeMostrarResena({ ...base, rol: null })).toBe(false);
  });

  // R1 lo decide el servidor (al día, segundo mes, sin cortesía, no es la Demo, no respondió). Eso
  // también cubre el bloqueo de pago: una empresa en mora o suspendida no está pendiente.
  it('R1: no sale si el servidor dice que la empresa no está pendiente', () => {
    expect(debeMostrarResena({ ...base, pendiente: false })).toBe(false);
  });

  it('R3: solo en Inicio, no en otras pantallas', () => {
    expect(debeMostrarResena({ ...base, enInicio: false })).toBe(false);
  });

  it('R3: no sale dos veces en la misma pestaña', () => {
    expect(debeMostrarResena({ ...base, mostradaEnEstaPestana: true })).toBe(false);
  });

  // Si la respuesta del servidor llega cuando la persona ya abrió un modal o escribe en un campo de
  // Inicio, la ventana le caería encima y le quitaría el foco.
  it('R3: ni en mitad de un trabajo: si ya hizo algo en Inicio, no le cae encima', () => {
    expect(debeMostrarResena({ ...base, trabajandoEnInicio: true })).toBe(false);
  });

  describe('R4: si en esta carga va a salir otro aviso, espera a la siguiente', () => {
    it('la verificación del correo', () => {
      expect(debeMostrarResena({ ...base, emailVerificado: false })).toBe(false);
    });

    // Mismo criterio que `VerificarCorreo`, que solo sale con un `false` explícito. Si los dos
    // leyeran distinto el campo, habría una carga en que ninguno sale, o una en que salen los dos.
    it('sin el dato del correo no espera, porque la verificación tampoco sale', () => {
      expect(debeMostrarResena({ ...base, emailVerificado: undefined })).toBe(true);
    });

    it('la guía de bienvenida', () => {
      expect(debeMostrarResena({ ...base, vioLaGuia: false })).toBe(false);
    });

    it('las novedades', () => {
      expect(debeMostrarResena({ ...base, novedadesPorMostrar: true })).toBe(false);
    });

    it('la revisión del auxilio de transporte', () => {
      expect(debeMostrarResena({ ...base, auxilioPorRevisar: true })).toBe(false);
    });
  });
});

describe('esRutaDeInicio', () => {
  it('Inicio es /app, con o sin la barra del final', () => {
    expect(esRutaDeInicio('/app')).toBe(true);
    expect(esRutaDeInicio('/app/')).toBe(true);
  });

  it('cualquier otra pantalla del panel no lo es', () => {
    expect(esRutaDeInicio('/app/registros')).toBe(false);
    expect(esRutaDeInicio('/app/kiosco')).toBe(false);
  });

  it('una ruta que solo empieza igual tampoco', () => {
    expect(esRutaDeInicio('/apps')).toBe(false);
    expect(esRutaDeInicio('/admin')).toBe(false);
    expect(esRutaDeInicio('/')).toBe(false);
  });
});

// Las pruebas que usan los almacenes de verdad arrancan con los dos vacíos.
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

// Un almacén de mentira con la misma forma que sessionStorage, como en `bloqueoDelHosting.test.ts`.
const almacen = (inicial: Record<string, string> = {}) => {
  const d: Record<string, string> = { ...inicial };
  return {
    d,
    getItem: (k: string) => (k in d ? d[k] : null),
    setItem: (k: string, v: string) => { d[k] = v; },
  };
};
// Modo privado o datos de sitio bloqueados: el almacén lanza.
const roto = {
  getItem: (): string | null => { throw new Error('bloqueado'); },
  setItem: () => { throw new Error('bloqueado'); },
};

describe('la marca de «ya salió en esta pestaña»', () => {
  it('la llave lleva el id del usuario', () => {
    expect(mostradaKey('u1')).toBe('horapro_resena_mostrada_u1');
  });

  it('arranca sin marcar y queda marcada', () => {
    const a = almacen();
    expect(resenaMostradaEnEstaPestana('u1', a)).toBe(false);
    marcarResenaMostrada('u1', a);
    expect(resenaMostradaEnEstaPestana('u1', a)).toBe(true);
  });

  it('es por persona: otra que entre en la misma pestaña no hereda la marca', () => {
    const a = almacen();
    marcarResenaMostrada('u1', a);
    expect(resenaMostradaEnEstaPestana('u2', a)).toBe(false);
  });

  // R8: cerrar la pestaña no gasta nada. Por eso la marca vive en sessionStorage, que muere con la
  // pestaña, y no en localStorage, que la haría durar para siempre en ese navegador.
  it('sin almacén explícito usa sessionStorage y no localStorage', () => {
    marcarResenaMostrada('u1');
    expect(sessionStorage.getItem(mostradaKey('u1'))).toBe('1');
    expect(localStorage.getItem(mostradaKey('u1'))).toBeNull();
    expect(resenaMostradaEnEstaPestana('u1')).toBe(true);
  });

  // Si no se puede saber, no se pregunta: no salir no gasta la oportunidad, y salir en cada carga
  // sí molesta.
  it('si el navegador no deja leer, cuenta como mostrada y no sale', () => {
    expect(resenaMostradaEnEstaPestana('u1', roto)).toBe(true);
  });

  it('si el navegador no deja escribir, no revienta', () => {
    expect(() => marcarResenaMostrada('u1', roto)).not.toThrow();
  });
});

// Lo que la ventana necesita saber de la guía y de las novedades, leído con las MISMAS llaves y la
// MISMA regla que usan ellas. Una copia de la regla aquí sería la segunda verdad de CLAUDE.md §9.3.
describe('avisosDeLaCarga', () => {
  const usuario = { id: 'u1', rol: 'ADMIN' };

  it('a quien no ha visto la guía le toca la guía, y las novedades se callan', () => {
    expect(avisosDeLaCarga(usuario, almacen())).toEqual({ vioLaGuia: false, novedadesPorMostrar: false });
  });

  it('vio la guía y no este lote: van a salir las novedades', () => {
    const a = almacen({ [guiaKey('u1')]: '1' });
    expect(avisosDeLaCarga(usuario, a)).toEqual({ vioLaGuia: true, novedadesPorMostrar: true });
  });

  it('vio la guía y este lote: no hay otro aviso', () => {
    const a = almacen({ [guiaKey('u1')]: '1', [vistaKey('u1')]: '1' });
    expect(avisosDeLaCarga(usuario, a)).toEqual({ vioLaGuia: true, novedadesPorMostrar: false });
  });

  it('apagó las novedades: salen o no según el lote, igual que en Novedades', () => {
    const a = almacen({ [guiaKey('u1')]: '1', [apagadoKey('u1')]: '1' });
    expect(avisosDeLaCarga(usuario, a).novedadesPorMostrar).toBe(loteEsIneludible());
  });

  it('las llaves son de cada persona', () => {
    const a = almacen({ [guiaKey('otra')]: '1', [vistaKey('otra')]: '1' });
    expect(avisosDeLaCarga(usuario, a).vioLaGuia).toBe(false);
  });

  it('sin almacén explícito lee localStorage, que es donde escriben la guía y las novedades', () => {
    localStorage.setItem(guiaKey('u1'), '1');
    localStorage.setItem(vistaKey('u1'), '1');
    expect(avisosDeLaCarga(usuario)).toEqual({ vioLaGuia: true, novedadesPorMostrar: false });
  });

  // Si no se puede leer, se supone que hay otro aviso: así la reseña espera y no sale encima.
  it('si el navegador no deja leer, supone que hay otro aviso', () => {
    expect(avisosDeLaCarga(usuario, roto).novedadesPorMostrar).toBe(true);
  });
});
