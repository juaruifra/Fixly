# Catálogo público: fases 1 y 2

## Alcance de esta fase

Esta entrega separa el servicio genérico de sus modalidades de contratación.
`Service` describe qué trabajo se ofrece y `Variant` describe cómo se contrata.
Por eso, el nombre, la categoría y la descripción pertenecen a Service; el
precio y la duración pertenecen a cada Variant.

La fase 1 realizó ese cambio de modelo y administración. La fase 2 añade el
endpoint backend de categorías para Home; la página React y los endpoints de
Shop List y Shop Detail todavía no están implementados.

## Fase 2: categorías para Home

`GET /api/home/categories` es una operación pública de solo lectura y no
requiere Bearer JWT. Devuelve únicamente los campos necesarios para las tarjetas
de inicio: nombre, slug para navegación y primera imagen (o `null`). No devuelve
IDs internos, estados ni documentos completos de categoría, servicio o variante.

Ejemplo de petición:

```http
GET /api/home/categories
```

Respuesta ilustrativa:

```json
[
  {
   "name": "Fontanería",
   "slug": "fontaneria",
   "image": {
    "url": "https://example.invalid/fontaneria.jpg",
    "alt": "Reparación de un grifo"
   }
  },
  {
   "name": "Jardinería",
   "slug": "jardineria",
   "image": null
  }
]
```

La respuesta real es un array; una categoría sin imágenes mantiene su lugar y
recibe `image: null`. Las categorías se ordenan por nombre y slug.

### Consulta y disponibilidad

La ruta `home.routes.js` no monta autenticación. `home.controller.js` delega en
`home.service.js`, que llama a `home.repository.js`; allí se ejecuta una sola
agregación desde la colección Service. Sus etapas implementan estas reglas:

1. `$match` descarta servicios inactivos, no publicados o eliminados. Category
  no tiene estado de publicación.
2. `$lookup` busca para cada servicio una variante activa, publicada y no
  eliminada. La correlación por `service` usa el prefijo del índice existente
  `{service, active, status, deletedAt}` de Variant. `$limit: 1` evita cargar
  variantes completas: solo hace falta saber que existe al menos una.
3. `$match` elimina servicios sin variantes elegibles.
4. `$group` reúne los servicios restantes por ID de categoría. Si tres servicios
  de la misma categoría son elegibles, el grupo conserva una sola categoría.
5. `$lookup` recupera Category por su `_id`; `$unwind` elimina relaciones
  inexistentes y otro `$match` exige categoría activa y no eliminada. Esta
  comprobación ocurre después de la disponibilidad propia de Service/Variant,
  no cambia los estados en cascada.
6. `$lookup` encuentra imágenes `entityType: "category"` de esa categoría,
  ordena por `createdAt` ascendente y `_id` como desempate estable, y limita la
  relación a una imagen. Ese es el criterio de “primera imagen”; coincide con
  el orden temporal de la galería.
7. `$project` convierte la primera coincidencia en `image` y expone solamente
  `name`, `slug` e imagen. Si el array de imágenes está vacío, `$ifNull`
  produce `null`. `$sort` final ordena las tarjetas por nombre y slug.

El pipeline no usa `$unwind` sobre servicios ni variantes: junto con `$group`,
esto evita duplicar una categoría por tener múltiples ofertas. Las relaciones
se consultan dentro de la agregación, no mediante una consulta por cada tarjeta,
por lo que no se genera el patrón N+1.

El índice de Variant cubre la búsqueda correlacionada por servicio, filtros de
estado y soft delete. Images ya dispone de `{entityType, entityId, createdAt}`.
No se añadió ningún índice en Service: el pipeline recorre esa colección una
vez y el tamaño real de producción no está disponible. Antes de añadir un índice
para ese filtro se debería medir `explain("executionStats")` con datos
representativos y valorar su coste de escritura, almacenamiento y despliegue.

### Pruebas y documentación

`home-public.test.js` comprueba el acceso sin token, las condiciones del pipeline,
el agrupamiento y el orden de imagen. `home.integration.test.js` prepara casos
reales para categorías y ofertas no disponibles, varias ofertas por categoría
y orden de imágenes. Esta integración solo se ejecuta con
`MONGODB_TEST_URI` local y nombre `fixly_test_*`; elimina esa base al terminar.
Swagger describe el endpoint y los campos de su respuesta.

## Modelo y contratos

Un Service nuevo necesita `name` y `category`. También puede recibir
`description`, `active` y `status`; el servidor genera el `slug`. El endpoint
administrativo continúa siendo `POST /api/services`, protegido por autenticación
y rol ADMIN.

Ejemplo válido:

```http
POST /api/services
Authorization: Bearer <token ADMIN>
Content-Type: application/json
```

```json
{
  "name": "Limpieza de viviendas",
  "category": "65a1b2c3d4e5f67890123456",
  "description": "Limpieza de espacios interiores.",
  "active": true,
  "status": "published"
}
```

`price` y `duration` ya no son propiedades de Service. En POST y PATCH se
rechazan con HTTP 400 si se envían, incluso cuando su valor es `null`. El
validador HTTP de `service.routes.js` informa el error antes del controlador;
`sanitizeInput` en `service.service.js` mantiene la misma regla para llamadas
internas que no atraviesen Express.

Una respuesta de Service conserva sus demás propiedades y la categoría
poblada, pero no devuelve precio ni duración:

