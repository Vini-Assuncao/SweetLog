const express = require('express')
const router = express.Router()
const AlertaController = require('../controllers/AlertaController')

router.get('/', AlertaController.listar)
router.get('/:id', AlertaController.buscarPorId)

module.exports = router
