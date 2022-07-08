const multer = require('multer'); // multer is used for binary data like images
const uuid = require('uuid').v1;

const MIME_TYPE_MAP = {
    'image/png' : 'png',
    'image/jpg' : 'jpg',
    'image/jpeg' : 'jpeg'
};

const fileUpload = multer({ // multer() returns a file upload middleware (here, 'fileUpload') which we can use in our express middleware chain 
    limits : 500000, // upload limit of 500 kb
    storage : multer.diskStorage({
        destination : (req, file, cb) => {
            cb(null, 'uploads/images');
        },
        filename : (req, file, cb) => {
            const ext = MIME_TYPE_MAP[file.mimetype];
            cb(null, uuid() + '.' + ext);
        }
    }),
    fileFilter : (req, file, cb) => { 
        const isValid = !!MIME_TYPE_MAP[file.mimetype];  // '!!' operator converts 'null' or 'undefined' to 'false' and any other string to 'true'
        let error = isValid ? null : new Error('Invalid mime type!');
        cb(error, isValid);
    }
}); 
    
module.exports = fileUpload;