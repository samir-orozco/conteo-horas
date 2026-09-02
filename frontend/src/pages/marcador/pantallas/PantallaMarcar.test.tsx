import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PantallaMarcar from './PantallaMarcar';
import { decidirUbicacion } from '../decisionUbicacion';
import type { Modalidad } from '../../../features/colaboradores/modalidad';

// Lo que el kiosco le dice a cada persona sobre su ubicación. Ya no es lo mismo
// para todos, y el caso que importa es el nuevo: un presencial que llegó hasta
// aquí SIN dar el permiso. Antes no podía existir, porque el muro no lo dejaba
// pasar; ahora puede, y tiene que enterarse ANTES de oprimir el botón y no por
// un flash rojo de dos segundos que no le dice qué hacer.

const colaborador = { id: 'c1', nombre: 'Ana', apellido: 'Giraldo', cargo: 'Cajera', modalidad: 'PRESENCIAL' as Modalidad };

const montar = (modalidad: Modalidad, permiso: 'concedido' | 'negado') => render(
  <PantallaMarcar
    colaborador={{ ...colaborador, modalidad }}
    ahora={new Date('2026-09-01T15:00:00.000Z')}
    estado={null}
    marcar={vi.fn()}
    onRegresoOlvidado={vi.fn()}
    marcando={false}
    decisionUbic={decidirUbicacion({ modalidad, empresaPideUbicacion: true, permiso })}
    salir={vi.fn()}
  />,
);

describe('PantallaMarcar · lo que dice de la ubicación', () => {
  it('al presencial con permiso le confirma que su ubicación está activa', () => {
    montar('PRESENCIAL', 'concedido');
    expect(screen.getByText(/ubicación activada/i)).toBeInTheDocument();
  });

  it('al presencial SIN permiso le avisa que no va a poder marcar, antes de intentarlo', () => {
    montar('PRESENCIAL', 'negado');
    expect(screen.getByText(/sin ubicación no podrás marcar/i)).toBeInTheDocument();
  });

  it('al híbrido le dice que solo se registra la sede, no que va a marcar desde la empresa', () => {
    // Prometerle "marcarás desde la empresa" a un híbrido es directamente falso:
    // marcar desde fuera es un caso soportado.
    montar('HIBRIDO', 'concedido');
    expect(screen.getByText(/se registrará desde qué sede marcas/i)).toBeInTheDocument();
    expect(screen.queryByText(/marcarás desde la empresa/i)).not.toBeInTheDocument();
  });

  it('al híbrido sin permiso no le anuncia un bloqueo que no va a ocurrir', () => {
    montar('HIBRIDO', 'negado');
    expect(screen.queryByText(/no podrás marcar/i)).not.toBeInTheDocument();
  });

  it('al remoto no le dice nada de ubicación, porque no se le mira', () => {
    montar('REMOTO', 'concedido');
    expect(screen.queryByText(/ubicación/i)).not.toBeInTheDocument();
  });
});
