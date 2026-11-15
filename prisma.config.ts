import "dotenv/config";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { defineConfig } from "prisma/config";

const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
const relativeFileUrl = /^file:(\.{1,2}\/[^?]*)(\?.*)?$/.exec(databaseUrl);
const datasourceUrl = relativeFileUrl
  ? `${pathToFileURL(resolve("prisma", relativeFileUrl[1])).href}${relativeFileUrl[2] ?? ""}`
  : databaseUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: datasourceUrl,
  },
});
