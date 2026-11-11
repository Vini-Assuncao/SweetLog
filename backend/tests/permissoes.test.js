const test = require('node:test')
const assert = require('node:assert/strict')
const { CARGOS } = require('../src/utils/roles')

function resultadoAutorizacao(middleware, setor) {
    let chamouNext = false
    const res = {
        statusCode: 200,
        corpo: null,
        status(codigo) { this.statusCode = codigo; return this },
        json(corpo) { this.corpo = corpo; return this }
    }

    middleware({ user: { setor } }, res, () => { chamouNext = true })
    return { chamouNext, ...res }
}

function middlewareDaRota(router, metodo, caminho) {
    const camada = router.stack.find(item =>
        item.route?.path === caminho && item.route.methods[metodo]
    )
    assert.ok(camada, `Rota ${metodo.toUpperCase()} ${caminho} existe`)
    return camada.route.stack[0].handle
}

test('Compras pode cadastrar produtos, mas não alterá-los nem excluí-los', () => {
    const router = require('../src/routes/produtoRoutes')
    const criar = middlewareDaRota(router, 'post', '/')
    const atualizar = middlewareDaRota(router, 'put', '/:id')
    const excluir = middlewareDaRota(router, 'delete', '/:id')

    assert.equal(resultadoAutorizacao(criar, CARGOS.COMPRAS).chamouNext, true)
    assert.equal(resultadoAutorizacao(atualizar, CARGOS.COMPRAS).statusCode, 403)
    assert.equal(resultadoAutorizacao(excluir, CARGOS.COMPRAS).statusCode, 403)
})

test('Compras pode registrar entrada, mas não baixa nem altera estoque', () => {
    const router = require('../src/routes/estoqueRoutes')
    const entrada = middlewareDaRota(router, 'post', '/')
    const saida = middlewareDaRota(router, 'post', '/:id/saida')
    const atualizar = middlewareDaRota(router, 'put', '/:id')

    assert.equal(resultadoAutorizacao(entrada, CARGOS.COMPRAS).chamouNext, true)
    assert.equal(resultadoAutorizacao(saida, CARGOS.COMPRAS).statusCode, 403)
    assert.equal(resultadoAutorizacao(atualizar, CARGOS.COMPRAS).statusCode, 403)
})

test('somente Administrador e RH podem consultar ou administrar funcionários', () => {
    const router = require('../src/routes/funcionarioRoutes')
    const middlewares = router.stack.filter(layer => !layer.route)
    const autenticacao = middlewares[0]
    const autorizacao = middlewares[1]
    assert.ok(autenticacao)
    assert.ok(autorizacao)

    for (const setor of [CARGOS.ADMINISTRADOR, CARGOS.RH]) {
        assert.equal(resultadoAutorizacao(autorizacao.handle, setor).chamouNext, true)
    }
    for (const setor of [CARGOS.COMPRAS, CARGOS.ADMINISTRATIVO, CARGOS.LOGISTICA, CARGOS.ALMOXARIFADO]) {
        assert.equal(resultadoAutorizacao(autorizacao.handle, setor).statusCode, 403)
    }
})
