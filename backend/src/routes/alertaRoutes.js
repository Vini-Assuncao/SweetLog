const express = require('express')
const router = express.Router()
const AlertaController = require('../controllers/AlertaController')
const { autenticar, autorizar, CARGOS } = require('../middlewares/auth')

router.use(autenticar, autorizar(CARGOS.ADMINISTRADOR, CARGOS.COMPRAS, CARGOS.ALMOXARIFADO))

router.get('/', AlertaController.listar)
router.get('/:id', AlertaController.buscarPorId)

module.exports = router
