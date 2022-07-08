const axios = require('axios');
 
const HttpError = require('../models/http-error');
 
const getCoordsForAddress = async (address) => {
    const response = await axios.get(
        'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates',
        {
            params: {
                f: 'json',
                singleLine: address,
                outFields: 'Match_addr,Addr_type'
            }
        }
    );
 
    const data = response.data;
 
    // Check if no matches were found
    if (!data || data.candidates.length === 0) {
        next(new HttpError('Could not find location for the specified address.', 422));
    }
    
    // Get Latitude
    const lat = response.data.candidates[0].location.y;
    // Get Longitude
    const lng = response.data.candidates[0].location.x;
    
    return {
        lat,
        lng
    };
};
 
module.exports = getCoordsForAddress;
