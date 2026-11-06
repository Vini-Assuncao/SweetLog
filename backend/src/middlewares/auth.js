const FuncionarioRepository = require('../repositories/FuncionarioRepository')
const { verificarToken } = require('../utils/jwt')

const { CARGOS, TODOS_OS_CARGOS } = require('../utils/roles')

async function autenticar(req, res, next) {
    const cabecalho = req.headers.authorization || ''
    const correspondencia = cabecalho.match(/^Bearer\s+(.+)$/i)
    if (!correspondencia) {
        return res.status(401).json({ sucesso: false, mensagem: 'Autenticação necessária. Envie um token Bearer.' })
    }

    try {
        const payload = verificarToken(correspondencia[1])
        const matricula = Number(payload.sub)
        // Reconsulta o funcionário para refletir imediatamente alterações de cargo e desligamentos.
        const funcionario = await FuncionarioRepository.selectById(matricula)
        if (!funcionario) {
            return res.status(401).json({ sucesso: false, mensagem: 'Sessão inválida. Faça login novamente.' })
        }
        req.user = {
            numero_matricula: Number(funcionario.numero_matricula),
            nome: funcionario.nome,
            setor: funcionario.setor
        }
        return next()
    } catch (error) {
        if (error.message === 'Token expirado') {
            return res.status(401).json({ sucesso: false, mensagem: 'Sessão expirada. Faça login novamente.' })
        }
        if (error.message === 'Token inválido') {
            return res.status(401).json({ sucesso: false, mensagem: 'Token inválido. Faça login novamente.' })
        }
        return next(error)
    }
}

function autorizar(...cargosPermitidos) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ sucesso: false, mensagem: 'Autenticação necessária.' })
        }
        if (!cargosPermitidos.includes(req.user.setor)) {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Seu cargo não possui permissão para realizar esta operação.'
            })
        }
        return next()
    }
}

module.exports = { autenticar, autorizar, CARGOS, TODOS_OS_CARGOS }
