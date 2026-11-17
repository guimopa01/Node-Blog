const prisma = require('../config/prisma');

const publicPostWhere = {
    OR: [
        { userId: null },
        { user: { isBlocked: false } },
    ],
};

const getBlockedEmails = async () => {
    const blockedUsers = await prisma.user.findMany({
        where: { isBlocked: true },
        select: { email: true },
    });
    return blockedUsers.map(({ email }) => email.toLowerCase());
};

const publicCommentWhere = (blockedEmails) => ({
    email: { notIn: blockedEmails },
    OR: [
        { parentId: null },
        { parent: { email: { notIn: blockedEmails } } },
    ],
});

const publicPostCount = (blockedEmails) => ({
    select: {
        likes: { where: { user: { isBlocked: false } } },
        comments: { where: publicCommentWhere(blockedEmails) },
    },
});

const publicPostListQuery = (blockedEmails) => ({
    where: publicPostWhere,
    include: {
        user: { select: { name: true } },
        category: { select: { name: true } },
        images: { take: 1 },
        _count: publicPostCount(blockedEmails),
    },
    orderBy: { createdAt: 'desc' },
});

module.exports = {
    getBlockedEmails,
    publicCommentWhere,
    publicPostCount,
    publicPostListQuery,
    publicPostWhere,
};
