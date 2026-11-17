const fs = require('node:fs/promises');
const path = require('node:path');
const prisma = require('../config/prisma');

const adminView = async (req, res, next) => {
    try {
        const [categories, users, posts] = await Promise.all([
            prisma.category.findMany({ orderBy: { name: 'asc' } }),
            prisma.user.findMany({
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    isBlocked: true,
                    createdAt: true,
                    _count: { select: { posts: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.post.findMany({
                select: {
                    id: true,
                    title: true,
                    createdAt: true,
                    user: { select: { name: true } },
                    comments: {
                        where: { parentId: null },
                        select: {
                            id: true,
                            name: true,
                            message: true,
                            createdAt: true,
                            replies: {
                                select: { id: true, name: true, message: true, createdAt: true },
                                orderBy: { createdAt: 'desc' },
                            },
                        },
                        orderBy: { createdAt: 'desc' },
                    },
                    _count: { select: { comments: true, likes: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        const notices = {
            'category-created': 'Categoría creada.',
            'category-invalid': 'Escribe un nombre de categoría de hasta 50 caracteres.',
            'category-exists': 'Ya existe una categoría con ese nombre.',
            'user-blocked': 'Cuenta bloqueada. Sus publicaciones, comentarios y me gusta ya no se muestran públicamente.',
            'user-unblocked': 'La cuenta quedó desbloqueada.',
            'user-not-found': 'No se encontró esa cuenta.',
            'user-protected': 'No puedes bloquear ni eliminar una cuenta administradora ni la tuya.',
            'user-deleted': 'Cuenta y contenido asociado eliminados.',
            'post-deleted': 'Publicación eliminada.',
            'post-not-found': 'No se encontró esa publicación.',
            'comment-deleted': 'Comentario eliminado.',
            'comment-not-found': 'No se encontró ese comentario.',
        };
        const openPostId = Number(req.query.openPost);
        res.render('admin/index', {
            title: 'Administración — Node Blog',
            categories,
            users,
            posts,
            notice: notices[req.query.notice] || null,
            openPostId: Number.isSafeInteger(openPostId) ? openPostId : null,
        });
    } catch (error) {
        next(error);
    }
};

const createCategory = async (req, res, next) => {
    const name = req.body?.name;
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 50) {
        return res.redirect('/admin?notice=category-invalid#categories');
    }

    try {
        await prisma.category.create({ data: { name: name.trim() } });
        res.redirect('/admin?notice=category-created#categories');
    } catch (error) {
        if (error.code === 'P2002') {
            return res.redirect('/admin?notice=category-exists#categories');
        }
        next(error);
    }
};

const toggleUserBlock = async (req, res, next) => {
    const userId = Number(req.params.id);
    if (!Number.isSafeInteger(userId) || userId < 1) {
        return res.redirect('/admin?notice=user-not-found#accounts');
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, isBlocked: true },
        });
        if (!user) return res.redirect('/admin?notice=user-not-found#accounts');
        if (user.role === 'ADMIN' || user.id === req.session.user.id) {
            return res.redirect('/admin?notice=user-protected#accounts');
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { isBlocked: !user.isBlocked },
        });
        res.redirect(`/admin?notice=user-${user.isBlocked ? 'unblocked' : 'blocked'}#accounts`);
    } catch (error) {
        next(error);
    }
};

const deleteUser = async (req, res, next) => {
    const userId = Number(req.params.id);
    if (!Number.isSafeInteger(userId) || userId < 1) {
        return res.redirect('/admin?notice=user-not-found#accounts');
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                role: true,
                posts: { select: { id: true, images: { select: { url: true } } } },
            },
        });
        if (!user) return res.redirect('/admin?notice=user-not-found#accounts');
        if (user.role === 'ADMIN' || user.id === req.session.user.id) {
            return res.redirect('/admin?notice=user-protected#accounts');
        }

        const postIds = user.posts.map(({ id }) => id);
        await prisma.$transaction(async (transaction) => {
            await transaction.comment.deleteMany({
                where: { OR: [{ email: user.email }, { postId: { in: postIds } }] },
            });
            await transaction.like.deleteMany({
                where: { OR: [{ userId: user.id }, { postId: { in: postIds } }] },
            });
            await transaction.image.deleteMany({ where: { postId: { in: postIds } } });
            await transaction.post.deleteMany({ where: { userId: user.id } });
            await transaction.user.delete({ where: { id: user.id } });
        });

        const images = user.posts.flatMap(({ images: postImages }) => postImages);
        await Promise.all(images.map((image) => removeUploadedImage(image.url)));
        res.redirect('/admin?notice=user-deleted#accounts');
    } catch (error) {
        if (error.code === 'P2025') {
            return res.redirect('/admin?notice=user-not-found#accounts');
        }
        next(error);
    }
};

const deleteComment = async (req, res, next) => {
    const commentId = Number(req.params.id);
    if (!Number.isSafeInteger(commentId) || commentId < 1) {
        return res.redirect('/admin?notice=comment-not-found#comments');
    }

    try {
        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
            select: { postId: true },
        });
        if (!comment) return res.redirect('/admin?notice=comment-not-found#posts');

        await prisma.comment.delete({ where: { id: commentId } });
        res.redirect(`/admin?notice=comment-deleted&openPost=${comment.postId}#post-${comment.postId}-comments`);
    } catch (error) {
        if (error.code === 'P2025') {
            return res.redirect('/admin?notice=comment-not-found#posts');
        }
        next(error);
    }
};

const removeUploadedImage = async (url) => {
    const prefix = '/uploads/';
    if (typeof url !== 'string' || !url.startsWith(prefix)) return;

    const filename = url.slice(prefix.length);
    if (!filename || filename !== path.basename(filename)) return;

    const uploadDirectory = path.resolve(__dirname, '../../public/uploads');
    const filePath = path.resolve(uploadDirectory, filename);
    if (path.dirname(filePath) !== uploadDirectory) return;

    try {
        await fs.unlink(filePath);
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
};

const deletePost = async (req, res, next) => {
    const postId = Number(req.params.id);
    if (!Number.isSafeInteger(postId) || postId < 1) {
        return res.redirect('/admin?notice=post-not-found#posts');
    }

    try {
        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { images: { select: { url: true } } },
        });
        if (!post) return res.redirect('/admin?notice=post-not-found#posts');

        await prisma.$transaction([
            prisma.comment.deleteMany({ where: { postId } }),
            prisma.like.deleteMany({ where: { postId } }),
            prisma.image.deleteMany({ where: { postId } }),
            prisma.post.delete({ where: { id: postId } }),
        ]);
        await Promise.all(post.images.map((image) => removeUploadedImage(image.url)));
        res.redirect('/admin?notice=post-deleted#posts');
    } catch (error) {
        if (error.code === 'P2025') {
            return res.redirect('/admin?notice=post-not-found#posts');
        }
        next(error);
    }
};

module.exports = {
    createCategory,
    deleteComment,
    deletePost,
    deleteUser,
    getDashboard: adminView,
    toggleUserBlock,
};