```json
{
  "_id": "65a1b2c3d4e5f67890123457",
  "name": "Limpieza de viviendas",
  "category": {
    "_id": "65a1b2c3d4e5f67890123456",
    "name": "Hogar",
    "slug": "hogar",
    "active": true,
    "deletedAt": null
  },
  "description": "Limpieza de espacios interiores.",
  "active": true,
  "deletedAt": null,
  "status": "published",
  "slug": "limpieza_de_viviendas"
}
```

La respuesta real también puede incluir `createdAt` y `updatedAt`.
`ServiceInput` en Swagger refleja ahora los campos admitidos y requiere solo
nombre y categoría. La autorización de las rutas administrativas no cambia.

## Responsabilidad de Variant

`Variant.price` y `Variant.duration` permanecen obligatorios. El precio admite
cero o un valor positivo; la duración es un entero positivo en minutos. La
generación del SKU automático sigue usando el slug del Service y la duración de
la Variant. Los formularios y las rutas de Variant no se modifican en esta fase.

El carrito también conserva la relación con Variant: `cart.repository.js`
recupera precio y duración de esa modalidad, y `cart.service.js` calcula el
subtotal del pedido con el precio de la variante en el servidor. Al confirmar el
checkout, `Order` guarda una copia inmutable del precio y duración junto con los
nombres y el SKU. Esa copia es el historial de la compra y no debe recalcularse
al cambiar una Variant.

## Datos históricos

Quitar una propiedad del esquema Mongoose no elimina automáticamente el campo
de los documentos que ya existen. Esta fase **no ejecuta una migración física**:
si una fila antigua de Service guarda `price` o `duration`, esos valores siguen
en MongoDB, pero dejan de formar parte del modelo y del contrato de la API.

Las consultas del repositorio usan `.select("-price -duration")` antes de
`.lean()`. `lean()` devuelve objetos JavaScript planos sin aplicar la
serialización de documentos hidratados de Mongoose; por eso la proyección
explícita es necesaria para que valores antiguos no reaparezcan en respuestas.
La prueba `test/service-contract.test.js` inspecciona esa proyección sin abrir
una conexión a la base de datos.

El seed normal solo inserta ejemplos que faltan: no limpia ni actualiza los
servicios ya guardados. Sus datos de Service ya no incluyen esos campos y sus
datos de Variant sí los conservan. No se ejecutó el seed. El script
`migrate-services.js` completa estado, slug y fecha de borrado; no forma parte
de este cambio ni borra precio o duración.

Si más adelante se quisiera eliminar físicamente los dos campos de documentos
antiguos, haría falta una migración separada, con respaldo, revisión del
entorno y autorización expresa. Los precios/duraciones históricos de Order no
se deben borrar ni modificar.

## Flujo administrativo

```mermaid
flowchart LR
  Form[ServiceForm] --> Schema[serviceSchema]
  Schema --> Page[ServiceCreate o ServiceEdit]
  Page --> Http[serviceService y apiService]
  Http --> Route[service.routes]
  Route --> Controller[service.controller]
  Controller --> Logic[service.service]
  Logic --> Repository[service.repository]
  Repository --> Mongo[(MongoDB)]
```

`ServiceForm` prepara el body desde sus campos editables. `serviceSchema`
comprueba el nombre, el ID de categoría y el resto de datos propios del
servicio. Las páginas Create/Edit comparan esos mismos campos antes de decidir
si hace falta actualizar la entidad o basta con sincronizar sus imágenes.
`service.service.js` vuelve a validar el body y genera un slug único; el
repositorio conserva la relación poblada con Category y excluye las propiedades
comerciales antiguas de las respuestas.

La tabla de administración muestra identidad, categoría, estado y acciones. Ya
no presenta un precio o una duración genéricos que podrían contradecir las
variantes del servicio. El precio y tiempo se siguen editando desde la gestión
de variantes.

## Archivos que conviene estudiar

- Backend: `src/models/service.model.js`, `src/services/service.service.js`,
  `src/repositories/service.repository.js`, `src/routes/service.routes.js` y
  `src/config/swagger.js`.
- Administración frontend: `src/features/services/serviceSchema.js`,
  `src/features/services/components/ServiceForm.jsx`,
  `src/pages/services/ServiceCreate.jsx`, `ServiceEdit.jsx` y `ServiceList.jsx`.
- Precio y duración comerciales: `src/models/variant.model.js`,
  `src/services/variant.service.js`, `src/services/cart.service.js` y
  `src/models/order.model.js`.

## Verificación

Las comprobaciones sin MongoDB de esta fase son:

```powershell
node --test --test-reporter=tap test/catalog-authorization.test.js
node --test --test-reporter=tap test/service-contract.test.js
npm --prefix ..\frontend run build
```

Las pruebas de integración de imágenes, variantes y carrito/pedidos necesitan
`MONGODB_TEST_URI` local con una base cuyo nombre empiece por `fixly_test_`.
Comprueban datos en esa base y la eliminan al terminar; no se ejecutan sin
confirmar que la URI apunta a una base de pruebas aislada.

## Decisiones fuera de alcance

- No se trasladan automáticamente valores antiguos de Service a Variant.
- No se crean variantes para servicios que no las tengan.
- No se elimina físicamente ningún campo de MongoDB.
- No se modifican campos ni snapshots de Variant, Cart u Order.
- No se implementan aún Shop List, Shop Detail, búsquedas ni precios calculados.