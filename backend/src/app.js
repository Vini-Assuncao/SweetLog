const express = require('express')
const cors = require('cors')
const app = express()
const routes = require('./routes')
const path = require('path')

app.use(cors())
app.use(express.json({ limit: "10mb" }))

app.use('/public', express.static(path.join(__dirname, '..', 'public')));

app.use('/', routes)

module.exports = app