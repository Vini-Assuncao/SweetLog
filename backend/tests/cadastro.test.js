const test = require('node:test')
const assert = require('node:assert/strict')
const express = require('express')
const FuncionarioController = require('../src/controllers/FuncionarioController')
const { limitarTentativasCadastro } = require('../src/middlewares/loginRateLimit')

test('cadastro público aceita uma matrícula sem exigir autenticação', async () => {
    const cadastrarOriginal = FuncionarioController.cadastrar
    FuncionarioController.cadastrar = (req, res) => res.json({ sucesso: true })
    const app = express()
    app.use(express.json())
    app.use('/funcionarios', require('../src/routes/funcionarioRoutes'))
    const server = app.listen(0)

    try {
        const { port } = server.address()
        const cadastro = await fetch(`http://127.0.0.1:${port}/funcionarios/cadastro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numero_matricula: 12345 })
        })
        assert.equal(cadastro.status, 200)
        assert.deepEqual(await cadastro.json(), { sucesso: true })

        const listagem = await fetch(`http://127.0.0.1:${port}/funcionarios`)
        assert.equal(listagem.status, 401)
    } finally {
        FuncionarioController.cadastrar = cadastrarOriginal
        await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    }
})

test('cadastro público limita tentativas por endereço IP', () => {
    const req = { ip: `teste-${Date.now()}`, socket: { remoteAddress: '127.0.0.1' } }
    let chamadasNext = 0
    const res = {
        statusCode: 200,
        headers: {},
        status(codigo) { this.statusCode = codigo; return this },
        setHeader(nome, valor) { this.headers[nome] = valor },
        json(corpo) { this.corpo = corpo; return this }
    }

    for (let tentativa = 0; tentativa < 10; tentativa += 1) {
        limitarTentativasCadastro(req, res, () => { chamadasNext += 1 })
    }
    limitarTentativasCadastro(req, res, () => { chamadasNext += 1 })

    assert.equal(chamadasNext, 10)
    assert.equal(res.statusCode, 429)
    assert.ok(Number(res.headers['Retry-After']) > 0)
    assert.match(res.corpo.mensagem, /tentativas de cadastro/i)
})
