const express = require('express');
const path = require('path');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cookieParser = require('cookie-parser');
require('dotenv').config();

const db = require('./src/config/db.js');


const kioscoController = require('./controllers/kioscoController');
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

// Cookies
app.use(cookieParser());

// Servir archivos estáticos desde /src para imágenes y recursos simples
app.use('/src', express.static(path.join(__dirname, 'src')));

// Configurar sesiones
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
// En producción require SESSION_SECRET
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  console.error('ERROR: SESSION_SECRET no está configurada en entorno de producción');
  process.exit(1);
}
const sessionStore = new MySQLStore({}, db);
app.use(session({
  key: 'dojoapp_session',
  secret: process.env.SESSION_SECRET || 'mi_clave_secreta_muy_segura_para_dojo_app_2024',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8, // 8hs de cookie
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

// Middleware para verificar acceso a kiosco (id_perfil = 1, 2 o 4)
const requireKioscoAccess = (req, res, next) => {
  if (!req.session || !req.session.usuarioNombre) {
    return res.redirect('/login');
  }
  if (![1, 2, 4].includes(req.session.idPerfil)) {
    return res.status(403).render('acceso-denegado', { 
      title: 'Acceso Denegado',
      mensaje: 'No tienes permiso para acceder a Kiosco.'
    });
  }
  next();
};

// Middleware para verificar acceso a panaderia (id_perfil = 1, 3 o 4)
const requirePanaderiaAccess = (req, res, next) => {
  if (!req.session || !req.session.usuarioNombre) {
    return res.redirect('/login');
  }
  if (![1, 3, 4].includes(req.session.idPerfil)) {
    return res.status(403).render('acceso-denegado', { 
      title: 'Acceso Denegado',
      mensaje: 'No tienes permiso para acceder a Panadería.'
    });
  }
  next();
};

// Middleware para verificar que sea admin o vendedor general (id_perfil = 1, 2 o 4)
const requireAdminOrVendedor = (req, res, next) => {
  if (!req.session || !req.session.usuarioNombre) {
    return res.redirect('/login');
  }
  if (![1, 2, 4].includes(req.session.idPerfil)) {
    return res.status(403).render('acceso-denegado', { 
      title: 'Acceso Denegado',
      mensaje: 'No tienes permiso para acceder a esta sección.'
    });
  }
  next();
};

app.use(authRouter);
app.use('/menu-principal', requireAuth, menuPrincipalRouter);
app.get('/kiosco/historial', requireAdmin, kioscoController.getHistorialVentas);
app.use('/kiosco', requireKioscoAccess, kioscoRouter);
app.use('/panaderia', requirePanaderiaAccess, panaderiaRouter);
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
  // Sólo exponer información de sesión en entornos no productivos
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).send('Not Found');
  }
  res.json({
    session: req.session,
    sessionID: req.sessionID,
    cookies: req.cookies
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).render('acceso-denegado', { title: 'No encontrado', mensaje: 'Recurso no encontrado.' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('acceso-denegado', { title: 'Error', mensaje: 'Error interno del servidor.' });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
