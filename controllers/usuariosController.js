const crypto = require('crypto');
const db = require('../src/config/db');

const profileLabels = {
  1: 'Admin',
  2: 'Kiosco',
  3: 'Panadería',
  4: 'Kiosco + Panadería'
};

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

function renderUsuariosPage(res, payload = {}) {
  const {
    users = [],
    formValues = {},
    editValues = {},
    successMessage = null,
    errorMessage = null,
    activeTab = 'gestion'
  } = payload;

  res.render('usuarios', {
    title: 'Gestión de Usuarios',
    users,
    formValues,
    editValues,
    successMessage,
    errorMessage,
    activeTab
  });
}

function mapUsuarioPerfil(usuario) {
  return {
    ...usuario,
    perfil_nombre: profileLabels[usuario.id_perfil] || 'Desconocido'
  };
}

exports.getUsuarios = (req, res) => {
  const query = 'SELECT id_usuario, nombre, id_perfil FROM usuario ORDER BY nombre';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al cargar usuarios:', err);
      return renderUsuariosPage(res, {
        errorMessage: 'Error al cargar usuarios.'
      });
    }

    const users = results.map(mapUsuarioPerfil);
    renderUsuariosPage(res, { users });
  });
};

exports.createUsuario = (req, res) => {
  const nombre = (req.body.nombre || '').trim();
  const password = (req.body.password || '').trim();
  const perfilRaw = req.body.perfil;
  const perfilValues = Array.isArray(perfilRaw)
    ? perfilRaw
    : perfilRaw
      ? [perfilRaw]
      : [];

  const isAdmin = perfilValues.includes('1');
  const hasKiosco = perfilValues.includes('2');
  const hasPanaderia = perfilValues.includes('3');

  let perfilId = null;
  if (isAdmin) {
    perfilId = 1;
  } else if (hasKiosco && hasPanaderia) {
    perfilId = 4;
  } else if (hasKiosco) {
    perfilId = 2;
  } else if (hasPanaderia) {
    perfilId = 3;
  }

  const formValues = {
    nombre,
    perfil: perfilValues,
    admin: isAdmin,
    kiosco: hasKiosco,
    panaderia: hasPanaderia
  };

  if (!nombre || !password) {
    return renderUsuariosPage(res, {
      errorMessage: 'Debe ingresar nombre y contraseña.',
      formValues,
      activeTab: 'gestion'
    });
  }

  if (!perfilId) {
    return renderUsuariosPage(res, {
      errorMessage: 'Debe seleccionar al menos un permiso válido.',
      formValues,
      activeTab: 'gestion'
    });
  }

  const checkQuery = 'SELECT COUNT(*) AS count FROM usuario WHERE nombre = ?';
  db.query(checkQuery, [nombre], (err, results) => {
    if (err) {
      console.error('Error al validar usuario existente:', err);
      return renderUsuariosPage(res, {
        errorMessage: 'Error al crear el usuario. Intente nuevamente.',
        formValues,
        activeTab: 'gestion'
      });
    }

    if (results[0].count > 0) {
      return renderUsuariosPage(res, {
        errorMessage: 'Ya existe un usuario con ese nombre.',
        formValues,
        activeTab: 'gestion'
      });
    }

    const hashedPassword = hashPassword(password);
    const insertQuery = 'INSERT INTO usuario (nombre, password, id_perfil) VALUES (?, ?, ?)';
    db.query(insertQuery, [nombre, hashedPassword, perfilId], (err) => {
      if (err) {
        console.error('Error al crear usuario:', err);
        return renderUsuariosPage(res, {
          errorMessage: 'Error al crear el usuario. Intente nuevamente.',
          formValues,
          activeTab: 'gestion'
        });
      }

      const query = 'SELECT id_usuario, nombre, id_perfil FROM usuario ORDER BY nombre';
      db.query(query, (err, results) => {
        if (err) {
          console.error('Error al cargar usuarios tras crear uno nuevo:', err);
          return renderUsuariosPage(res, {
            errorMessage: 'Usuario creado, pero no se pudieron cargar los usuarios.',
            formValues: {},
            activeTab: 'gestion'
          });
        }

        const users = results.map(mapUsuarioPerfil);
        renderUsuariosPage(res, {
          users,
          formValues: {},
          successMessage: 'Usuario creado correctamente.',
          activeTab: 'gestion'
        });
      });
    });
  });
};

function computePerfilId(perfilValues) {
  const isAdmin = perfilValues.includes('1');
  const hasKiosco = perfilValues.includes('2');
  const hasPanaderia = perfilValues.includes('3');

  if (isAdmin) {
    return 1;
  }
  if (hasKiosco && hasPanaderia) {
    return 4;
  }
  if (hasKiosco) {
    return 2;
  }
  if (hasPanaderia) {
    return 3;
  }

  return null;
}

