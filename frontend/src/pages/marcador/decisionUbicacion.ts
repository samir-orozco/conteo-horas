import type { Modalidad } from '../../features/colaboradores/modalidad';

// Qué hace el kiosco con la ubicación de quien está marcando.
//
// Antes esto era una sola pregunta por EMPRESA (`exigeUbicacion`) y decidía
// hasta si dejar entrar. Ahora depende de la persona, y solo se sabe después del
// login. La lógica estaba repartida en tres condicionales de tres archivos.

export type PermisoUbicacion = 'sin-preguntar' | 'concedido' | 'negado';

export type ContextoUbicacion = {
  modalidad: Modalidad;
  // Si a ESTA persona se le va a validar la ubicación al marcar. Lo dice el
  // servidor en la respuesta del login, y no se deduce de la configuración de la
  // empresa: con eso se le anunciaba "sin ubicación no podrás marcar" a gente a
  // la que no se le iba a validar nada (un presencial sin sedes, en una empresa
  // que usa sedes, no tiene contra qué compararse).
  validaUbicacion: boolean;
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
  const { modalidad, validaUbicacion, permiso } = ctx;

  // A un remoto se le prometió que no se le mira la ubicación: pedírsela sería
  // recoger un dato personal que ya se decidió no usar. Y quien no tiene nada
  // contra qué validarse, tampoco necesita darla. Pero
  // un híbrido SÍ captura aunque no se le valide: sus coordenadas sirven para
  // dejar constancia de la sede.
  if (modalidad === 'REMOTO' || (!validaUbicacion && modalidad !== 'HIBRIDO')) {
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
