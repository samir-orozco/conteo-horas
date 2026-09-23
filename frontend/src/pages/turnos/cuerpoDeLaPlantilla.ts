import type { Ventana } from '../../lib/descansos';
import type { ColorDeTurno } from '../../lib/coloresDeTurno';

// Un turno del catálogo como lo edita la pantalla. Todo en texto, que es lo que devuelven los
// campos del navegador: el vacío es la cadena vacía y no null.
export type FormularioDePlantilla = {
  nombre: string;
  color: ColorDeTurno;
  esDescanso: boolean;
  sedeId: string;
  horaEntrada: string;
  horaSalida: string;
  tieneAlmuerzo: boolean;
  almuerzoInicio: string;
  almuerzoFin: string;
  descansos: Ventana[];
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
export function cuerpoDeLaPlantilla(p: FormularioDePlantilla) {
  const comunes = { nombre: p.nombre, color: p.color, sedeId: p.sedeId || null };
  if (p.esDescanso) return { ...comunes, esDescanso: true };

  return {
    ...comunes,
    esDescanso: false,
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