exports.updateUsuario = (req, res) => {
  const idUsuario = parseInt(req.body.id_usuario, 10);
  const nombre = (req.body.nombre || '').trim();
  const password = (req.body.password || '').trim();
  const perfilRaw = req.body.perfil;
  const perfilValues = Array.isArray(perfilRaw)
    ? perfilRaw
    : perfilRaw
      ? [perfilRaw]
      : [];

  const perfilId = computePerfilId(perfilValues);
  const editValues = {
    id_usuario: idUsuario,
    nombre,
    perfil: perfilValues,
    admin: perfilValues.includes('1'),
    kiosco: perfilValues.includes('2'),
    panaderia: perfilValues.includes('3')
  };

  if (!idUsuario || !nombre) {
    return renderUsuariosPage(res, {
      errorMessage: 'Debe seleccionar un usuario válido y completar el nombre.',
      editValues,
      activeTab: 'usuarios'
    });
  }

  if (!perfilId) {
    return renderUsuariosPage(res, {
      errorMessage: 'Debe seleccionar al menos un permiso válido.',
      editValues,
      activeTab: 'usuarios'
    });
  }

  const checkQuery = 'SELECT COUNT(*) AS count FROM usuario WHERE nombre = ? AND id_usuario <> ?';
  db.query(checkQuery, [nombre, idUsuario], (err, results) => {
    if (err) {
      console.error('Error al validar usuario existente:', err);
      return renderUsuariosPage(res, {
        errorMessage: 'Error al actualizar el usuario. Intente nuevamente.',
        editValues,
        activeTab: 'usuarios'
      });
    }

    if (results[0].count > 0) {
      return renderUsuariosPage(res, {
        errorMessage: 'Ya existe otro usuario con ese nombre.',
        editValues,
        activeTab: 'usuarios'
      });
    }

    const selectPasswordQuery = 'SELECT password FROM usuario WHERE id_usuario = ?';
    db.query(selectPasswordQuery, [idUsuario], (err, results) => {
      if (err || results.length === 0) {
        console.error('Error al cargar usuario para actualizar:', err);
        return renderUsuariosPage(res, {
          errorMessage: 'Error al actualizar el usuario. Intente nuevamente.',
          editValues,
          activeTab: 'usuarios'
        });
      }

      const currentPassword = results[0].password;
      const passwordToStore = password ? hashPassword(password) : currentPassword;
      const updateQuery = 'UPDATE usuario SET nombre = ?, password = ?, id_perfil = ? WHERE id_usuario = ?';
      db.query(updateQuery, [nombre, passwordToStore, perfilId, idUsuario], (err) => {
        if (err) {
          console.error('Error al actualizar usuario:', err);
          return renderUsuariosPage(res, {
            errorMessage: 'Error al actualizar el usuario. Intente nuevamente.',
            editValues,
            activeTab: 'usuarios'
          });
        }

        const query = 'SELECT id_usuario, nombre, id_perfil FROM usuario ORDER BY nombre';
        db.query(query, (err, results) => {
          if (err) {
            console.error('Error al recargar usuarios tras actualización:', err);
            return renderUsuariosPage(res, {
              errorMessage: 'Usuario actualizado, pero no se pudieron cargar los usuarios.',
              editValues: {},
              activeTab: 'usuarios'
            });
          }

          const users = results.map(mapUsuarioPerfil);
          renderUsuariosPage(res, {
            users,
            editValues: {},
            successMessage: 'Usuario actualizado correctamente.',
            activeTab: 'usuarios'
          });
        });
      });
    });
  });
};

exports.deleteUsuario = (req, res) => {
  const idUsuario = parseInt(req.body.id_usuario, 10);

  if (!idUsuario) {
    return renderUsuariosPage(res, {
      errorMessage: 'Debe seleccionar un usuario válido para borrar.',
      activeTab: 'usuarios'
    });
  }

  const deleteQuery = 'DELETE FROM usuario WHERE id_usuario = ?';
  db.query(deleteQuery, [idUsuario], (err) => {
    if (err) {
      console.error('Error al borrar usuario:', err);
      return renderUsuariosPage(res, {
        errorMessage: 'Error al borrar el usuario. Intente nuevamente.',
        activeTab: 'usuarios'
      });
    }

    const query = 'SELECT id_usuario, nombre, id_perfil FROM usuario ORDER BY nombre';
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error al recargar usuarios tras borrar uno:', err);
        return renderUsuariosPage(res, {
          errorMessage: 'Usuario borrado, pero no se pudieron cargar los usuarios.',
          activeTab: 'usuarios'
        });
      }

      const users = results.map(mapUsuarioPerfil);
      renderUsuariosPage(res, {
        users,
        successMessage: 'Usuario borrado correctamente.',
        activeTab: 'usuarios'
      });
    });
  });
};

exports.getLogUsuarios = (req, res) => {
  const query = `SELECT l.id, l.user_id, l.login_time, l.logout_time, u.nombre 
    FROM log l 
    LEFT JOIN usuario u ON u.id_usuario = l.user_id 
    ORDER BY l.login_time DESC 
    LIMIT 100`;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener log de usuarios:', err);
      return res.status(500).json({ error: 'Error al obtener log de usuarios' });
    }

    res.json(results);
  });
};