const express = require('express')
const router = express.Router()
const LoteController = require('../controllers/LoteController')
const { autenticar, autorizar, CARGOS } = require('../middlewares/auth')

router.use(autenticar, autorizar(
    CARGOS.ADMINISTRADOR,
    CARGOS.ALMOXARIFADO,
    CARGOS.LOGISTICA,
    CARGOS.COMPRAS
))

router.get('/resumo', LoteController.resumo)
router.get('/produto/:idProduto', LoteController.listarDoProduto)
router.get('/', LoteController.listar)
router.get('/:id', LoteController.buscarPorId)

module.exports = router
