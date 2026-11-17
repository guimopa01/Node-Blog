const prisma = require('../config/prisma');

const loadCurrentUser = async (req, res, next) => {
    if (!req.session?.user) {
        return { allowed: false };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: req.session.user.id },
            select: { id: true, name: true, email: true, role: true, isBlocked: true },
        });

        if (!user || user.isBlocked) {
            await new Promise((resolve, reject) => {
                req.session.destroy((error) => {
                    if (error) return reject(error);
                    resolve();
                });
            });
            res.clearCookie('node-blog.sid');
            res.redirect('/auth/login?blocked=1');
            return { allowed: false };
        }

        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        };
        return { allowed: true, user };
    } catch (error) {
        next(error);
        return { allowed: false };
    }
};

const isAuthenticated = async (req, res, next) => {
    if (!req.session?.user) {
        const postId = Number(req.params.id);
        const section = req.path.endsWith('/comments')
            ? 'comments'
            : req.path.endsWith('/like') ? 'likes' : null;

        if (Number.isSafeInteger(postId) && postId > 0 && section) {
            const returnTo = `/posts/${postId}#${section}`;
            return res.redirect(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
        }
        return res.redirect('/auth/login');
    }

    const result = await loadCurrentUser(req, res, next);
    if (result.allowed) return next();
};

const isAdmin = async (req, res, next) => {
    if (!req.session?.user) {
        return res.redirect('/auth/login?returnTo=%2Fadmin');
    }

    const result = await loadCurrentUser(req, res, next);
    if (!result.allowed) return;
    if (result.user.role !== 'ADMIN') {
        return res.status(403).send('No tienes permiso para acceder a esta sección.');
    }
    next();
};

module.exports = { isAdmin, isAuthenticated };
