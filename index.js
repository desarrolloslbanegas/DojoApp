const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const db = require('./src/config/db.js');


const kioscoRouter = require('./routes/kiosco');
const authRouter = require('./routes/auth');
const menuPrincipalRouter = require('./routes/menuPrincipal');
const panaderiaRouter = require('./routes/panaderia');
const stockRouter = require('./routes/stock');
const usuariosRouter = require('./routes/usuarios');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configurar sesiones
app.use(session({
  secret: 'mi_clave_secreta_muy_segura_para_dojo_app_2024',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, 
    maxAge: 1000 * 60 * 60 * 24, // 24 horas
    httpOnly: true
  }
}));

// Middleware para verificar autenticación
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.usuarioNombre) {
    return res.redirect('/login');
  }
  next();
};

// Middleware para verificar que sea administrador (id_perfil = 1)
const requireAdmin = (req, res, next) => {
  if (!req.session || !req.session.usuarioNombre) {
    return res.redirect('/login');
  }
  if (req.session.idPerfil !== 1) {
    return res.status(403).render('acceso-denegado', { 
      title: 'Acceso Denegado',
      mensaje: 'No tienes permiso para acceder a esta sección. Solo administradores.'
    });
  }
  next();
};

// Middleware para verificar que sea vendedor (id_perfil = 2)
const requireVendedor = (req, res, next) => {
  if (!req.session || !req.session.usuarioNombre) {
    return res.redirect('/login');
  }
  if (req.session.idPerfil !== 2) {
    return res.status(403).render('acceso-denegado', { 
      title: 'Acceso Denegado',
      mensaje: 'No tienes permiso para acceder a esta sección. Solo vendedores.'
    });
  }
  next();
};

// Middleware para verificar que sea admin o vendedor (id_perfil = 1 o 2)
const requireAdminOrVendedor = (req, res, next) => {
  if (!req.session || !req.session.usuarioNombre) {
    return res.redirect('/login');
  }
  if (req.session.idPerfil !== 1 && req.session.idPerfil !== 2) {
    return res.status(403).render('acceso-denegado', { 
      title: 'Acceso Denegado',
      mensaje: 'No tienes permiso para acceder a esta sección.'
    });
  }
  next();
};

app.use(authRouter);
app.use('/menu-principal', requireAuth, menuPrincipalRouter);
app.use('/kiosco', requireAdminOrVendedor, kioscoRouter);
app.use('/panaderia', requireAdminOrVendedor, panaderiaRouter);
app.use('/stock', requireAdmin, stockRouter);
app.use('/usuarios', requireAdmin, usuariosRouter);

app.get('/', (req, res) => {
  // Si hay sesión, ir al menú principal, sino al login
  if (req.session && req.session.usuarioNombre) {
    res.redirect('/menu-principal');
  } else {
    res.redirect('/login');
  }
});

app.get('/debug-session', (req, res) => {
  res.json({
    session: req.session,
    sessionID: req.sessionID,
    cookies: req.cookies
  });
});

app.listen(PORT, () => {
});
