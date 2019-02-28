'use strict';


const logging = require('../../lib/logging');
const request = require("request-promise");
const turf = require('@turf/turf');

const _computeIsochrones = async (center, time_limits) => {

	let baseUrl = 'http://193.70.46.221:9090/services/directions/isochrone?reverse_flow=false&vehicle=car';	
	let allgeojson = {
		"type": "FeatureCollection",
		"features": [

		]
	};
	let isochrones = [];
	var simplfy_options = {tolerance: 0.0005, highQuality: false};
	//var simplified = turf.simplify(geojson, options);	
	for (let s=0; s<time_limits.length; s++) {
		let isoJobUrl = baseUrl + `&point=${center}&buckets=1&time_limit=${parseInt(time_limits[s])*60}`;
		try {
			let isoRes = await queryIsochrone(isoJobUrl);
			//console.log(JSON.stringify(isoRes));
			let geojson = {
				"type": "FeatureCollection",
				"features": [

				]
			};
			let feature = isoRes.polygons[0];
			feature.properties.bucket = s;
			isochrones.push(turf.simplify(feature, simplfy_options));
		}  catch (ex) { 
			console.error(`    Failed to compute isochrone for time limit ${time_limits[s]} ${ex}`);
		}
	}
	var nbIsochrones = isochrones.length-1;
	for (var i=nbIsochrones;i>0; i--){
		isochrones[i] = turf.difference(isochrones[i], isochrones[i-1]);
	}
	allgeojson.features = isochrones.reverse();
	return allgeojson;
}

const queryIsochrone = async (url) => {
	let res = await request(url);
	var isoRes = (typeof(res) === 'string'?JSON.parse(res):res);
	return isoRes;
}

const _computeIsochronesOpenRouteService = async (center, time_limits) => {
	// https://api.openrouteservice.org/isochrones?api_key=5b3ce3597851110001cf62486ea13cac35484ccdba928d7fd51c518e&locations=48.8257024,2.3531787&profile=driving-car&range=60,120,600
	let oprServiceConfig = {
		api_key : '5b3ce3597851110001cf62486ea13cac35484ccdba928d7fd51c518e'
	};
	let allgeojson = {
		"type": "FeatureCollection",
		"features": [

		]
	};
	let isochrones = [];
	
	let lnglat = center.split(',').reverse().join(',');
	let ranges = time_limits.map(x=> parseInt(x)*60).join(',');
	let baseUrl = `https://api.openrouteservice.org/isochrones?api_key=${oprServiceConfig.api_key}&profile=driving-car&locations=${lnglat}&range=${ranges}`;
	try {
		let isoRes = await queryIsochrone(baseUrl);
		isoRes.features.forEach((iso,idx) => {
			console.log(`iso ${idx}`);
			delete iso.properties.group_index;
			delete iso.properties.center;

			iso.properties['bucket'] = idx;//iso.properties.value / 60;
			let minutes = iso.properties.value / 60;

			iso.properties.value = minutes;
			iso.properties.label = minutes + ' min';
			isochrones.push(iso);				
		});
	}  catch (ex) { 
		console.error(`    Failed to compute isochrone for time limit ${time_limits[s]} ${ex}`);
	}
	var nbIsochrones = isochrones.length-1;
	for (var i=nbIsochrones;i>0; i--){
		isochrones[i] = turf.difference(isochrones[i], isochrones[i-1]);
	}
	allgeojson.features = isochrones.reverse();
	return allgeojson;
}

module.exports = {
	computeIsochrones: _computeIsochronesOpenRouteService,
};
