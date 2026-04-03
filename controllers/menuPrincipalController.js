exports.getMenuPrincipal = (req, res) => {
  const idPerfil = req.session.idPerfil;
  
  res.render('menuPrincipal', { 
    title: 'Menú Principal',
    usuario: req.session.usuarioNombre || 'Usuario',
    idPerfil: idPerfil,
    esAdmin: idPerfil === 1,
    esVendedor: idPerfil === 2
  });
};
