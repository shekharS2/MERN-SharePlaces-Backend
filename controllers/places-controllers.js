const fs = require('fs');

const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const getCoordsForAddress = require('../util/location');
const Place = require('../models/place');
const User = require('../models/user');

const getPlaceById = async (req, res, next) => { // middleware function
    const placeId = req.params.pid;

    let place;
    try {
        place = await Place.findById(placeId);
    } catch (e) {
        return next(
            new HttpError('Something went wrong. Could not find a place.', 505)
        );
    }

    if(!place) {
        return next( // this method only works with synchronous code
            new HttpError('Could not find a place for the provided id.', 404) 
        );
    }

    res.json({place : place.toObject({
        getters : true
    })});
};

const getPlacesByUserId = async (req, res, next) => {
    const userId = req.params.uid;

    // let places;
    let userWithPlaces;
    try {
        userWithPlaces = await User.findById(userId).populate('places');
    } catch (e) {
        return next(
            new HttpError('Fetching places failed. Please ty again later.', 500)
        );
    }

    if(!userWithPlaces || userWithPlaces.places.length === 0) {
        // return res
        //     .status(404)
        //     .json({message : 'Could not find a user for the provided id.'});

        return next( // this method only works with asynchronous code
            new HttpError('Could not find places for the provided id.', 404)
        ); 
    }

    res.json({places : userWithPlaces.places.map((place) => {
        return place.toObject({ getters : true });
    })});
};

const createPlace = async (req, res, next) =>{
    const errors = validationResult(req);

    if(!errors.isEmpty()) {
        return next(new HttpError('Invalid inputs passed. Please check your data.', 422)); // 422 : invalid user input
    }

    const { title, description, address } = req.body;

    let coordinates;
    
    try{
        coordinates = await getCoordsForAddress(address);
    } catch (error) {
        return next(error);
    }

    const createdPlace = new Place({
        title,
        description,
        address,
        image : req.file.path,
        location : coordinates,
        creator : req.userData.userId
    });

    let user;
    try {
        user = await User.findById(req.userData.userId);
    } catch (e) {
        return next(
            new HttpError('Creating place failed. Please try again later.', 500) // 500 : error code
        );
    }

    if(!user) {
        return next(
            new HttpError('Invalid creator id. Please try again later.', 500) // 500 : error code
        );
    }

    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await createdPlace.save({ session : sess });
        user.places.push(createdPlace);
        await user.save({ session : sess, validateModifiedOnly: true });
        await sess.commitTransaction();
    } catch (e) {
        return next(
            new HttpError('Creating place failed. Please try again later.', 500) // 500 : error code
        );
    }
    
    res.status(201).json({
        place: createdPlace
    });
}

const updatePlace = async (req, res, next) => {
    const errors = validationResult(req);

    if(!errors.isEmpty()) {
        return next(
            new HttpError('Invalid inputs passed. Please check your data.', 422) // 422 : invalid user input
        );
    }

    const { title, description } = req.body;
    const placeId = req.params.pid;

    let place;
    try {
        place = await Place.findById(placeId);
    } catch (e) {
        return next(
            new HttpError('Something went wrong. Could not update place.', 505) 
        );
    }

    if(place.creator.toString() !== req.userData.userId) {
        return next(
            new HttpError('You are not allowed to edit this place.', 401) // 401 : Unauthorized (Might be authenyicated. But not authorized.)
        );
    }
    
    place.title = title;
    place.description = description;

    try {
        await place.save();
    } catch (e) {
        return next(
            new HttpError('Something went wrong. Could not update place.', 500) 
        );
    }

    res.status(200).json({
        place: place.toObject({ getters : true })
    });
}; 

const deletePlace = async (req, res, next) => {
    const placeId = req.params.pid;

    let place;
    try {
        place = await Place.findById(placeId).populate('creator');
    } catch (e) {
        return next(
            new HttpError('Something went wrong. Could not delete place.', 500) 
        );
    }

    if(!place) {
        return next(
            new HttpError('Something went wrong. Could not find place to delete.', 404) 
        );
    }
   
    if (place.creator.id !== req.userData.userId)  {
        return next(
            new HttpError('You are not allowed to delete this place.', 401) 
        );
    }

    const imagePath = place.image;

    try {
        // await place.remove();
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await place.remove({ session : sess });
        place.creator.places.pull(place);
        await place.creator.save({ session : sess });
        await sess.commitTransaction();
    } catch (e) {
        return next(
            new HttpError('Something went wrong. Could not delete place.', 500) 
        );
    }

    fs.unlink(imagePath, (err) => {
        console.log(err);
    });

    res.status(200).json({
        message: 'Place deleted.',
    });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
