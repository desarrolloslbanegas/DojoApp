const express = require('express');
const router = express.Router();
const menuPrincipalController = require('../controllers/menuPrincipalController');

router.get('/', menuPrincipalController.getMenuPrincipal);

module.exports = router;