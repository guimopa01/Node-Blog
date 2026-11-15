const prisma = require('../config/prisma');

const postDetailInclude = {
    user: { select: { name: true } },
    category: { select: { name: true } },
    images: { orderBy: { createdAt: 'asc' } },
    comments: { orderBy: { createdAt: 'asc' } },
    _count: { select: { likes: true, comments: true } },
};

const renderCreatePost = async (req, res, next, status = 200, error = null) => {
    try {
        const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
        res.status(status).render('posts/create', {
            title: 'Crear publicación — Node Blog',
            categories,
            error,
        });
    } catch (databaseError) {
        next(databaseError);
    }
};

const getCreatePost = (req, res, next) => renderCreatePost(req, res, next);

const storePost = async (req, res, next) => {
    const { title, content, categoryId = '' } = req.body ?? {};

    if (
        typeof title !== 'string' || !title.trim() || title.trim().length > 160
        || typeof content !== 'string' || !content.trim() || content.length > 20000
        || (categoryId !== '' && (typeof categoryId !== 'string' || !/^\d+$/.test(categoryId)))
    ) {
        return renderCreatePost(req, res, next, 400, 'Revisa el título, el contenido y la categoría.');
    }

    try {
        const data = {
            title: title.trim(),
            content: content.trim(),
            user: { connect: { id: req.session.user.id } },
        };

        if (categoryId !== '') {
            data.category = { connect: { id: Number(categoryId) } };
        }

        if (req.file) {
            data.images = { create: { url: `/uploads/${req.file.filename}` } };
        }

        const post = await prisma.post.create({
            data,
            select: { id: true },
        });
        res.redirect(`/posts/${post.id}`);
    } catch (error) {
        next(error);
    }
};

const renderPost = async (req, res, next, commentError = null, status = 200) => {
    const postId = Number(req.params.id);
    if (!Number.isSafeInteger(postId) || postId < 1) {
        return res.status(404).send('Post no encontrado.');
    }

    try {
        const post = await prisma.post.findUnique({
            where: { id: postId },
            include: postDetailInclude,
        });
        if (!post) return res.status(404).send('Post no encontrado.');

        const liked = req.session.user
            ? Boolean(await prisma.like.findUnique({
                where: {
                    postId_userId: { postId, userId: req.session.user.id },
                },
            }))
            : false;

        res.status(status).render('posts/show', {
            title: `${post.title} — Node Blog`,
            post,
            liked,
            commentError,
        });
    } catch (error) {
        next(error);
    }
};

const getPost = (req, res, next) => renderPost(req, res, next);

const toggleLike = async (req, res, next) => {
    const postId = Number(req.params.id);
    if (!Number.isSafeInteger(postId) || postId < 1) {
        return res.status(404).send('Post no encontrado.');
    }

    try {
        const existingLike = await prisma.like.findUnique({
            where: {
                postId_userId: { postId, userId: req.session.user.id },
            },
        });

        if (existingLike) {
            await prisma.like.delete({ where: { id: existingLike.id } });
        } else {
            await prisma.like.create({
                data: { postId, userId: req.session.user.id },
            });
        }

        res.redirect(`/posts/${postId}#likes`);
    } catch (error) {
        if (error.code === 'P2003' || error.code === 'P2025') {
            return res.status(404).send('Post no encontrado.');
        }
        next(error);
    }
};

const createComment = async (req, res, next) => {
    const { name, email, message } = req.body ?? {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (
        typeof name !== 'string' || !name.trim() || name.trim().length > 100
        || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
        || normalizedEmail.length > 254
        || typeof message !== 'string' || !message.trim() || message.trim().length > 5000
    ) {
        return renderPost(req, res, next, 'Completa nombre, correo y mensaje correctamente.', 400);
    }

    try {
        const postId = Number(req.params.id);
        if (!Number.isSafeInteger(postId) || postId < 1) {
            return res.status(404).send('Post no encontrado.');
        }

        await prisma.comment.create({
            data: {
                postId,
                name: name.trim(),
                email: normalizedEmail,
                message: message.trim(),
            },
        });
        res.redirect(`/posts/${postId}#comments`);
    } catch (error) {
        if (error.code === 'P2003') {
            return res.status(404).send('Post no encontrado.');
        }
        next(error);
    }
};

module.exports = {
    createComment,
    getCreatePost,
    getPost,
    storePost,
    toggleLike,
};
