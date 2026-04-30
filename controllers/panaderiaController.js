exports.getPanaderia = (req, res) => {
  const usuario = req.session.usuarioNombre || 'Usuario';
  const idPerfil = req.session.idPerfil;
  const esAdmin = idPerfil === 1;
  const hasKiosco = [1, 2, 4].includes(idPerfil);
  const hasPanaderia = [1, 3, 4].includes(idPerfil);

  res.render('panaderia', {
    title: 'Panadería',
    usuario,
    idPerfil,
    esAdmin,
    hasKiosco,
    hasPanaderia
  });
};