# Node-Blog

## Requisitos

- Node.js 20.19 o superior (recomendado: Node.js LTS).
- Git, si vas a clonar el proyecto.

Comprueba las versiones instaladas:

```sh
node -v
npm -v
```

La base de datos SQLite se guarda como un archivo local; no necesitas instalar ni iniciar un servidor de base de datos.

## Instalacion

Abre una terminal en la carpeta del proyecto, donde esta `package.json`, e instala las dependencias:

```sh
npm install
```

`npm install` instala las dependencias declaradas en `package.json` y usa `package-lock.json` para mantener sus versiones. No hace falta instalar `@prisma/client` ni `prisma` por separado.
Si `node_modules` ya existe y la aplicacion arranca, no necesitas repetir este paso.

## Configuracion de `.env`

En desarrollo local no es obligatorio crear `.env`: la aplicacion usa SQLite en `prisma/dev.db` por defecto. Si quieres personalizar el puerto o la base de datos, crea `.env` en la raiz del proyecto a partir de `.env.example`:

```env
DATABASE_URL="file:./dev.db"
PORT=3000
```

`SESSION_SECRET` no es una contrasena de la base de datos ni guarda publicaciones. Sirve para firmar la cookie de sesion del usuario que inicia sesion. En desarrollo local se usa un valor predeterminado y puedes omitirlo; en produccion es obligatorio definir uno aleatorio y privado.

Al crear una publicacion, sus datos se guardan automaticamente en el archivo SQLite local. `npx prisma db push` solo prepara o actualiza las tablas; no envia los datos a una base de datos remota, salvo que cambies `DATABASE_URL` por una direccion remota.

## Preparar Prisma y la base de datos

Desde la carpeta raiz, ejecuta:

```sh
npx prisma generate
npx prisma db push
```

El primer comando genera el cliente de Prisma. El segundo crea o actualiza las tablas de `prisma/dev.db` según `prisma/schema.prisma`. Este proyecto todavía no incluye migraciones SQL; para preparar otra copia local, ejecuta los mismos dos comandos.

Despues de preparar la base de datos, ejecuta `npm run admin:setup` para dar rol administrador a la cuenta `admin@gmail.com` existente; conserva su contrasena y desbloquea la cuenta. Si aun no existe, configura `ADMIN_PASSWORD` (8–72 bytes) en `.env` para crearla. No uses una contrasena de ejemplo ni compartas el archivo `.env`. El registro publico nunca asigna el rol de administrador.

Al iniciar sesión como administrador, aparece el enlace **Administración** en el menú. Desde allí se pueden crear categorías, bloquear o desbloquear cuentas, y eliminar cuentas y publicaciones. Los comentarios se revisan y eliminan desde el desplegable de cada publicación. En las publicaciones se puede responder a los comentarios; cada comentario admite hasta 5000 caracteres. Al bloquear una cuenta se ocultan sus publicaciones, perfiles, comentarios y likes de las páginas públicas; al desbloquearla, vuelven a mostrarse. Eliminar una cuenta es permanente y elimina también sus publicaciones, comentarios, likes e imágenes asociadas. Los administradores no se pueden eliminar desde el panel.

## Arrancar Node

```sh
npm start
```

Abre [http://localhost:3000](http://localhost:3000) para ver la pagina principal. Home muestra las publicaciones recientes y una columna de blogs recientes. La navegacion incluye Home, Perfiles, Sobre nosotros y Contacta con nosotros. Perfiles muestra los usuarios registrados y permite abrir cada perfil para ver sus publicaciones. Puedes crear una cuenta e iniciar sesion desde el enlace del menu; al iniciar sesion, el menu permite cerrar la sesion. Los mensajes del formulario de contacto se guardan en la base local.

La seccion Blog muestra las publicaciones guardadas en SQLite. La ruta `/posts` tambien ofrece la lista como JSON. Para crear una publicacion mediante la API, envia una peticion `POST` a `/posts` con JSON:

```json
{
	"title": "Mi primer post",
	"content": "Contenido del post"
}
```

Durante el desarrollo tambien puedes usar `npm run dev`, que reinicia Node al guardar cambios.

## Abrir Prisma Studio

Deja Node ejecutandose en una terminal y abre otra en la carpeta del proyecto. Ejecuta:

```sh
npx prisma studio
```

Abre [http://localhost:5555](http://localhost:5555) para ver y editar los datos. Si el puerto esta ocupado, Prisma mostrara otro en la terminal.

## Compartir el proyecto con Git

Sube `package.json`, `package-lock.json` y el esquema. No subas `node_modules`, `.env` ni `prisma/dev.db`. Cada compañero instala Node.js, crea `.env` desde `.env.example` y ejecuta `npx prisma generate` y `npx prisma db push`.