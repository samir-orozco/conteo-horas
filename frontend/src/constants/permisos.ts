// Etiquetas legibles de los tipos de novedad/permiso. Módulo neutral para que lo
// usen tanto el dashboard como la ficha del colaborador y los reportes sin acoplarse.
export const TIPO_PERMISO_LABEL: Record<string, string> = {
  VACACIONES: 'Vacaciones',
  INCAPACIDAD_EPS: 'Incapacidad (EPS)',
  INCAPACIDAD_ARL: 'Incapacidad laboral (ARL)',
  LICENCIA_MATERNIDAD: 'Licencia de maternidad',
  LICENCIA_PATERNIDAD: 'Licencia de paternidad',
  LICENCIA_LUTO: 'Licencia por luto',
  CALAMIDAD: 'Calamidad doméstica',
  MEDICO: 'Cita médica',
  PERSONAL: 'Permiso personal',
  NO_REMUNERADO: 'Permiso no remunerado',
  OTRO: 'Otro',
};
