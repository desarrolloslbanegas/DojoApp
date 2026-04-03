const express = require('express');
const router = express.Router();
const panaderiaController = require('../controllers/panaderiaController');

router.get('/', panaderiaController.getPanaderia);

module.exports = router;