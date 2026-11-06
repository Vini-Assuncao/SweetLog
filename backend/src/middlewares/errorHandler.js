const multer = require('multer')
const { responderErro } = require('../utils/resposta')

function errorHandler(error, req, res, next) {
    if (res.headersSent) return next(error)

    if (error instanceof SyntaxError && error.status === 400 && Object.prototype.hasOwnProperty.call(error, 'body')) {
        return res.status(400).json({ sucesso: false, mensagem: 'Corpo JSON inválido' })
    }

    if (error instanceof multer.MulterError) {
        const mensagem = error.code === 'LIMIT_FILE_SIZE'
            ? 'O arquivo excede o limite permitido de 5 MB'
            : 'Não foi possível processar o arquivo enviado'
        return res.status(400).json({ sucesso: false, mensagem, codigo: error.code })
    }

    if (error.code === 'ER_DUP_ENTRY') {
        error.status = 409
        error.mensagem = 'Já existe um registro com os mesmos dados'
    } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        error.status = 400
        error.mensagem = 'Um dos registros relacionados não existe'
    } else if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        error.status = 409
        error.mensagem = 'Não é possível excluir este registro porque ele possui vínculos'
    }

    return responderErro(res, error)
}

module.exports = errorHandler
