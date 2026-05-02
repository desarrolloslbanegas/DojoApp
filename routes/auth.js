const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/login', (req, res) => {
  if (req.session && req.session.usuarioNombre) {
    return res.redirect('/menu-principal');
  }
  res.render('login', { title: 'Login', error: false });
});

router.post('/login', authController.login);

router.get('/logout', authController.logout);

module.exports = router;
