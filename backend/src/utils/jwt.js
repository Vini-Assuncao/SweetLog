const crypto = require('crypto')

const ALGORITHM = 'HS256'
const ISSUER = 'sweetlog-api'
const DEFAULT_TTL_SECONDS = 8 * 60 * 60
let avisoChaveFracaExibido = false

function obterSegredo() {
    const segredo = process.env.JWT_SECRET
    if (typeof segredo !== 'string' || segredo.length < 12) {
        throw new Error('JWT_SECRET não configurado ou muito curto. Configure uma chave com pelo menos 12 caracteres (recomenda-se 32 ou mais).')
    }
    return segredo
}

function codificar(valor) {
    return Buffer.from(JSON.stringify(valor)).toString('base64url')
}

function assinar(conteudo) {
    return crypto.createHmac('sha256', obterSegredo()).update(conteudo).digest('base64url')
}

function gerarTokenFuncionario(funcionario, ttlSeconds = DEFAULT_TTL_SECONDS) {
    const agora = Math.floor(Date.now() / 1000)
    const header = codificar({ alg: ALGORITHM, typ: 'JWT' })
    const payload = codificar({
        sub: String(funcionario.numero_matricula),
        iat: agora,
        exp: agora + ttlSeconds,
        iss: ISSUER
    })
    const conteudo = `${header}.${payload}`
    return `${conteudo}.${assinar(conteudo)}`
}

function verificarToken(token) {
    if (typeof token !== 'string') throw new Error('Token inválido')
    const partes = token.split('.')
    if (partes.length !== 3) throw new Error('Token inválido')

    const [headerCodificado, payloadCodificado, assinatura] = partes
    const conteudo = `${headerCodificado}.${payloadCodificado}`
    const assinaturaEsperada = assinar(conteudo)
    const assinaturaRecebidaBuffer = Buffer.from(assinatura)
    const assinaturaEsperadaBuffer = Buffer.from(assinaturaEsperada)
    if (
        assinaturaRecebidaBuffer.length !== assinaturaEsperadaBuffer.length ||
        !crypto.timingSafeEqual(assinaturaRecebidaBuffer, assinaturaEsperadaBuffer)
    ) throw new Error('Token inválido')

    let header
    let payload
    try {
        header = JSON.parse(Buffer.from(headerCodificado, 'base64url').toString('utf8'))
        payload = JSON.parse(Buffer.from(payloadCodificado, 'base64url').toString('utf8'))
    } catch {
        throw new Error('Token inválido')
    }

    const agora = Math.floor(Date.now() / 1000)
    if (header.alg !== ALGORITHM || header.typ !== 'JWT' || payload.iss !== ISSUER) {
        throw new Error('Token inválido')
    }
    if (!Number.isInteger(payload.exp) || payload.exp <= agora) throw new Error('Token expirado')
    if (!/^\d+$/.test(String(payload.sub || ''))) throw new Error('Token inválido')

    return payload
}

module.exports = { gerarTokenFuncionario, verificarToken, DEFAULT_TTL_SECONDS }
