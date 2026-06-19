const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
    res.json({
        mensagem: "🍪 API SweetLog funcionando",
        versao: "1.0.0",
    })
})

module.exports = router
