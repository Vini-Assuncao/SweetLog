const multer = require('multer')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const uploadDir = path.resolve(__dirname, '..', '..', 'public', 'uploads')
fs.mkdirSync(uploadDir, { recursive: true })

function criarStorage(subdiretorio) {
    const destino = path.join(uploadDir, subdiretorio)
    fs.mkdirSync(destino, { recursive: true })

    return multer.diskStorage({
        destination: (req, file, callback) => callback(null, destino),
        filename: (req, file, callback) => {
            const extensao = path.extname(file.originalname).toLowerCase()
            callback(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extensao}`)
        }
    })
}

function validarImagem(req, file, callback) {
    const extensao = path.extname(file.originalname).toLowerCase()
    const extensoesPermitidas = ['.jpg', '.jpeg', '.png']
    const tiposPermitidos = ['image/jpeg', 'image/png']
    if (extensoesPermitidas.includes(extensao) && tiposPermitidos.includes(file.mimetype)) {
        callback(null, true)
    } else {
        const error = new Error('Apenas imagens JPEG, JPG ou PNG são permitidas.')
        error.status = 400
        callback(error)
    }
}

function validarPdf(req, file, callback) {
    const extensao = path.extname(file.originalname).toLowerCase()
    if (extensao === '.pdf' && file.mimetype === 'application/pdf') {
        callback(null, true)
    } else {
        const error = new Error('Apenas documentos PDF são permitidos.')
        error.status = 400
        callback(error)
    }
}

const limiteArquivo = { fileSize: 5 * 1024 * 1024, files: 1 }

const uploadProduto = multer({
    storage: criarStorage('produtos'),
    fileFilter: validarImagem,
    limits: limiteArquivo
})

const uploadEstoqueEntrada = multer({
    storage: criarStorage(path.join('notas_fiscais', 'entrada')),
    fileFilter: validarPdf,
    limits: limiteArquivo
})

const uploadEstoqueSaida = multer({
    storage: criarStorage(path.join('notas_fiscais', 'saida')),
    fileFilter: validarPdf,
    limits: limiteArquivo
})

module.exports = { uploadProduto, uploadEstoqueEntrada, uploadEstoqueSaida }
