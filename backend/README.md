# Fixly API

API REST de Fixly para gestionar servicios, usuarios y reservas.

## Arranque
1. Tener MongoDB en ejecución.
2. `npm install`
3. Copiar `.env.example` a `.env` si es necesario.
4. `npm run seed` (añade los datos de ejemplo que falten sin borrar ni sobrescribir registros).
5. `npm run dev`

Para usar autenticación, configura `JWT_SECRET` con una cadena aleatoria de al menos 32 caracteres y, opcionalmente, `JWT_EXPIRES_IN` (por defecto, `1h`). El registro público siempre asigna el rol `CLIENT`.

API: `http://localhost:3000/api/services`  
Swagger: `http://localhost:3000/api/docs`  
Health: `http://localhost:3000/health`

## Mejoras de esta versión
- Validación HTTP con `express-validator` para bodies e IDs.
- Middleware central de validación y errores, incluido 404.
- `AppError` para errores controlados.
- `helmet` para cabeceras de seguridad.
- `morgan` para logging HTTP.
- CORS configurable con `CORS_ORIGIN`; si no se configura, mantiene el comportamiento abierto anterior.
- Separación de `app.js` (Express) y `server.js` (MongoDB + arranque).

Se mantienen el modelo, CRUD, `PATCH`, borrado `204`, Swagger, seed, health check y formato de respuestas existentes.

## Seeders

`npm run seed` crea los roles `ADMIN` y `CLIENT` y después las categorías, servicios y variantes relacionadas. No sobrescribe registros existentes ni restaura registros eliminados.

Para crear un administrador inicial, configura `FIXLY_ADMIN_EMAIL` y `FIXLY_ADMIN_PASSWORD` antes de ejecutar el seed. La contraseña se guarda con hash. Si el correo ya existe, el seed conserva esa cuenta y no cambia su contraseña ni su rol.

`npm run seed:reset` elimina físicamente las colecciones de desarrollo (incluidos roles, usuarios, trabajadores, variantes, servicios y categorías) y vuelve a cargar los ejemplos. **No se ha ejecutado.** Para permitirlo deben cumplirse todas estas condiciones:

- `NODE_ENV=development`.
- `ALLOW_DESTRUCTIVE_SEED_RESET=true` como confirmación explícita.
- `MONGODB_URI` apunta a un host local (`localhost`, `127.0.0.1` o `::1`) y a la base `fixly`.
- Después de conectar, el script vuelve a comprobar el host y nombre reales antes de borrar.

En PowerShell, configura `NODE_ENV` y `ALLOW_DESTRUCTIVE_SEED_RESET` para la sesión antes de invocar `npm run seed:reset`. El comando no se ejecuta durante la preparación ni al documentarlo.

## Autenticación y rutas nuevas

- `POST /api/auth/register`: crea una cuenta CLIENT.
- `POST /api/auth/login`: devuelve el usuario y un JWT.
- `GET /api/auth/me`: devuelve el usuario asociado al token.
- `/api/roles`, `/api/users` y `/api/workers`: requieren Bearer JWT con rol ADMIN.

Las rutas administrativas existentes de Category, Service y Variant siguen sin autenticación por compatibilidad y requieren protección en una fase posterior.

## Pruebas

`npm test` ejecuta las pruebas unitarias y de integración. Estas últimas requieren `MONGODB_TEST_URI` apuntando a MongoDB local y una base cuyo nombre empiece por `fixly_test_`; usan y eliminan únicamente esa base temporal.
