-- Foto de perfil del colaborador.
--
-- Es dato personal común, no biométrico: sirve para reconocer de quién es la
-- ficha que se está mirando. El descriptor facial sigue en su propia columna y
-- se borra por separado.
--
-- LONGTEXT porque se guarda como data URL en base64. El tope real lo pone la
-- aplicación (MAX_FOTO en src/utils/fotoPerfil.ts): unos 500 KB.

ALTER TABLE colaboradores
  ADD COLUMN foto LONGTEXT NULL;
