const { responderErro } = require('../utils/resposta')

async function executar(res, operacao) {
    try {
        const resultado = await operacao()
        return res.json(resultado)
    } catch (error) {
        return responderErro(res, error)
    }
}

module.exports = { executar }
