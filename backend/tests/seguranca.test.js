const test = require('node:test')
const assert = require('node:assert/strict')

process.env.JWT_SECRET = 'chave-de-teste-com-mais-de-trinta-caracteres'

const { gerarTokenFuncionario, verificarToken } = require('../src/utils/jwt')
const { CARGOS, TODOS_OS_CARGOS } = require('../src/utils/roles')
const { validarCnpj, normalizarTelefone } = require('../src/utils/cadastro')

function respostaMock() {
    return {
        statusCode: 200,
        corpo: null,
        status(codigo) { this.statusCode = codigo; return this },
        json(corpo) { this.corpo = corpo; return this }
    }
}

test('JWT de funcionário é assinado, validado e rejeita alteração', () => {
    const token = gerarTokenFuncionario({ numero_matricula: 1234 })
    const payload = verificarToken(token)
    assert.equal(payload.sub, '1234')
    assert.throws(() => verificarToken(`${token.slice(0, -1)}x`), /Token inválido/)
})

test('JWT expirado é recusado', () => {
    const token = gerarTokenFuncionario({ numero_matricula: 1234 }, 0)
    assert.throws(() => verificarToken(token), /Token expirado/)
})

test('matriz de cargos contém os seis setores permitidos', () => {
    assert.deepEqual(TODOS_OS_CARGOS, [
        'Administrador', 'RH', 'Administrativo', 'Logística', 'Compras', 'Almoxarifado'
    ])
})

test('CNPJ passa pela validação dos dígitos verificadores', () => {
    assert.equal(validarCnpj('11.222.333/0001-81'), '11222333000181')
    assert.throws(() => validarCnpj('11222333000180'), error => error.status === 400)
    assert.throws(() => validarCnpj('00000000000000'), error => error.status === 400)
})

test('telefone exige DDD e 11 dígitos de celular', () => {
    assert.equal(normalizarTelefone('(11) 95389-8096'), '11953898096')
    assert.throws(() => normalizarTelefone('(11) 3234-5678'), error => error.status === 400)
    assert.throws(() => normalizarTelefone('1195388096'), error => error.status === 400)
    assert.throws(() => normalizarTelefone('123456789'), error => error.status === 400)
})
