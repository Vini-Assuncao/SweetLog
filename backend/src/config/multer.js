const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Garante que a pasta de uploads exista
const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let destino;

        if (file.mimetype === 'application/pdf') {
            destino = path.join(uploadDir, 'notas_fiscais');
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
    storage: storage,
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

const uploadEstoque = multer({
    storage: storage,
    fileFilter: fileFilterEstoque,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

module.exports = { uploadProduto, uploadEstoque };