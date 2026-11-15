require('dotenv').config();

const path = require('node:path');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { PrismaClient } = require('@prisma/client');

const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
const relativeFileUrl = /^file:(\.{1,2}\/[^?]*)(\?.*)?$/.exec(databaseUrl);
const adapterUrl = relativeFileUrl
    ? `file:${path.resolve(__dirname, '../../prisma', relativeFileUrl[1])}${relativeFileUrl[2] || ''}`
    : databaseUrl;

const adapter = new PrismaBetterSqlite3({ url: adapterUrl });
const prisma = new PrismaClient({ adapter });

module.exports = prisma;