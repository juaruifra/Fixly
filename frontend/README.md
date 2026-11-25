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
volver al panel. El cierre de sesión confirmado regresa a `/`. Shop List y
Shop Detail visuales corresponden a fases posteriores.

Para probar el renderizado de Home y la navegación por rol desde `frontend`:

```powershell
node --test test/home-public.render.test.js
```
