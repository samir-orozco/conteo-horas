import type { Ventana } from '../../lib/descansos';
import type { ColorDeTurno } from '../../lib/coloresDeTurno';

// Un turno del catálogo como lo edita la pantalla. Todo en texto, que es lo que devuelven los
// campos del navegador: el vacío es la cadena vacía y no null.
export type FormularioDePlantilla = {
  nombre: string;
  color: ColorDeTurno;
  sedeId: string;
  horaEntrada: string;
  horaSalida: string;
  tieneAlmuerzo: boolean;
  almuerzoInicio: string;
  almuerzoFin: string;
  descansos: Ventana[];
  // LA TOLERANCIA PROPIA DE ESTE TURNO (23 de septiembre de 2026).
  //
  // UN interruptor y no tres campos sueltos: `ajustaEntrada` es un sí/no, y un sí/no no sabe decir
  // «hereda». Con una casilla suelta no habría forma de distinguir «que no ajuste» de «que mande el
  // horario». Apagado, las tres heredan.
  usaToleranciaPropia: boolean;
  // En texto como todo lo demás del formulario: el vacío es la cadena vacía, no null.
  toleranciaMin: string;
  toleranciaSalidaMin: string;
  ajustaEntrada: boolean;
};

// El cuerpo que se manda al guardar un turno del catálogo (19 de septiembre de 2026).
//
// Aquí NO se valida nada: quien valida es el servidor (`limpiarPlantilla`), que tiene la regla y sus
// pruebas. Lo único que se decide es qué viaja, y eso importa en dos sitios.
//
// 1. UN DESCANSO NO MANDA HORAS. Quien marca «es un día de descanso» después de haber escrito un
//    horario deja los campos llenos, porque la pantalla solo los oculta. El servidor los descartaría
//    igual, pero un cuerpo que dice «día libre» y a la vez «de 06:00 a 14:00» se contradice a sí
//    mismo, y esos son los que después nadie sabe leer.
//
// 2. LA CLAVE `descansos` VIAJA SIEMPRE, también vacía, igual que en el horario: es la que dice que
//    esta pantalla sí conoce los descansos. Y las filas a medias viajan como están, porque el
//    servidor numera sus avisos («descanso 2: ...») contando la fila que ve el administrador;
//    quitarlas aquí correría ese número.
// Un campo de minutos vacío es la cadena vacía. `=== ''` y NUNCA `||`: con `||`, un «0» escrito a
// mano viajaría como null, o sea «la del horario», que es justo lo contrario de «sin tolerancia».
// Es el mismo defecto que el `??` del backend, entrando por la puerta de atrás.
const minutos = (v: string): number | null => (v.trim() === '' ? null : Number(v));

export function cuerpoDeLaPlantilla(p: FormularioDePlantilla) {
  // Las tolerancias van en `comunes` y NO en la rama del turno: el servidor las revisa antes de su
  // propia rama de descanso, y `diaDesdePlantilla` copia la política también en un día libre.
  //
  // Con el interruptor apagado viajan las tres vacías, aunque hayan quedado números escritos: la
  // pantalla solo los oculta, y mandarlos diría lo contrario de lo que la casilla muestra.
  const comunes = {
    nombre: p.nombre,
    color: p.color,
    sedeId: p.sedeId || null,
    toleranciaMin: p.usaToleranciaPropia ? minutos(p.toleranciaMin) : null,
    toleranciaSalidaMin: p.usaToleranciaPropia ? minutos(p.toleranciaSalidaMin) : null,
    ajustaEntrada: p.usaToleranciaPropia ? p.ajustaEntrada : null,
  };

  // AQUÍ HABÍA UNA RAMA PARA EL DÍA DE DESCANSO y se retiró el 23 de septiembre de 2026, por
  // decisión del dueño: «descanso es siempre descanso». Un turno de descanso solo llevaba nombre y
  // color, y la celda del calendario no lee ninguno de los dos. Marcar un día como libre pasó a ser
  // una acción sobre el DÍA, en el calendario, y no un turno que cada empresa tenía que crearse.
  return {
    ...comunes,
    horaEntrada: p.horaEntrada,
    horaSalida: p.horaSalida,
    tieneAlmuerzo: p.tieneAlmuerzo,
    // Un campo de hora vacío es la cadena vacía. Mandarla diría «esta es la hora»; null dice «no hay
    // ventana», que es lo que el administrador quiso.
    almuerzoInicio: p.almuerzoInicio || null,
    almuerzoFin: p.almuerzoFin || null,
    descansos: p.descansos.map(d => ({ inicio: d.inicio, fin: d.fin })),
  };
}
