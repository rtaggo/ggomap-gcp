'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const path = require(`path`);
const logging = require('../../lib/logging');

const router = express.Router();

const config = {
	geoserviceurl: 'https://galigeogeoservice.herokuapp.com/rest/1.0'
}
// Automatically parse request body as JSON
router.use(bodyParser.json());

router.get('/geocoder/search', (req, res) => {
	const request = require("request-promise");
	console.log('/geocoder/search' + JSON.stringify(req.query));
	var q = encodeURI(req.query.q);
	if (q.indexOf('france') < 0) {
		q += ', France';
	}
	var addrUrl  = config.geoserviceurl + '/geocoder/search?format=jsonv2&addressdetails=1&locale=fr&q=' + q;
	request.get({
		url: addrUrl
	}, function(error, response, body){
		var searchRes = (typeof(body) === 'string'?JSON.parse(body):body);
		res.header('Content-Type', 'application/json'); 
		res.json(searchRes); 
	});
});


router.get('/geocoder/reverse', (req, res) => {
	const request = require("request-promise");
	console.log('/geocoder/reverse' + JSON.stringify(req.query));
	var lat = encodeURI(req.query.lat);
	var lng = encodeURI(req.query.lng);
	var addrUrl  = config.geoserviceurl + `/geocoder/reverse?format=jsonv2&addressdetails=1&locale=fr&lat=${lat}&lon=${lng}`;
	request.get({
		url: addrUrl
	}, function(error, response, body){
		var searchRes = (typeof(body) === 'string'?JSON.parse(body):body);
		res.header('Content-Type', 'application/json'); 
		res.json(searchRes); 
	});
});


router.get('/direction/isochrone', (req, res) => {
	console.log('/direction/ischrone' + JSON.stringify(req.query));
	let center = req.query.center;
	let timeLimits = req.query.time_limits.split(',');
	console.log(`center: ${center}`);
	console.log(`time limits: ${timeLimits}`);
	const geoserviceAPI = require('./geoservice-api.js');
	
	geoserviceAPI.computeIsochrones(center, timeLimits).then(features => {
		res.header('Content-Type', 'application/json'); 
		res.json(features);
	})
	/*	
	res.json({
		'message': 'ok',
		'center' : center,
		'time_limits' : timeLimits
	}); 
	*/
	
});


/**
 * Errors on "/geoservice/*" routes.
 */
router.use((err, req, res, next) => {
	// Format error and forward to generic error handler for logging and
	// responding to the request
	err.response = err.message;
	next(err);
});

module.exports = router;
