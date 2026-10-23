const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Garante que a pasta de uploads exista
const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const criarStorage = (tipoNotaFiscal) => multer.diskStorage({
    destination: function (req, file, cb) {
        let destino;

        if (file.mimetype === 'application/pdf') {
            destino = path.join(uploadDir, 'notas_fiscais', tipoNotaFiscal);
        } else {
            destino = path.join(uploadDir, 'produtos');
        }

        if (!fs.existsSync(destino)) {
            fs.mkdirSync(destino, { recursive: true });
        }

        cb(null, destino);
    },

    filename: function (req, file, cb) {
        // Renomeia o arquivo para evitar colisões
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilterProdutos = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Apenas arquivos de imagem (JPEG, JPG, PNG) são permitidos.'));
    }
};

const uploadProduto = multer({
    storage: criarStorage('entrada'),
    fileFilter: fileFilterProdutos,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

const fileFilterEstoque = (req, file, cb) => {
    const allowedMimeTypes = ['application/pdf'];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Apenas documentos (PDF) são permitidos.'));
    }
};

const uploadEstoqueEntrada = multer({
    storage: criarStorage('entrada'),
    fileFilter: fileFilterEstoque,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

const uploadEstoqueSaida = multer({
    storage: criarStorage('saida'),
    fileFilter: fileFilterEstoque,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

module.exports = { uploadProduto, uploadEstoqueEntrada, uploadEstoqueSaida };