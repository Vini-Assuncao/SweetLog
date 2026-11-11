const tentativasPorIp = new Map()
const cadastrosPorIp = new Map()
const JANELA_MS = 15 * 60 * 1000
const MAX_TENTATIVAS = 10

function limitarTentativasLogin(req, res, next) {
    const agora = Date.now()
    const ip = req.ip || req.socket.remoteAddress || 'desconhecido'
    const matricula = String(req.body?.numero_matricula || 'sem-matricula')
    const chave = `${ip}:${matricula}`

    // Remove entradas expiradas para evitar crescimento indefinido do mapa.
    for (const [chave, registro] of tentativasPorIp.entries()) {
        if (registro.inicio + JANELA_MS <= agora) tentativasPorIp.delete(chave)
    }

    req.limparTentativasLogin = () => tentativasPorIp.delete(chave)
    const registro = tentativasPorIp.get(chave)
    if (!registro || registro.inicio + JANELA_MS <= agora) {
        tentativasPorIp.set(chave, { inicio: agora, quantidade: 1 })
        return next()
    }

    if (registro.quantidade >= MAX_TENTATIVAS) {
        const segundos = Math.ceil((registro.inicio + JANELA_MS - agora) / 1000)
        res.setHeader('Retry-After', String(segundos))
        return res.status(429).json({
            sucesso: false,
            mensagem: 'Muitas tentativas de login. Aguarde antes de tentar novamente.'
        })
    }

    registro.quantidade += 1
    return next()
}

function limitarTentativasCadastro(req, res, next) {
    const agora = Date.now()
    const ip = req.ip || req.socket.remoteAddress || 'desconhecido'

    for (const [chave, registro] of cadastrosPorIp.entries()) {
        if (registro.inicio + JANELA_MS <= agora) cadastrosPorIp.delete(chave)
    }

    const registro = cadastrosPorIp.get(ip)
    if (!registro || registro.inicio + JANELA_MS <= agora) {
        cadastrosPorIp.set(ip, { inicio: agora, quantidade: 1 })
        return next()
    }

    if (registro.quantidade >= MAX_TENTATIVAS) {
        const segundos = Math.ceil((registro.inicio + JANELA_MS - agora) / 1000)
        res.setHeader('Retry-After', String(segundos))
        return res.status(429).json({
            sucesso: false,
            mensagem: 'Muitas tentativas de cadastro. Aguarde antes de tentar novamente.'
        })
    }

    registro.quantidade += 1
    return next()
}

module.exports = { limitarTentativasLogin, limitarTentativasCadastro }
