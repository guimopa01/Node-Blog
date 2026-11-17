const prisma = require('../config/prisma');
const {
    getBlockedEmails,
    publicCommentWhere,
    publicPostCount,
    publicPostWhere,
} = require('../utils/contentVisibility');

const postDetailInclude = (blockedEmails) => ({
    user: { select: { name: true, isBlocked: true } },
    category: { select: { name: true } },
    images: { orderBy: { createdAt: 'asc' } },
    comments: {
        where: { ...publicCommentWhere(blockedEmails), parentId: null },
        orderBy: { createdAt: 'asc' },
        include: {
            replies: {
                where: publicCommentWhere(blockedEmails),
                orderBy: { createdAt: 'asc' },
            },
        },
    },
    _count: publicPostCount(blockedEmails),
});

const wantsJsonResponse = (req) => req.get('accept')?.toLowerCase().includes('application/json');

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
        const blockedEmails = await getBlockedEmails();
        const post = await prisma.post.findUnique({
            where: { id: postId },
            include: postDetailInclude(blockedEmails),
        });
        if (!post || post.user?.isBlocked) return res.status(404).send('Post no encontrado.');

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

const respondCommentError = (req, res, next, message, status = 400) => {
    if (wantsJsonResponse(req)) {
        return res.status(status).json({ error: message });
    }
    return renderPost(req, res, next, message, status);
};

const toggleLike = async (req, res, next) => {
    const postId = Number(req.params.id);
    if (!Number.isSafeInteger(postId) || postId < 1) {
        return res.status(404).send('Post no encontrado.');
    }

    try {
        const post = await prisma.post.findFirst({
            where: { AND: [publicPostWhere, { id: postId }] },
            select: { id: true },
        });
        if (!post) return res.status(404).send('Post no encontrado.');

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

        if (wantsJsonResponse(req)) {
            const likesCount = await prisma.like.count({
                where: { postId, user: { isBlocked: false } },
            });
            return res.json({ liked: !existingLike, likesCount });
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
    const message = req.body?.message;

    if (typeof message !== 'string' || !message.trim()) {
        return respondCommentError(req, res, next, 'Escribe un comentario.');
    }
    if (message.trim().length > 5000) {
        return respondCommentError(req, res, next, 'El comentario no puede superar los 5000 caracteres.');
    }

    let parentId = null;
    const rawParentId = req.body?.parentId;
    if (rawParentId !== undefined && rawParentId !== '') {
        const parsedParentId = typeof rawParentId === 'string' && /^\d+$/.test(rawParentId)
            ? Number(rawParentId)
            : rawParentId;
        if (!Number.isSafeInteger(parsedParentId) || parsedParentId < 1) {
            return respondCommentError(req, res, next, 'No se puede responder a ese comentario.');
        }
        parentId = parsedParentId;
    }

    try {
        const postId = Number(req.params.id);
        if (!Number.isSafeInteger(postId) || postId < 1) {
            return res.status(404).send('Post no encontrado.');
        }

        const post = await prisma.post.findFirst({
            where: { AND: [publicPostWhere, { id: postId }] },
            select: { id: true },
        });
        if (!post) return res.status(404).send('Post no encontrado.');

        let blockedEmails;
        if (parentId !== null) {
            blockedEmails = await getBlockedEmails();
            const parent = await prisma.comment.findFirst({
                where: {
                    id: parentId,
                    postId,
                    parentId: null,
                    ...publicCommentWhere(blockedEmails),
                },
                select: { id: true },
            });
            if (!parent) {
                return respondCommentError(req, res, next, 'El comentario al que intentas responder ya no está disponible.', 404);
            }
        }

        const comment = await prisma.comment.create({
            data: {
                postId,
                name: req.session.user.name,
                email: req.session.user.email,
                message: message.trim(),
                parentId,
            },
            select: { name: true, message: true, createdAt: true, parentId: true },
        });
        if (wantsJsonResponse(req)) {
            blockedEmails ??= await getBlockedEmails();
            const commentsCount = await prisma.comment.count({
                where: { postId, ...publicCommentWhere(blockedEmails) },
            });
            return res.status(201).json({ comment, commentsCount });
        }
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
