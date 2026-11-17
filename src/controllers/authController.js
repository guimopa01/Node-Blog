const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');

const safeReturnTo = (candidate) => {
    if (typeof candidate !== 'string') return '/';
    if (candidate === '/admin') return candidate;
    const match = /^\/posts\/([1-9]\d*)(?:#(?:likes|comments))?$/.exec(candidate);
    return match && Number.isSafeInteger(Number(match[1])) ? candidate : '/';
};

const getRegister = (req, res) => {
    const returnTo = safeReturnTo(req.query.returnTo);
    res.render('auth/register', {
        title: 'Crear cuenta',
        error: null,
        returnTo,
        authRequired: returnTo !== '/',
    });
};

const postRegister = async (req, res, next) => {
    const { name, email, password } = req.body ?? {};
    const returnTo = safeReturnTo(req.body?.returnTo);
    const registerView = (error) => ({
        title: 'Crear cuenta',
        error,
        returnTo,
        authRequired: returnTo !== '/',
    });

    if (
        typeof name !== 'string' || name.trim().length < 2
        || typeof email !== 'string' || !email.trim()
        || typeof password !== 'string'
        || password.length < 8
        || Buffer.byteLength(password, 'utf8') > 72
    ) {
        return res.status(400).render('auth/register', registerView(
            'Revisa tus datos. La contraseña debe tener al menos 8 caracteres y no superar 72 bytes.',
        ));
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

        const query = new URLSearchParams({ registered: '1' });
        if (returnTo !== '/') query.set('returnTo', returnTo);
        res.redirect(`/auth/login?${query}`);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).render('auth/register', registerView(
                'Ya existe una cuenta con ese correo electrónico.',
            ));
        }
        next(error);
    }
};

const getLogin = (req, res) => {
    const returnTo = safeReturnTo(req.query.returnTo);
    res.render('auth/login', {
        title: 'Iniciar sesión',
        error: null,
        registered: req.query.registered === '1',
        blocked: req.query.blocked === '1',
        returnTo,
        authRequired: returnTo !== '/',
    });
};

const postLogin = async (req, res, next) => {
    const { email, password } = req.body ?? {};
    const returnTo = safeReturnTo(req.body?.returnTo);
    const renderFailure = (status, error) => res.status(status).render('auth/login', {
        title: 'Iniciar sesión',
        error,
        registered: false,
        blocked: false,
        returnTo,
        authRequired: returnTo !== '/',
    });

    if (typeof email !== 'string' || typeof password !== 'string') {
        return renderFailure(400, 'Introduce tu correo y contraseña.');
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() },
        });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return renderFailure(401, 'Correo o contraseña incorrectos.');
        }
        if (user.isBlocked) {
            return renderFailure(403, 'Esta cuenta está bloqueada. Contacta con la administración del blog.');
        }

        req.session.regenerate((error) => {
            if (error) return next(error);
            req.session.user = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            };
            req.session.save((saveError) => {
                if (saveError) return next(saveError);
                res.redirect(returnTo);
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