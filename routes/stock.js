const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');

router.get('/', stockController.getStock);
router.post('/producto', stockController.guardarProducto);

module.exports = router;