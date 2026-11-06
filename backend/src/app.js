require('dotenv').config()

const express = require('express')
const cors = require('cors')
const path = require('path')
const routes = require('./routes')
const errorHandler = require('./middlewares/errorHandler')

const app = express()

const origensPermitidas = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origem => origem.trim()).filter(Boolean)
    : true

app.use(cors({ origin: origensPermitidas }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use('/public', express.static(path.join(__dirname, '..', 'public')))

app.use('/', routes)

app.use((req, res) => {
    res.status(404).json({
        sucesso: false,
        mensagem: `Rota não encontrada: ${req.method} ${req.originalUrl}`
    })
})

app.use(errorHandler)

module.exports = app
