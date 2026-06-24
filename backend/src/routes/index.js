const express = require('express')
const router = express.Router()

const funcionarioService = require('./funcionarioRoutes')

router.get('/', (req, res) => {
    res.json({
        mensagem: "🍪 API SweetLog funcionando",
        versao: "1.0.0",
    })
})

router.use('/funcionarios', funcionarioService)

module.exports = router
