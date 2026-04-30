exports.getMenuPrincipal = (req, res) => {
  const idPerfil = req.session.idPerfil;
  
  res.render('menuPrincipal', { 
    title: 'Menú Principal',
    usuario: req.session.usuarioNombre || 'Usuario',
    idPerfil,
    esAdmin: idPerfil === 1,
    hasKiosco: idPerfil === 1 || idPerfil === 2 || idPerfil === 4,
    hasPanaderia: idPerfil === 1 || idPerfil === 3 || idPerfil === 4
  });
};
