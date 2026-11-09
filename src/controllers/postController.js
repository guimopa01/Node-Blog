const prisma = require('../config/prisma');

const storePost = async (req, res) => {
    try {
        const { title, content, categoryId } = req.body;

        // Generar slug
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        const authorId = req.session && req.session.user ? req.session.user.id : 1; // Usuario por defecto temporal

        // Estructura base de datos a crear
        const postData = {
            title,
            slug,
            content,
            categoryId: parseInt(categoryId),
            authorId
        };

        // Si Multer procesó un archivo, lo añadimos a la relación con Prisma
        if (req.file) {
            const imageUrl = `/uploads/${req.file.filename}`;
            postData.images = {
                create: {
                    url: imageUrl
                }
            };
        }

        // Creamos el post (y la imagen al mismo tiempo si existe)
        await prisma.post.create({
            data: postData
        });

        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al guardar el post');
    }
};

module.exports = { storePost }; // (Mantén tus otras funciones del controlador aquí)