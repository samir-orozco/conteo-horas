// Los tabs de la ficha del colaborador.
//
// La ficha tenía hasta nueve tarjetas apiladas en una columna: datos, salario
// adicional, llegadas tarde, reconocimiento facial, contratos, novedades,
// kardex, y las de retiro e historia. Eso dejó de ser una ficha y pasó a ser un
// scroll. Los tabs agrupan por CUÁNDO se usa cada cosa, no por qué es.

export type ClaveTab = 'resumen' | 'asistencia' | 'contratos' | 'novedades' | 'historia';

export const TABS: { clave: ClaveTab; etiqueta: string }[] = [
  { clave: 'resumen', etiqueta: 'Resumen' },
  { clave: 'asistencia', etiqueta: 'Asistencia' },
  { clave: 'contratos', etiqueta: 'Contratos' },
  { clave: 'novedades', etiqueta: 'Novedades' },
  { clave: 'historia', etiqueta: 'Historia' },
];

const POR_DEFECTO: ClaveTab = 'resumen';

export function tabValido(v: string | undefined | null): v is ClaveTab {
  return !!v && TABS.some(t => t.clave === v);
}

// Un tab inventado (un enlace viejo, una dirección mal escrita) cae al resumen.
// Sin esto la ficha quedaría en blanco sin decir por qué.
export function tabDesdeUrl(busqueda: string): ClaveTab {
  const v = new URLSearchParams(busqueda).get('tab');
  return tabValido(v) ? v : POR_DEFECTO;
}

// El tab viaja en la dirección para que se pueda compartir y para que volver
// atrás en el navegador devuelva a donde uno estaba. El de por defecto no se
// escribe: ensuciaría la dirección sin aportar nada.
export function urlConTab(busqueda: string, tab: ClaveTab): string {
  const p = new URLSearchParams(busqueda);
  if (tab === POR_DEFECTO) p.delete('tab');
  else p.set('tab', tab);
  const texto = p.toString();
  return texto ? `?${texto}` : '';
}
