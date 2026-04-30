const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');

router.get('/', usuariosController.getUsuarios);
router.post('/', usuariosController.createUsuario);
router.post('/actualizar', usuariosController.updateUsuario);
router.post('/borrar', usuariosController.deleteUsuario);
router.get('/log', usuariosController.getLogUsuarios);

module.exports = router;