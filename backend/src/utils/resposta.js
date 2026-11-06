function responderErro(res, error) {
    const status = Number(error.status) || 500
    const mensagem = status >= 500
        ? 'Erro interno do servidor'
        : (error.mensagem || error.message || 'Não foi possível processar a solicitação')
    const resposta = { sucesso: false, mensagem }

    if (error.codigo) resposta.codigo = error.codigo
    if (error.detalhes && status < 500) resposta.detalhes = error.detalhes

    if (status >= 500) {
        console.error('Erro na API:', error)
    }

    return res.status(status).json(resposta)
}

module.exports = { responderErro }
