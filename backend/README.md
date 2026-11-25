# Fixly API

API REST de Fixly para gestionar servicios, usuarios y reservas.

La separación entre servicios y variantes y el tratamiento de los campos
históricos se explica en [la documentación del catálogo](../docs/catalogo-publico.md).

## Arranque
1. Tener MongoDB en ejecución.
2. `npm install`
3. Copiar `.env.example` a `.env` si es necesario.
4. `npm run seed` (añade los datos de ejemplo que falten sin borrar ni sobrescribir registros).
5. `npm run dev`

Para usar autenticación, configura `JWT_SECRET` con una cadena aleatoria de al menos 32 caracteres y, opcionalmente, `JWT_EXPIRES_IN` (por defecto, `1h`). El registro público siempre asigna el rol `CLIENT`.

Todas las rutas privadas requieren un JWT válido y autorización por rol. No hay bypass de autenticación en desarrollo.

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

`npm run seed:reset` elimina físicamente las colecciones de desarrollo (incluidos pedidos, carritos, roles, usuarios, trabajadores, variantes, servicios y categorías) y vuelve a cargar los ejemplos. **No se ha ejecutado.** Para permitirlo deben cumplirse todas estas condiciones:

- `NODE_ENV=development`.
- `ALLOW_DESTRUCTIVE_SEED_RESET=true` como confirmación explícita.
- `MONGODB_URI` apunta a un host local (`localhost`, `127.0.0.1` o `::1`) y a la base `fixly`.
- Después de conectar, el script vuelve a comprobar el host y nombre reales antes de borrar.

En PowerShell, configura `NODE_ENV` y `ALLOW_DESTRUCTIVE_SEED_RESET` para la sesión antes de invocar `npm run seed:reset`. El comando no se ejecuta durante la preparación ni al documentarlo.

## Autenticación y rutas nuevas

- `POST /api/auth/register`: crea una cuenta CLIENT.
- `POST /api/auth/login`: devuelve el usuario y un JWT.
- `GET /api/auth/me`: devuelve el usuario asociado al token.
- `PATCH /api/auth/me`: actualiza el nombre o correo del usuario autenticado.
- `PATCH /api/auth/me/default-profile`: selecciona un perfil propio; `profileId: null` limpia la preferencia. `defaultProfile` se devuelve como ID string o `null` y no afecta a permisos ni a la identidad del JWT.
- `PATCH /api/auth/me`: actualiza el nombre o correo del usuario autenticado; no permite cambiar el rol ni campos internos.
- `PATCH /api/auth/me/default-profile`: selecciona un perfil propio o limpia la selección con `profileId: null`.
- `POST /api/auth/logout`: revoca únicamente el JWT de la petición y devuelve `204` al confirmar la persistencia.
- Las contraseñas de registro, login y cambios propios o administrativos requieren al menos 8 caracteres y no pueden superar 72 bytes UTF-8.
- `PATCH /api/auth/password`: cambia la contraseña propia con JWT y contraseña actual; invalida las sesiones anteriores del usuario.
- `GET /api/profiles`: lista los perfiles del usuario autenticado junto con el avatar opcional de cada uno.
- `POST /api/profiles`: crea un perfil propio con `name`; admite `Idempotency-Key` UUID v4 para devolver el mismo perfil al reintentar una creación.
- `GET`, `PATCH` y `DELETE /api/profiles/:id`: consultan, actualizan o eliminan perfiles propios; el servidor deriva el propietario del JWT y responde `404` ante perfiles ajenos.
- `GET`, `POST`, `PATCH` y `DELETE /api/profiles/:id/avatar`: gestionan el avatar propio. El alta concurrente se limita a uno mediante índice único; el reemplazo se hace editando la imagen existente.
- Las rutas administrativas de categorías, servicios, variantes, imágenes, roles, usuarios y trabajadores requieren Bearer JWT con rol ADMIN.

Cada JWT contiene un `jti` único y la versión de tokens del usuario. `RevokedToken` conserva únicamente `jti`, usuario y caducidad; MongoDB elimina los registros expirados mediante un índice TTL. El backend espera a que se creen sus índices antes de aceptar peticiones y falla cerrado si no puede consultar revocaciones. El logout revoca solo el token actual; las peticiones que ya superaron el middleware pueden terminar. Cambiar una contraseña incrementa `tokenVersion` atómicamente e invalida todas las sesiones anteriores. Los JWT anteriores al despliegue no incluyen los nuevos claims y deben renovarse iniciando sesión.

### Comprobación manual en Postman

