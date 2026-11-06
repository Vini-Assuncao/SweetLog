const express = require('express')
const router = express.Router()
const SaldoDiarioController = require('../controllers/SaldoDiarioController')
const { autenticar, autorizar, CARGOS } = require('../middlewares/auth')

router.use(autenticar, autorizar(CARGOS.ADMINISTRADOR, CARGOS.ADMINISTRATIVO))

router.get('/resumo', SaldoDiarioController.resumo)
router.get('/historico', SaldoDiarioController.historico)
router.get('/exportar', SaldoDiarioController.exportar)
router.get('/', SaldoDiarioController.resumo)

module.exports = router
