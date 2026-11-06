const express = require('express')
const router = express.Router()
const DashboardController = require('../controllers/DashboardController')
const { autenticar, autorizar, CARGOS } = require('../middlewares/auth')

router.use(autenticar, autorizar(
    CARGOS.ADMINISTRADOR,
    CARGOS.ADMINISTRATIVO,
    CARGOS.ALMOXARIFADO,
    CARGOS.LOGISTICA
))

router.get('/', DashboardController.resumo)
router.get('/resumo', DashboardController.resumo)

module.exports = router
