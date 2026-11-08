# Node-Blog

## Requisitos

- Node.js 20.19 o superior (recomendado: Node.js LTS).
- PostgreSQL 17 o superior, instalado y en ejecucion.
- Git, si vas a clonar el proyecto.

Comprueba las versiones instaladas:

```sh
node -v
npm -v
psql --version
```

Instala PostgreSQL para tu sistema desde [postgresql.org/download](https://www.postgresql.org/download/) y asegúrate de que el servicio está iniciado. En Windows puedes usar SQL Shell (psql) o pgAdmin; en macOS/Linux, usa `psql` desde la terminal.

Conéctate como administrador de PostgreSQL (normalmente el usuario `postgres`) y crea el usuario y la base de datos del proyecto:

```sql
CREATE ROLE nodeblog WITH LOGIN PASSWORD 'nodeblog';
CREATE DATABASE nodeblog OWNER nodeblog;
```

Hazlo una sola vez en cada ordenador. Si el usuario o la base ya existen, no repitas estos comandos.

## Instalacion

Abre una terminal en la carpeta del proyecto, donde esta `package.json`, e instala las dependencias:

```sh
npm install
```

`npm install` instala las dependencias declaradas en `package.json` y usa `package-lock.json` para mantener sus versiones. No hace falta instalar `@prisma/client` ni `prisma` por separado.

## Configuracion de `.env`

Crea tu archivo local a partir de la plantilla. En macOS/Linux:

El `.env` debe estar en la carpeta raiz del proyecto y contener:

```env
DATABASE_URL="postgresql://nodeblog:nodeblog@localhost:5432/nodeblog?schema=public"
PORT=3000
```

## Preparar Prisma y la base de datos

Desde la carpeta raiz, ejecuta:

```sh
npx prisma generate
npx prisma migrate dev --name init
```

El primer comando genera el cliente de Prisma. En el primer ordenador, el segundo crea las tablas de PostgreSQL y la migración inicial. Sube `prisma/migrations` a Git. Tus compañeros, después de instalar e iniciar PostgreSQL, crear su usuario/base de datos y recibir esa migración, ejecutan `npx prisma migrate dev` sin `--name`.

## Arrancar Node

```sh
npm start
```

Abre [http://localhost:3000](http://localhost:3000). La ruta `/posts` consulta los posts guardados en la base de datos. Para crear uno, envia una peticion `POST` a `/posts` con JSON:

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

Sube `package.json`, `package-lock.json`, el esquema y la carpeta `prisma/migrations`. No subas `node_modules` ni `.env`: están excluidos por `.gitignore`. Cada compañero instala Node.js y PostgreSQL, ejecuta `npm install`, crea `.env` desde `.env.example`, inicia PostgreSQL y ejecuta `npx prisma migrate dev`.