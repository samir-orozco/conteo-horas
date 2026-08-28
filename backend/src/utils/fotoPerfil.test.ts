import { describe, it, expect } from 'vitest';
import { fotoPerfilValida, fotoParaEnrolar, miniValida, MAX_FOTO, MAX_MINI } from './fotoPerfil';

const jpeg = (relleno = 100) => 'data:image/jpeg;base64,' + 'A'.repeat(relleno);

describe('la foto de perfil que se acepta', () => {
  it('acepta los formatos que produce una cámara o un teléfono', () => {
    expect(fotoPerfilValida('data:image/jpeg;base64,AAAA')).toBe(true);
    expect(fotoPerfilValida('data:image/png;base64,AAAA')).toBe(true);
    expect(fotoPerfilValida('data:image/webp;base64,AAAA')).toBe(true);
  });

  it('rechaza un PDF: esto es un avatar, no un adjunto', () => {
    expect(fotoPerfilValida('data:application/pdf;base64,AAAA')).toBe(false);
  });

  it('rechaza un SVG, que puede traer scripts dentro', () => {
    // Un SVG es un documento ejecutable. Si se sirve como imagen de perfil y
    // alguien lo abre en su propia pestaña, el script corre con el origen del
    // sitio.
    expect(fotoPerfilValida('data:image/svg+xml;base64,AAAA')).toBe(false);
  });

  it('rechaza una URL que apunte afuera', () => {
    // Guardar un http:// convertiría cada ficha en una baliza: el servidor de
    // quien puso la URL sabría cuándo y desde dónde se abre esa ficha.
    expect(fotoPerfilValida('https://ejemplo.co/foto.jpg')).toBe(false);
    expect(fotoPerfilValida('javascript:alert(1)')).toBe(false);
  });

  it('rechaza lo que no es texto', () => {
    expect(fotoPerfilValida(null)).toBe(false);
    expect(fotoPerfilValida(undefined)).toBe(false);
    expect(fotoPerfilValida(42)).toBe(false);
    expect(fotoPerfilValida({})).toBe(false);
    expect(fotoPerfilValida('')).toBe(false);
  });

  it('rechaza el prefijo correcto sin nada detrás', () => {
    expect(fotoPerfilValida('data:image/jpeg;base64,')).toBe(false);
  });

  it('pone tope al tamaño: una foto de perfil no puede llenar la base', () => {
    expect(fotoPerfilValida(jpeg(MAX_FOTO))).toBe(false);
    expect(fotoPerfilValida(jpeg(1000))).toBe(true);
  });

  it('el tope deja pasar de sobra lo que produce el escaneo facial', () => {
    // capturarFoto genera un JPEG de 320px al 70%: unos 20 KB, que en base64
    // son unos 27.000 caracteres.
    expect(fotoPerfilValida(jpeg(30_000))).toBe(true);
  });
});

describe('qué foto deja el enrolamiento facial', () => {
  const nueva = 'data:image/jpeg;base64,NUEVA';
  const yaTiene = 'data:image/jpeg;base64,ELEGIDA';

  it('sin foto previa, guarda la primera toma del escaneo', () => {
    expect(fotoParaEnrolar(null, nueva)).toBe(nueva);
  });

  it('con foto ya elegida, NO la pisa', () => {
    // Alguien subió una foto a mano y después vuelve a enrolar el rostro
    // porque cambió de gafas. Perder la foto elegida sería un efecto que nadie
    // pidió, en una acción que trata de otra cosa.
    expect(fotoParaEnrolar(yaTiene, nueva)).toBeNull();
  });

  it('si el escaneo no manda foto, no cambia nada', () => {
    expect(fotoParaEnrolar(null, undefined)).toBeNull();
    expect(fotoParaEnrolar(yaTiene, undefined)).toBeNull();
  });

  it('una foto inválida se ignora en silencio: lo importante del enrolamiento es el rostro', () => {
    // Que el navegador mande algo raro no puede tumbar el registro biométrico,
    // que es lo que la persona vino a hacer.
    expect(fotoParaEnrolar(null, 'data:application/pdf;base64,AAAA')).toBeNull();
    expect(fotoParaEnrolar(null, 'https://ejemplo.co/x.jpg')).toBeNull();
    expect(fotoParaEnrolar(null, 12345)).toBeNull();
  });
});

describe('la miniatura que viaja en las listas', () => {
  const jpg = (n: number) => 'data:image/jpeg;base64,' + 'A'.repeat(n);

  it('acepta lo que produce recortar a 64 píxeles', () => {
    // Un JPEG de 64px al 70% son un par de kilobytes.
    expect(miniValida(jpg(4_000))).toBe(true);
  });

  it('tiene su propio tope, más bajo que el de la grande', () => {
    expect(MAX_MINI).toBeLessThan(MAX_FOTO);
    expect(miniValida(jpg(MAX_MINI))).toBe(false);
    // Y una foto de tamaño de ficha no pasa por miniatura.
    expect(miniValida(jpg(200_000))).toBe(false);
  });

  it('sigue rechazando lo que no es una imagen de cámara', () => {
    expect(miniValida('data:image/svg+xml;base64,AAAA')).toBe(false);
    expect(miniValida('https://ejemplo.co/x.jpg')).toBe(false);
    expect(miniValida(null)).toBe(false);
  });
});
