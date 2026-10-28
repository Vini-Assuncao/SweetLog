const express = require('express')
const router = express.Router()

const matriculaRoutes = require('./matriculaRoutes')
const funcionarioRoutes = require('./funcionarioRoutes')
const produtoRoutes = require('./produtoRoutes')
const estoqueRoutes = require('./estoqueRoutes')
const vendaRoutes = require('./vendaRoutes')
const alertaRoutes = require('./alertaRoutes')

router.get('/', (req, res) => {
    res.json({
        mensagem: "🍪 API SweetLog funcionando",
        versao: "1.0.0",
    })
})

router.use('/matriculas', matriculaRoutes)
router.use('/funcionarios', funcionarioRoutes)
router.use('/produtos', produtoRoutes)
router.use('/estoques', estoqueRoutes)
router.use('/vendas', vendaRoutes)
router.use('/alertas', alertaRoutes)

module.exports = router