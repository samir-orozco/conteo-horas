import type { EstadoDelKiosco } from './estadoDelKiosco';

// Cómo se dice en pantalla lo que decidió `estadoDelKiosco` (16 de septiembre de 2026).
//
// Va aparte de la regla para que la decisión («este kiosco está bloqueado») no se mezcle con la
// redacción, y aparte del componente para poder probar el texto sin montar la pantalla entera.

export type TonoDeAviso = 'ALERTA' | 'PELIGRO' | 'BIEN';

export function avisoDeProteccion(estado: EstadoDelKiosco, dispositivos: number): { tono: TonoDeAviso; texto: string } {
  if (estado.proteccion === 'EXPUESTO') {
    return {
      tono: 'ALERTA',
      texto: 'Cualquiera con este link puede marcar, desde donde sea. Activa «Solo dispositivos autorizados» si el kiosco vive en una tablet fija.',
    };
  }
  if (estado.proteccion === 'BLOQUEADO') {
    return {
      tono: 'PELIGRO',
      texto: 'Nadie puede marcar: la protección está activa y no hay ningún dispositivo vinculado. Genera un código y vincula la tablet del kiosco.',
    };
  }
  const plural = dispositivos === 1 ? 'el único dispositivo vinculado' : `los ${dispositivos} dispositivos vinculados`;
  return { tono: 'BIEN', texto: `Protegido: solo ${plural} pueden abrir el kiosco.` };
}

// «hace 1 h», «hace 12 min», «hace 3 días». Nunca un número crudo de minutos: nadie lee 4320.
export function haceCuanto(minutos: number): string {
  if (minutos < 1) return 'hace menos de un minuto';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) {
    const resto = minutos % 60;
    return resto === 0 ? `hace ${horas} h` : `hace ${horas} h ${resto} min`;
  }
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'hace 1 día' : `hace ${dias} días`;
}
