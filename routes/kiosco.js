const express = require('express');
const router = express.Router();
const kioscoController = require('../controllers/kioscoController');

router.get('/', kioscoController.getKiosco);
router.get('/buscar/:nombre', kioscoController.buscarProductoPorNombre);
router.get('/historial', kioscoController.getHistorialVentas);
router.get('/historial/pdf', kioscoController.exportHistorialPDF);
router.post('/venta', kioscoController.registrarVenta);
module.exports = router;