const db = require('../src/config/db');

exports.login = (req, res) => {
  const { nombre, password } = req.body;

  // Validar que los campos requeridos estén presentes
  if (!nombre || !password) {
    return res.status(400).render('login', { 
      title: 'Login',
      error: 'Por favor ingrese nombre de usuario y contraseña'
    });
  }

  // Modo de desarrollo: loguear sin BD
  if (process.env.USE_MOCK_DATA === 'true') {
    // Crear sesión de demostración
    req.session.usuarioId = 1;
    req.session.usuarioNombre = nombre;
    req.session.idPerfil = 1; // Admin por defecto en desarrollo

    return res.redirect('/menu-principal');
  }

  // Modo producción: consultar a la BD
  const query = 'SELECT id_usuario, nombre, password, id_perfil FROM usuario WHERE nombre = ?';

  db.query(query, [nombre], (err, results) => {
    if (err) {
      return res.status(500).render('login', { 
        title: 'Login',
        error: 'Error en el servidor'
      });
    }

    // Validar que el usuario exista
    if (results.length === 0) {
      return res.status(401).render('login', { 
        title: 'Login',
        error: 'Usuario o contraseña incorrectos'
      });
    }

    const usuario = results[0];

    // Validar la contraseña
    if (usuario.password !== password) {
      return res.status(401).render('login', { 
        title: 'Login',
        error: 'Usuario o contraseña incorrectos'
      });
    }

    // Login exitoso - crear sesión
    req.session.usuarioId = usuario.id_usuario;
    req.session.usuarioNombre = usuario.nombre;
    req.session.idPerfil = usuario.id_perfil;

    // Redirigir al menú principal
    res.redirect('/menu-principal');
  });
};

exports.logout = (req, res) => {
  req.session = null;
  res.redirect('/login');
};
