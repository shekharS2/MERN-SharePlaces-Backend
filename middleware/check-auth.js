const HttpError = require('../models/http-error');
const jwt = require('jsonwebtoken'); // helps encrypt data into tokens

module.exports = (req, res, next) => {
    if(req.method == 'OPTIONS') {
        return next();
    }

    try {
        const token = req.headers.authorization.split(' ')[1]; // Authorization : 'Bearer TOKEN' ........... // Instead of sending token in header, we can also send using query params
        
        if(!token) { // split() passes but not a token in '1' index
            return next(
                new HttpError('Authentication failed', 403) // 401 : Authentication failed
            );
        } 

        // split() passes but a token in '1' index
        const decodedToken = jwt.verify(token, process.env.JWT_KEY); // check if token is correct
        req.userData = {
            userId : decodedToken.userId
        };
        next();
    } catch (err) { 
        return next( // split() fails as no token is set in 'Authorization' or incorrect token
            new HttpError('Authentication failed', 401) // 401 : Not Authenticated
        );
    }

}