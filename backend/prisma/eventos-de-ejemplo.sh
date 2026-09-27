#!/usr/bin/env bash
# Provoca eventos REALES contra el backend local, para poder mirar la pantalla del registro con
# algo dentro. No inserta filas a mano: golpea la API y deja que el módulo haga lo suyo.
#
# Todo lo que deja se puede borrar desde la propia pantalla, con el botón "Borrar".
#
#   bash prisma/eventos-de-ejemplo.sh
set -u
API=http://127.0.0.1:3001

if ! curl -sf -o /dev/null "$API/api/health"; then
  echo "El backend no responde en $API. Levántalo con: npm run dev"
  exit 1
fi

echo "1. Contraseñas equivocadas contra una cuenta que SÍ existe (se cuentan por cuenta)"
for i in 1 2 3; do
  curl -s -o /dev/null -X POST "$API/api/auth/login" \
    -H 'Content-Type: application/json' -H 'X-Forwarded-For: 190.24.14.52' \
    -d '{"email":"superadmin@horapro.co","password":"equivocada"}'
done

echo "2. Un bot probando correos inventados (se colapsan en UNA fila por IP)"
for i in 1 2 3 4 5 6 7 8; do
  curl -s -o /dev/null -X POST "$API/api/auth/login" \
    -H 'Content-Type: application/json' -H 'X-Forwarded-For: 45.153.160.8' \
    -d "{\"email\":\"admin$i@loquesea.xyz\",\"password\":\"123456\"}"
done

echo "3. Aporreando hasta que el límite de intentos corta (esto es el login masivo)"
for i in $(seq 1 14); do
  curl -s -o /dev/null -X POST "$API/api/auth/login" \
    -H 'Content-Type: application/json' -H 'X-Forwarded-For: 103.97.2.11' \
    -d '{"email":"gerencia@empresa.co","password":"prueba"}'
done

echo "4. Entrando al panel de HoraPro sin ser super admin"
for i in 1 2; do
  curl -s -o /dev/null "$API/api/admin/empresas" -H 'X-Forwarded-For: 181.49.30.7'
done

echo "5. Una pantalla que se rompió en el celular de alguien"
curl -s -o /dev/null -X POST "$API/api/eventos/navegador" \
  -H 'Content-Type: application/json' -H 'X-Forwarded-For: 190.24.14.52' \
  -H 'User-Agent: Mozilla/5.0 (Linux; Android 13; SM-A135M) AppleWebKit/537.36 Chrome/119 Mobile' \
  -d '{"mensaje":"undefined is not an object (evaluating 'colaborador.nombre')","rastro":"at Marcador (/assets/index-4f2a.js:1:88412)\n    at renderWithHooks","pantalla":"/marcador/9f2c1e7ab3d4c5e6"}'

echo
echo "Listo. Entra a /admin/registro y mira las pestañas Errores y Accesos."
echo "La pestaña Acciones se llena sola en cuanto crees o edites algo desde la aplicación."
