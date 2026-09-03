import { useId } from 'react';

// Una fila del formulario: el rótulo y su explicación a la izquierda, el control
// a la derecha.
//
// La explicación no es decoración. Los campos de un colaborador tienen
// consecuencias que no se deducen del nombre —el horario define qué se le exige
// cada día, el salario calcula su hora extra, la modalidad decide si se le valida
// la ubicación— y esas dudas hoy se resuelven preguntando por WhatsApp.
//
// El `children` recibe el id del rótulo para que el control se ate a él de
// verdad. Sin eso son dos cajas que solo están cerca: tocar el texto no enfoca
// nada y un lector de pantalla anuncia un campo sin nombre.
export default function CampoFormulario({
  rotulo, descripcion, obligatorio = false, grupo = false, children,
}: {
  rotulo: string;
  descripcion?: string;
  obligatorio?: boolean;
  // Cuando adentro hay VARIOS controles (nombre y apellido, las sedes), atar el
  // rótulo al primero mentiría sobre los demás: pasa a ser el encabezado del
  // grupo entero.
  grupo?: boolean;
  children: React.ReactNode | ((id: string) => React.ReactNode);
}) {
  const id = useId();
  const idRotulo = `${id}-rotulo`;

  const texto = (
    <>
      {rotulo}
      {obligatorio && <span className="text-red-500" aria-hidden> *</span>}
    </>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] gap-1.5 sm:gap-5 py-3.5">
      <div className="sm:pt-2">
        {grupo
          ? <span id={idRotulo} className="block text-sm font-medium text-ink">{texto}</span>
          : <label id={idRotulo} htmlFor={id} className="block text-sm font-medium text-ink">{texto}</label>}
        {descripcion && <p className="text-xs text-muted mt-0.5 leading-snug">{descripcion}</p>}
      </div>
      <div role={grupo ? 'group' : undefined} aria-labelledby={grupo ? idRotulo : undefined}>
        {typeof children === 'function' ? children(id) : children}
      </div>
    </div>
  );
}
