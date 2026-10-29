# Fixly API

API REST de Fixly, un negocio de reparaciones y pequeños servicios a domicilio. La API administra categorías y servicios relacionados.

## Arranque
1. Tener MongoDB en ejecución.
2. `npm install`
3. Copiar `.env.example` a `.env` si es necesario.
4. `npm run seed` (añade los datos de ejemplo que falten sin borrar ni sobrescribir registros).
5. `npm run dev`

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

`npm run seed` crea primero las categorías y después los servicios relacionados por ObjectId. Busca cada registro por slug: no duplica, no sobrescribe cambios manuales y no recrea registros borrados lógicamente.

`npm run seed:reset` elimina físicamente las colecciones `services` y `categories` y vuelve a cargar los ejemplos. **No se ha ejecutado.** Para permitirlo deben cumplirse todas estas condiciones:

- `NODE_ENV=development`.
- `ALLOW_DESTRUCTIVE_SEED_RESET=true` como confirmación explícita.
- `MONGODB_URI` apunta a un host local (`localhost`, `127.0.0.1` o `::1`) y a la base `fixly`.
- Después de conectar, el script vuelve a comprobar el host y nombre reales antes de borrar.

En PowerShell, configura `NODE_ENV` y `ALLOW_DESTRUCTIVE_SEED_RESET` para la sesión antes de invocar `npm run seed:reset`. El comando no se ejecuta durante la preparación ni al documentarlo.
