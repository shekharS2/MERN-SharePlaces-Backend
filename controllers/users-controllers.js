const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs'); // converts passwords to hashed passwords
const jwt = require('jsonwebtoken'); // helps encrypt data into tokens

const HttpError = require('../models/http-error');
const User = require('../models/user');

const getUsers = async (req, res, next) => {
    let users;
    
    try {
        users = await User.find({}, '-password');
    } catch (e) {
        return next(
            new HttpError('Fetching users failed. Please try again later.', 500) 
        );
    }

    res.json({ users: users.map( (user) => {
        return user.toObject({ getters : true });
    })});
};

const signup = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(
            new HttpError('Invalid inputs passed. Please check your data.', 422) // 422 : invalid user input
        );
    }
      

    const { name, email, password } = req.body;

    let existingUser;

    try {
        existingUser = await User.findOne({ email : email })
    } catch (e) {
        return next(
            new HttpError('Signing up failed. Please try again later.', 500)
        );
    }

    if(existingUser) {
        return next(
            new HttpError('Could not create user! User already exists.', 422)
        );
    }

    let hashedPassword;

    try {
        hashedPassword = await bcrypt.hash(password, 12);
    } catch (err) {
        return next(
            new HttpError('Could not create user! Please try again.', 500)
        );
    }

    const createdUser = new User({
        name,
        email,
        image : req.file.path,
        password : hashedPassword,
        places : []
    });

    try {
        await createdUser.save();
    } catch (e) {
        console.log(e);
        return next(
            new HttpError('Signing up failed. Please try again later.', 500) // 500 : error code
        );
    }

    let token;
    try {
        token = jwt.sign({
            userId : createdUser.id,
            email : createdUser.email
        }, process.env.JWT_KEY, {
            expiresIn : '1h'
        });
    } catch (err) {
        return next(
            new HttpError('Signing up failed. Please try again later.', 500) // 500 : error code
        );
    }

    res.status(201).json({
        userId : createdUser.id,
        email : createdUser.email,
        token
    });
};

const login = async (req, res, next) => {
    const { email, password } = req.body;

    let existingUser;

    try {
        existingUser = await User.findOne({ email : email })
    } catch (e) {
        return next(
            new HttpError('Logging in failed. Please try again later.', 500)
        );
    }

    if(!existingUser) {
        return next(
            new HttpError('Invalid credentials. Could not log you in1.', 403) // 403 : Authentication failed
        );
    }

    let isValidPassword = false;
    try {
        isValidPassword = await bcrypt.compare(password, existingUser.password);
    } catch (err) {
        return next(
            new HttpError('Could not log you in. Please check your credentials and try again.', 500) 
        );
    }

    if(!isValidPassword) {
        return next(
            new HttpError('Invalid credentials. Could not log you in2.', 401) // 401 : authentication failed
        );
    }

    let token;
    try {
        token = jwt.sign({
            userId : existingUser.id,
            email : existingUser.email
        }, process.env.JWT_KEY, {
            expiresIn : '1h'
        });
    } catch (err) {
        return next(
            new HttpError('Logging in failed. Please try again later.', 500) // 500 : error code
        );
    }

    res.json({
        userId : existingUser.id,
        email : existingUser.email,
        token
    });
};


exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;

