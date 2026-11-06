const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const {
    validarId,
    validarData,
    normalizarBooleano,
    opcionalTexto
} = require('../src/utils/validacao')
const { caminhoPublico, normalizarUrlPublica, validarAssinaturaArquivo } = require('../src/utils/arquivos')

test('validarId aceita identificadores inteiros positivos', () => {
    assert.equal(validarId('25'), 25)
    assert.throws(() => validarId('0'), error => error.status === 400)
    assert.throws(() => validarId('1.5'), error => error.status === 400)
    assert.throws(() => validarId('2147483648'), error => error.status === 400)
    assert.throws(() => validarId('1e3'), error => error.status === 400)
    assert.throws(() => validarId('0x10'), error => error.status === 400)
})

test('validarData valida o calendário e aceita campo opcional vazio', () => {
    assert.equal(validarData('2026-11-06'), '2026-11-06')
    assert.equal(validarData('', 'Data', false), null)
    assert.throws(() => validarData('2026-02-30'), error => error.status === 400)
    assert.throws(() => validarData('06/11/2026'), error => error.status === 400)
})

test('normalizarBooleano preserva false e rejeita valores ambíguos', () => {
    assert.equal(normalizarBooleano(false), false)
    assert.equal(normalizarBooleano('false'), false)
    assert.equal(normalizarBooleano('true'), true)
    assert.equal(normalizarBooleano('Sim'), true)
    assert.equal(normalizarBooleano('Não'), false)
    assert.equal(normalizarBooleano(0), false)
    assert.throws(() => normalizarBooleano('talvez'), error => error.status === 400)
})

test('opcionalTexto padroniza valores vazios', () => {
    assert.equal(opcionalTexto('  '), null)
    assert.equal(opcionalTexto('  texto  '), 'texto')
    assert.equal(opcionalTexto(undefined), undefined)
})

test('caminhoPublico cria URLs compatíveis com o middleware estático', () => {
    assert.equal(caminhoPublico('produtos', 'foto 1.png'), '/public/uploads/produtos/foto 1.png')
    assert.equal(caminhoPublico('notas_fiscais/entrada', '../nota.pdf'), '/public/uploads/notas_fiscais/entrada/nota.pdf')
})


test('normalizarUrlPublica corrige caminhos antigos gravados no banco', () => {
    assert.equal(
        normalizarUrlPublica('backend/public/uploads/produtos/foto.png'),
        '/public/uploads/produtos/foto.png'
    )
    assert.equal(
        normalizarUrlPublica('public\\uploads\\notas_fiscais\\nota.pdf'),
        '/public/uploads/notas_fiscais/nota.pdf'
    )
})

test('validarAssinaturaArquivo verifica o conteúdo real dos uploads', async () => {
    const diretorio = await fs.mkdtemp(path.join(os.tmpdir(), 'sweetlog-test-'))
    try {
        const pdf = path.join(diretorio, 'nota.pdf')
        const falsoPdf = path.join(diretorio, 'arquivo.pdf')
        await fs.writeFile(pdf, '%PDF-1.7\nconteudo de teste')
        await fs.writeFile(falsoPdf, 'texto comum')

        await validarAssinaturaArquivo({ path: pdf }, 'pdf')
        await assert.rejects(
            validarAssinaturaArquivo({ path: falsoPdf }, 'pdf'),
            error => error.status === 400
        )
    } finally {
        await fs.rm(diretorio, { recursive: true, force: true })
    }
})
