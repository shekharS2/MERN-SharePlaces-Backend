const fs = require('fs');
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const placesRoutes = require('./routes/places-routes');
const usersRoutes = require('./routes/users-routes');
const HttpError = require('./models/http-error');

const app = express();

app.use(bodyParser.json());

app.use('/uploads/images', express.static(path.join('uploads', 'images')));

app.use((req, res, next) => { // Solution for CORS errors. Later, use npm package or proxy to CORS errors.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    res.setHeader('Access-Control-Allow-Methods','GET, POST, PATCH, DELETE');
    next();
});

app.use('/api/places', placesRoutes); //middleware
app.use('/api/users', usersRoutes); //middleware

app.use((req, res, next)=> { //middleware
    throw new HttpError('Could not find this route.', 404);
}); 

app.use((error, req, res, next) => { //middleware
    if (req.file) {
        fs.unlink(req.file.path, err => {
            console.log(err);
        });
    }

    if(res.headerSent) { // response has already been sent 
        return next(error);
    }

    res.status(error.code || 500);
    res.json({message : error.message || 'An unknown error occurred!'});

});

mongoose
.connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.66zy2.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`, // places : Database name
    { 
        useNewUrlParser: true, 
        useUnifiedTopology: true 
    }
)   
.then(() => {
        console.log("Connected to database");
        app.listen(process.env.PORT || 5000);
    })
    .catch((err) => {
        console.log(err);
    });





 