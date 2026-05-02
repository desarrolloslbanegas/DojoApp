const crypto = require('crypto');
const db = require('../src/config/db');

function verifyPassword(password, storedPassword) {
  if (typeof storedPassword !== 'string' || !storedPassword.includes(':')) {
    return false;
  }

  const [salt, key] = storedPassword.split(':');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derivedKey, 'hex'));
}

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

    // Registrar login en la tabla log (modo mock)
    const insertLog = 'INSERT INTO log (user_id, login_time) VALUES (?, NOW())';
    db.query(insertLog, [1], (err) => {
      if (err) {
        console.error('Error al registrar login en log:', err);
      }
    });

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
    const isPasswordValid = typeof usuario.password === 'string' && usuario.password.includes(':')
      ? verifyPassword(password, usuario.password)
      : usuario.password === password;

    if (!isPasswordValid) {
      return res.status(401).render('login', { 
        title: 'Login',
        error: 'Usuario o contraseña incorrectos'
      });
    }

    // Login exitoso - crear sesión
    req.session.usuarioId = usuario.id_usuario;
    req.session.usuarioNombre = usuario.nombre;
    req.session.idPerfil = usuario.id_perfil;

    // Registrar login en la tabla log
    const insertLog = 'INSERT INTO log (user_id, login_time) VALUES (?, NOW())';
    db.query(insertLog, [usuario.id_usuario], (err) => {
      if (err) {
        console.error('Error al registrar login en log:', err);
      }
    });

    // Redirigir al menú principal
    res.redirect('/menu-principal');
  });
};

exports.logout = (req, res) => {
  const usuarioId = req.session.usuarioId;

  if (usuarioId) {
    // Actualizar logout_time en la tabla log
    const updateLog = 'UPDATE log SET logout_time = NOW() WHERE user_id = ? AND logout_time IS NULL ORDER BY login_time DESC LIMIT 1';
    db.query(updateLog, [usuarioId], (err) => {
      if (err) {
        console.error('Error al registrar logout en log:', err);
      }
    });
  }

  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error al destruir la sesión:', err);
      }
      res.clearCookie('dojoapp_session');
      res.redirect('/login');
    });
  } else {
    res.redirect('/login');
  }
};
