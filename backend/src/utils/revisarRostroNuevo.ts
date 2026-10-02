import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { tomasCoherentes, parecidosAlRegistrar } from './revisionEnrolamiento';

// La plomería de la revisión de un rostro nuevo: trae a las demás personas
// enroladas de la empresa y les aplica las dos reglas puras de
// revisionEnrolamiento.ts, que son las que deciden y las que tienen pruebas.
//
// La usan la ficha (lo registra el administrador) y el enlace (lo registra la
// propia persona). Responden distinto a lo mismo, y eso lo decide cada ruta.
export type RevisionDeRostro = {
  coherentes: boolean;
  maxima: number;
  parecidos: { id: string; nombre: string; distancia: number }[];
};

export async function revisarRostroNuevo(empresaId: string, colaboradorId: string, tomas: number[][]): Promise<RevisionDeRostro> {
  const coherencia = tomasCoherentes(tomas);
  // Con tomas de dos personas no tiene sentido buscar parecidos: no se va a guardar.
  if (!coherencia.coherentes) return { ...coherencia, parecidos: [] };
  // `colaboradores` es pequeña y entra por empresaId; aquí no se toca `registros`.
  const otras = await prisma.colaborador.findMany({
    where: { empresaId, activo: true, rostroDescriptor: { not: Prisma.DbNull }, id: { not: colaboradorId } },
    select: { id: true, nombre: true, apellido: true, rostroDescriptor: true },
  });
  const parecidos = parecidosAlRegistrar(tomas, otras, colaboradorId)
    .map(p => ({ id: p.id, nombre: `${p.nombre} ${p.apellido}`, distancia: p.distancia }));
  return { ...coherencia, parecidos };
}
