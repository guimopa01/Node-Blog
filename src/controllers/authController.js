const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');

const getRegister = (req, res) => {
    res.render('auth/register', { title: 'Crear cuenta', error: null });
};

const postRegister = async (req, res, next) => {
    const { name, email, password } = req.body ?? {};

    if (
        typeof name !== 'string' || name.trim().length < 2
        || typeof email !== 'string' || !email.trim()
        || typeof password !== 'string'
        || password.length < 8
        || Buffer.byteLength(password, 'utf8') > 72
    ) {
        return res.status(400).render('auth/register', {
            title: 'Crear cuenta',
            error: 'Revisa tus datos. La contraseña debe tener al menos 8 caracteres y no superar 72 bytes.',
        });
    }

    try {
        const normalizedEmail = email.trim().toLowerCase();
        await prisma.user.create({
            data: {
                name: name.trim(),
                email: normalizedEmail,
                password: await bcrypt.hash(password, 12),
            },
        });

        res.redirect('/auth/login?registered=1');
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).render('auth/register', {
                title: 'Crear cuenta',
                error: 'Ya existe una cuenta con ese correo electrónico.',
            });
        }
        next(error);
    }
};

const getLogin = (req, res) => {
    res.render('auth/login', {
        title: 'Iniciar sesión',
        error: null,
        registered: req.query.registered === '1',
    });
};

const postLogin = async (req, res, next) => {
    const { email, password } = req.body ?? {};

    if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).render('auth/login', {
            title: 'Iniciar sesión',
            error: 'Introduce tu correo y contraseña.',
            registered: false,
        });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() },
        });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).render('auth/login', {
                title: 'Iniciar sesión',
                error: 'Correo o contraseña incorrectos.',
                registered: false,
            });
        }

        req.session.regenerate((error) => {
            if (error) return next(error);
            req.session.user = { id: user.id, name: user.name, email: user.email };
            req.session.save((saveError) => {
                if (saveError) return next(saveError);
                res.redirect('/');
            });
        });
    } catch (error) {
        next(error);
    }
};

const logout = (req, res, next) => {
    req.session.destroy((error) => {
        if (error) return next(error);
        res.clearCookie('node-blog.sid');
        res.redirect('/');
    });
};

module.exports = { getRegister, postRegister, getLogin, postLogin, logout };