1. Inicia sesión dos veces y conserva los JWT como `tokenA` y `tokenB`.
2. Consulta `GET /api/auth/me` con cada token; ambos deben responder `200`.
3. Envía `POST /api/auth/logout` con `Authorization: Bearer {{tokenA}}`; debe responder `204` sin cuerpo.
4. Repite `GET /api/auth/me` con `tokenA`; debe responder `401`. `tokenB` debe seguir respondiendo `200`.
5. Cambia la contraseña con `PATCH /api/auth/password`; las sesiones anteriores del usuario deben responder `401` y un nuevo login debe funcionar.

Si el logout termina con un error de red, el frontend conserva el token para poder reintentar; no informa que la revocación se haya completado.

En Postman, inicia sesión dos veces y conserva ambos tokens. Envía `POST /api/auth/logout` con uno en `Authorization: Bearer <token>`: debe devolver `204`; ese token debe recibir `401` en `/api/auth/me`, mientras el segundo sigue funcionando. Después cambia la contraseña con el endpoint indicado y comprueba que ambos tokens anteriores reciben `401`; inicia sesión otra vez para obtener una sesión válida.

El catálogo público incluye `GET /api/home/categories`, `GET /api/shop/filters`, `GET /api/shop/services`, `GET /api/shopDetail/services/:slug`, `GET /api/shopDetail/services/:slug/variants`, `/api/categories/available`, `/api/categories/slug/:slug`, `/api/services/public`, `/api/services/slug/:slug` y `/api/variants/public`, todos sin autenticación. Home devuelve categorías activas/no eliminadas con al menos un servicio y una variante disponibles. Shop aplica filtros por categoría, búsqueda y precio con orden y paginación; Shop Detail solo muestra servicios y variantes comercialmente disponibles. Para consultar imágenes públicas, usa `GET /api/images/public/entity/:entityType/:entityId`; devuelve `404` si la entidad no es visible en el catálogo. La ruta anterior `/api/images/entity/:entityType/:entityId` queda reservada a ADMIN.

La guía técnica de los contratos y consultas está en [la documentación del catálogo](../docs/catalogo-publico.md). Para la simulación utiliza `MONGODB_TEST_URI` local `fixly_test_*`, confirma `CATALOG_SEARCH_BACKFILL_DB_NAME` y ejecuta `npm run migrate:catalog-search-text -- --dry-run`. La aplicación real está bloqueada salvo `--apply` y `ALLOW_CATALOG_SEARCH_BACKFILL=true`; requiere autorización, volver a revisar la URI y disponer de una copia de seguridad. El backfill no se ha ejecutado contra la base de desarrollo.

Shop List usa `/api/shop` y Shop Detail usa `/api/shopDetail`, con módulos
independientes. Detail está dividido en `src/routes/shop-detail.routes.js`,
`src/controllers/shop-detail.controller.js`,
`src/services/shop-detail.service.js` y
`src/repositories/shop-detail.repository.js`; `app.js` monta cada router en su
propio prefijo. Las respuestas públicas mantienen su formato.

Los avatares de perfiles no forman parte del catálogo público ni de los endpoints genéricos de administración de imágenes. `Image.entityId` contiene el ID del perfil y la propiedad se comprueba mediante `Profile.owner`. Se guardan como URLs HTTP(S); si la URL externa es pública, la API no puede volverla privada. Al eliminar un perfil se intenta borrar su avatar antes que el documento; MongoDB standalone no garantiza atomicidad entre ambas colecciones.

`User.defaultProfile` es una preferencia opcional, devuelta como ID string o `null`. Al seleccionar un perfil se comprueba su propietario antes y después de guardar; al eliminarlo se limpia la preferencia solo si aún apunta a ese ID. Esta secuencia evita referencias inválidas por carreras entre selección y borrado en la ejecución normal.

Antes de arrancar la API con esta versión, ejecuta `npm run migrate:profile-avatar-index` una vez. La migración comprueba duplicados y reemplaza los índices anteriores sin modificar documentos.

## Carrito y pedidos

El checkout vuelve a comprobar en MongoDB que las variantes, servicios y categorías siguen publicados y disponibles. Calcula el total con los precios actuales del servidor y guarda en el pedido una copia de nombres, SKU, precio y duración para conservar el historial.

La conexión actual usa MongoDB standalone, que no admite transacciones multidocumento. El checkout guarda una clave interna única para recuperar el mismo pedido si se reintenta después de crearlo, y bloquea cambios del carrito mientras procesa. Esto evita duplicar pedidos en los reintentos cubiertos, pero no constituye una transacción que bloquee cambios concurrentes en variantes; esa limitación se conserva explícitamente.

## Pruebas

`npm test` ejecuta las pruebas unitarias y de integración. Estas últimas requieren `MONGODB_TEST_URI` apuntando a MongoDB local y una base cuyo nombre empiece por `fixly_test_`; usan y eliminan únicamente esa base temporal.
