const express = require('express')
const router = express.Router()

const funcionarioRoutes = require('./funcionarioRoutes')
const produtoRoutes = require('./produtoRoutes')

router.get('/', (req, res) => {
    res.json({
        mensagem: "🍪 API SweetLog funcionando",
        versao: "1.0.0",
    })
})

router.use('/funcionarios', funcionarioRoutes)
router.use('/produtos', produtoRoutes)

module.exports = router
