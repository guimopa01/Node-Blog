const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();

// Configuración de EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Middlewares globales
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Importar Enrutadores
const postRoutes = require('./src/routes/postRoutes');
const authRoutes = require('./src/routes/authRoutes');

// Usar Rutas
app.use('/', postRoutes);          // Maneja la home ('/') y la creación de posts
app.use('/auth', authRoutes);      // Maneja '/auth/register', etc.

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

const session = require('express-session');

// ... (tus otras configuraciones de express, ejs y estáticos)

// Configuración de Express Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'clave_secreta_super_segura',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Pon true si usas HTTPS en producción
}));

// Middleware global para hacer disponible el usuario en todas las vistas EJS
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});