import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import VistaDeAdjunto from './VistaDeAdjunto';
import { MIME_DOCX } from '../lib/archivos';

// El cuerpo de los tres visores de adjuntos.
//
// La regla que protege: hasta ahora el código era
// `tipo === 'application/pdf' ? <iframe> : <img>`, y ese `else` daba por hecho
// que todo lo que no es un PDF es una foto. Con Word entrando, un contrato en
// .docx caía ahí y se pintaba como una imagen rota, sobre un archivo que en
// realidad se había guardado bien.

const PDF = 'data:application/pdf;base64,JVBERi0xLjQK';
const JPG = 'data:image/jpeg;base64,/9j/4AAQ';
const DOCX = 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,UEsDBBQA';

describe('cómo se muestra cada adjunto', () => {
  it('un PDF se ve embebido', () => {
    render(<VistaDeAdjunto data={PDF} tipo="application/pdf" nombre="contrato.pdf" />);
    expect(screen.getByTitle('contrato.pdf')).toBeInTheDocument();
  });

  it('una foto se ve como foto', () => {
    render(<VistaDeAdjunto data={JPG} tipo="image/jpeg" nombre="incapacidad.jpg" />);
    expect(screen.getByAltText('incapacidad.jpg')).toBeInTheDocument();
  });

  it('un Word NO se intenta mostrar: se ofrece descargarlo', () => {
    // Es el caso entero por el que existe este componente.
    render(<VistaDeAdjunto data={DOCX} tipo={MIME_DOCX} nombre="Contrato Ana.docx" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText(/no se pueden ver aquí/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /descargar/i })).toBeInTheDocument();
  });

  it('el Word se baja con la extensión correcta aunque el nombre diga otra cosa', () => {
    render(<VistaDeAdjunto data={DOCX} tipo={MIME_DOCX} nombre="contrato.exe" />);
    expect(screen.getByRole('link', { name: /descargar/i })).toHaveAttribute('download', 'contrato.docx');
  });

  it('un tipo que no conocemos tampoco se mete en un <img>', () => {
    // Puede llegar de una fila vieja: los dos comprobantes llevan años
    // guardando lo que el cliente mandara, sin ninguna regla.
    render(<VistaDeAdjunto data="data:application/zip;base64,UEsDBBQA" tipo="application/zip" nombre="cosa.zip" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /descargar/i })).toBeInTheDocument();
  });

  it('sin tipo no se asume que es una foto', () => {
    // El comprobante se guarda sin columna de tipo al lado. Si no se puede
    // deducir, es mejor ofrecer la descarga que pintar un recuadro roto.
    render(<VistaDeAdjunto data="data:;base64,AAAA" nombre="comprobante" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /descargar/i })).toBeInTheDocument();
  });

  it('sin nombre igual se puede bajar', () => {
    render(<VistaDeAdjunto data={DOCX} tipo={MIME_DOCX} />);
    expect(screen.getByRole('link', { name: /descargar/i })).toHaveAttribute('download', 'documento.docx');
  });
});
