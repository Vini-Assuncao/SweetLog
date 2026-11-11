const test = require('node:test')
const assert = require('node:assert/strict')
const MatriculaService = require('../src/services/MatriculaService')

test('funcionário não pode alterar ou excluir a própria matrícula', async () => {
    await assert.rejects(
        MatriculaService.atualizar(1234, { setor: 'RH' }, 1234),
        error => error.status === 403
    )
    await assert.rejects(
        MatriculaService.deletar(1234, 1234),
        error => error.status === 403
    )
})
