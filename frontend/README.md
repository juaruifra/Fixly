# Fixly Frontend

Frontend React + Vite para gestionar el catálogo de servicios de Fixly.

El contrato de Service y la explicación de los cambios de la fase 1 están en
[la documentación del catálogo](../docs/catalogo-publico.md).

## Arranque
1. Arranca primero `fixly-api` en el puerto 3000.
2. `npm install`
3. `npm run dev`
4. Abre `http://localhost:4200`

La variable `VITE_API_URL` apunta por defecto a `http://localhost:3000/api`.

## Home pública

`/` muestra las categorías disponibles mediante `GET /api/home/categories`,
sin exigir sesión. Si la petición falla se puede reintentar; las categorías sin
imagen o con una imagen inaccesible muestran una alternativa.

Tras iniciar sesión, CLIENT vuelve a `/` y ADMIN accede a `/services`. Desde la
navegación pública, ambos pueden abrir su cuenta y perfiles; ADMIN también puede
volver al panel. El cierre de sesión confirmado regresa a `/`. Las categorías
enlazan a Shop List con la categoría seleccionada.

Para probar el renderizado de Home y la navegación por rol desde `frontend`:

```powershell
node --test test/home-public.render.test.js
```

## Shop List

`/shop` muestra servicios públicos y permite filtrar por categorías, búsqueda y
precio, ordenar y paginar. Los filtros aplicados viven en la URL y admiten los
botones de navegación del navegador. Los límites de precio se adaptan a las
categorías y la búsqueda; se aplican mediante el botón de precio. Una URL
inválida muestra un error y permite limpiar los filtros sin corregirla sola.

Cada tarjeta enlaza a su detalle y conserva los filtros en la dirección. Para
ejecutar las pruebas de Shop desde `frontend`:

```powershell
node --test test/shop-query.test.js test/shop-list.render.test.js
```

## Shop Detail

`/shop/:slug` consulta detalle y variantes públicas, muestra la galería y permite
seleccionar una modalidad en la pantalla. La selección es temporal: el contrato
público no incluye IDs de variantes y no se conecta al carrito. Al volver al
listado se conservan los filtros y la página incluidos en la dirección.

Desde `frontend`, `node --test test/shop-detail.render.test.js` comprueba las
consultas y el renderizado. Prueba también en el navegador la galería, la
selección, el retorno, errores y presentación móvil.
