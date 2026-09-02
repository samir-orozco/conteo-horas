import type { Modalidad } from '../../features/colaboradores/modalidad';

// Qué hace el kiosco con la ubicación de quien está marcando.
//
// Antes esto era una sola pregunta por EMPRESA (`exigeUbicacion`) y decidía
// hasta si dejar entrar. Ahora depende de la persona, y solo se sabe después del
// login. La lógica estaba repartida en tres condicionales de tres archivos.

export type PermisoUbicacion = 'sin-preguntar' | 'concedido' | 'negado';

export type ContextoUbicacion = {
  modalidad: Modalidad;
  // Si la empresa tiene geocerca o sedes con coordenadas. Es lo único que se
  // sabe antes del login, y sigue viniendo de GET /kiosco/:token.
  empresaPideUbicacion: boolean;
  permiso: PermisoUbicacion;
};

export type DecisionUbicacion = {
  capturarCoords: boolean;
  textoBoton: 'Ubicando...' | 'Registrando...';
  // 'confirmada'      la ubicación está y va a servir para validar
  // 'registra-sede'   la ubicación está y solo va a servir para anotar la sede
  // 'sin-gps-bloquea' falta el permiso Y a esta persona sí se le valida: avisar ANTES
  // 'ninguno'         no hay nada que decirle
  indicador: 'confirmada' | 'registra-sede' | 'sin-gps-bloquea' | 'ninguno';
};

export function decidirUbicacion(ctx: ContextoUbicacion): DecisionUbicacion {
  const { modalidad, empresaPideUbicacion, permiso } = ctx;

  // A un remoto se le prometió que no se le mira la ubicación. Pedírsela de
  // todas formas sería recoger un dato personal que ya se decidió no usar.
  if (modalidad === 'REMOTO' || !empresaPideUbicacion) {
    return { capturarCoords: false, textoBoton: 'Registrando...', indicador: 'ninguno' };
  }

  // Sin permiso no se intenta capturar: dispararía el diálogo del navegador en
  // mitad de la marcación, que es justo lo que Safari iOS castiga.
  if (permiso !== 'concedido') {
    return {
      capturarCoords: false,
      textoBoton: 'Registrando...',
      // Solo se le avisa a quien de verdad va a ser rechazado. A un híbrido sin
      // permiso no se le anuncia un bloqueo que no va a ocurrir.
      indicador: modalidad === 'PRESENCIAL' ? 'sin-gps-bloquea' : 'ninguno',
    };
  }

  return {
    capturarCoords: true,
    textoBoton: 'Ubicando...',
    indicador: modalidad === 'HIBRIDO' ? 'registra-sede' : 'confirmada',
  };
}
