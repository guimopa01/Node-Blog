const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next(); // El usuario está autenticado, puede continuar
    }
    res.redirect('/auth/login'); // Si no, lo mandamos al login
};

module.exports = { isAuthenticated };