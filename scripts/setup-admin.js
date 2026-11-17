require('dotenv').config();

const bcrypt = require('bcrypt');
const prisma = require('../src/config/prisma');

const setupAdmin = async () => {
    const email = (process.env.ADMIN_EMAIL || 'admin@gmail.com').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Configura un ADMIN_EMAIL válido en .env.');
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        await prisma.user.update({
            where: { id: existingUser.id },
            data: { role: 'ADMIN', isBlocked: false },
        });
        console.log(`Cuenta administradora configurada para ${email}. Se conservó su contraseña actual.`);
        return;
    }

    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
        throw new Error('Para crear una cuenta administradora nueva, configura ADMIN_PASSWORD (8–72 bytes) en .env.');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
        data: {
            name: 'Administrador',
            email,
            password: passwordHash,
            role: 'ADMIN',
            isBlocked: false,
        },
    });

    console.log(`Cuenta administradora configurada para ${email}.`);
};

setupAdmin()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
