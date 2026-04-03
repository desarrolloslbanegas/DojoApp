const express = require('express');
const router = express.Router();
const kioscoController = require('../controllers/kioscoController');

router.get('/', kioscoController.getKiosco);
router.get('/buscar/:nombre', kioscoController.buscarProductoPorNombre);
module.exports = router;