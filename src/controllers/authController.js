const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');

// Muestra la vista de registro
const getRegister = (req, res) => {
    res.render('auth/register', { title: 'Registrarse' });
};

// Procesa el registro de usuario
const postRegister = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Encriptar la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear usuario en la base de datos con Prisma
        await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword
            }
        });

        res.redirect('/auth/login');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al registrar el usuario (¿El correo ya existe?)');
    }
};

module.exports = { getRegister, postRegister };

const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');

// ... (mantén tus funciones de register aquí)

// Muestra la vista de login
const getLogin = (req, res) => {
    res.render('auth/login', { title: 'Iniciar Sesión' });
};

// Procesa el inicio de sesión
const postLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar al usuario por correo
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).send('Correo o contraseña incorrectos');
        }

        // Verificar la contraseña con bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).send('Correo o contraseña incorrectos');
        }

        // Guardar los datos del usuario en la sesión
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al iniciar sesión');
    }
};

// Cerrar sesión
const logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
};

module.exports = { getRegister, postRegister, getLogin, postLogin, logout };