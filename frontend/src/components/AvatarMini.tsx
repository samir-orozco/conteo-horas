// El círculo de una persona en una lista.
//
// Usa la MINIATURA, nunca la foto de la ficha: la lista la pide para todos, y
// la grande por cada persona son cientos de kilobytes por carga.
export default function AvatarMini({ nombre, apellido, foto, activo = true }: {
  nombre: string;
  apellido: string;
  foto?: string | null;
  activo?: boolean;
}) {
  const completo = `${nombre} ${apellido}`.trim();
  const iniciales = `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toUpperCase();
  const estado = activo ? undefined : 'Retirado';

  return (
    <span
      title={estado}
      className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center overflow-hidden ${
        activo ? 'bg-primary' : 'bg-gray-200 opacity-70'}`}
    >
      {foto ? (
        <img src={foto} alt={`Foto de ${completo}`} className="w-full h-full object-cover" />
      ) : (
        // Las iniciales no se le leen a un lector de pantalla: el nombre está
        // justo al lado y "J T Julián Torres" es ruido.
        <span aria-hidden="true" className={`text-xs font-bold ${activo ? 'text-ink' : 'text-gray-500'}`}>
          {iniciales}
        </span>
      )}
    </span>
  );
}
