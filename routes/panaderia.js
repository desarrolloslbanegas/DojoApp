const express = require('express');
const router = express.Router();
const panaderiaController = require('../controllers/panaderiaController');

router.get('/', panaderiaController.getPanaderia);
router.get('/buscar/:nombre', panaderiaController.buscarProductoPorNombre);
router.post('/venta', panaderiaController.registrarVenta);
router.post('/venta-cancelada', panaderiaController.registrarVentaCancelada);

module.exports = router;
