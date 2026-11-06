const fs = require('fs').promises
const path = require('path')

const diretorioPublico = path.resolve(__dirname, '..', '..', 'public')

function caminhoPublico(tipo, nomeArquivo) {
    const nomeSeguro = path.basename(nomeArquivo || '')
    return `/public/uploads/${tipo}/${nomeSeguro}`
}

function normalizarUrlPublica(caminhoSalvo) {
    if (!caminhoSalvo) return null
    let caminho = String(caminhoSalvo).replace(/\\/g, '/')
    caminho = caminho.replace(/^https?:\/\/[^/]+/i, '')
    const marcador = caminho.indexOf('/public/uploads/')
    if (marcador >= 0) return caminho.slice(marcador)
    if (caminho.startsWith('backend/public/uploads/')) return `/${caminho.slice('backend'.length + 1)}`
    if (caminho.startsWith('public/uploads/')) return `/${caminho}`
    if (caminho.startsWith('uploads/')) return `/public/${caminho}`
    return caminho
}

async function validarAssinaturaArquivo(file, tipo) {
    if (!file || !file.path) throw { status: 400, mensagem: 'Arquivo obrigatório' }

    const assinaturas = {
        imagem: buffer => (
            (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) ||
            buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
        ),
        pdf: buffer => buffer.subarray(0, 5).toString('ascii') === '%PDF-'
    }

    const validar = assinaturas[tipo]
    if (!validar) throw new Error('Tipo de arquivo não suportado na validação')

    const arquivo = await fs.open(file.path, 'r')
    try {
        const buffer = Buffer.alloc(8)
        const { bytesRead } = await arquivo.read(buffer, 0, buffer.length, 0)
        if (bytesRead < 5 || !validar(buffer)) {
            throw { status: 400, mensagem: tipo === 'pdf'
                ? 'O arquivo enviado não é um PDF válido'
                : 'O arquivo enviado não é uma imagem JPEG ou PNG válida' }
        }
    } finally {
        await arquivo.close()
    }
}

async function removerUpload(file) {
    if (!file || !file.path) return
    try {
        await fs.unlink(file.path)
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Erro ao remover arquivo enviado:', error.message)
        }
    }
}

async function removerArquivoSalvo(caminhoSalvo) {
    if (!caminhoSalvo) return

    let caminho = String(caminhoSalvo).replace(/\\/g, '/')
    caminho = caminho.replace(/^https?:\/\/[^/]+/i, '')
    caminho = caminho.replace(/^\/?public\//i, '')
    caminho = caminho.replace(/^\/?backend\/public\//i, '')
    caminho = caminho.replace(/^\/?uploads\//i, 'uploads/')
    caminho = caminho.replace(/^\/+/, '')

    const destino = path.resolve(diretorioPublico, caminho)
    if (destino !== diretorioPublico && !destino.startsWith(`${diretorioPublico}${path.sep}`)) {
        return
    }

    try {
        await fs.unlink(destino)
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Erro ao remover arquivo antigo:', error.message)
        }
    }
}

module.exports = {
    caminhoPublico,
    normalizarUrlPublica,
    validarAssinaturaArquivo,
    removerUpload,
    removerArquivoSalvo
}
