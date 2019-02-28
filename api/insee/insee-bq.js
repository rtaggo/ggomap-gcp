'use strict';


const logging = require('../../lib/logging');


async function _getLayer(layername) {
	console.log(`[INSEE-BQ Module] _getLayer: : '${layername}'`);
	const {BigQuery} = require('@google-cloud/bigquery');

	var res = {
		"type": "FeatureCollection",
		"features": []
	};
	const layerquery = `SELECT 
	  ST_AsGeoJSON(geom) AS geom,  
	  * EXCEPT (geom)
	FROM \`ggo-bq-gis.insee.${layername}\`
	WHERE code_insee NOT IN ('01', '02', '03', '04', '06')`;

	console.log(`Query: ${layerquery}`);

	const bigquery = new BigQuery();
	const options = {
	    query: layerquery,
	    // Location must match that of the dataset(s) referenced in the query.
	    location: 'EU',
	};

	// Runs the query as a job
	const [job] = await bigquery.createQueryJob(options);
	console.log(`Job ${job.id} started.`);

	// Waits for the query to finish
	const [rows] = await job.getQueryResults();	
	rows.forEach(row => {		
	  	const l_geom = row['geom'];
		const l_name = row['nom'];
		const l_codeinsee = row['code_insee'];
		res.features.push({
			"type": "Feature",
			"properties" : {
				"code_insee" : l_codeinsee,
				"name" : l_name,
				"surface" : row['surf_km2']
			},
			"geometry" : JSON.parse(l_geom)
		});
	});
	return res;
};

async function _getLayerWithin(layername, codeinsee, sublayer) {
	console.log(`[INSEE-BQ Module] _getLayer: : '${layername}'`);
	const {BigQuery} = require('@google-cloud/bigquery');

	var res = {
		"type": "FeatureCollection",
		"features": []
	};
	/*
	const layerquery = `SELECT
		ST_AsGeoJSON(geom) AS geom,
		* EXCEPT(geom,
		r_geom)
	FROM
	  \`ggo-bq-gis.insee.${sublayer}\` d,
	  ( SELECT geom AS r_geom FROM \`ggo-bq-gis.insee.${layername}\` WHERE code_insee = '${codeinsee}' LIMIT 1) r
	WHERE ST_WITHIN(ST_CENTROID(d.geom), r.r_geom)`;
	*/
	const layerquery = buildSubLayerQuery(layername, codeinsee, sublayer);
	console.log(`Query: ${layerquery}`);

	const bigquery = new BigQuery();
	const options = {
	    query: layerquery,
	    // Location must match that of the dataset(s) referenced in the query.
	    location: 'EU',
	};

	// Runs the query as a job
	const [job] = await bigquery.createQueryJob(options);
	console.log(`Job ${job.id} started.`);

	// Waits for the query to finish
	const [rows] = await job.getQueryResults();	
	/*
	rows.forEach(row => {		
	  	const l_geom = row['geom'];
		const l_name = row['nom'];
		const l_codeinsee = row['code_insee'];
		res.features.push({
			"type": "Feature",
			"properties" : {
				"code_insee" : l_codeinsee,
				"name" : l_name,
				"surface" : row['surf_km2']
			},
			"geometry" : JSON.parse(l_geom)
		});
	});
	*/
	res.features = parseFeature(rows, sublayer);
	return res;
};

async function _getCarreaux() {
	console.log(`[INSEE-BQ Module] _analyzerFromDriveTime`);
	const {BigQuery} = require('@google-cloud/bigquery');

	var res = {
		"type": "FeatureCollection",
		"features": []
	};
	const bigquery = new BigQuery();
	let carreauxQuery = `SELECT
	ST_AsGeoJSON(c.geom) AS geom,
	c.idINSPIRE, c.id,
	(r_men * ind_c)/r_ind_r men_c,
	(r_ind_srf * ind_c)/r_ind_r revenus_c
	FROM \`ggo-bq-gis.insee.carreaux\` c 
	LEFT JOIN \`ggo-bq-gis.insee.carreaux_indicateurs\` ci 
	ON c.idINSPIRE = ci.idINSPIRE, 
	(SELECT geom FROM \`ggo-bq-gis.insee.regions\` WHERE code_insee='11') as r
	WHERE  ST_DWITHIN(r.geom, c.centroid, 10)`;	
	console.log('query: ' + carreauxQuery);
	const options = {
	    query: carreauxQuery,
	    // Location must match that of the dataset(s) referenced in the query.
	    location: 'EU',
	};
	const [job] = await bigquery.createQueryJob(options);
	console.log(`Job ${job.id} started.`);

	// Waits for the query to finish
	const [rows] = await job.getQueryResults();
	rows.forEach(row => {		
	  	const c_geom = row['geom'];
		const c_id = row['id'];
		const c_idINSPIRE = row['idINSPIRE'];
		res.features.push({
			"type": "Feature",
			"properties" : {
				"id" : c_id,
				"idINSPIRE" : c_idINSPIRE,
				"men" : row['men_c'],
				"revenus" : row['revenus_c']
			},
			"geometry" : JSON.parse(c_geom)
		});
	});
	return res;
}

async function _analyzerFromDriveTime(isos){
	console.log(`[INSEE-BQ Module] _analyzerFromDriveTime`);
	const {BigQuery} = require('@google-cloud/bigquery');

	var res = {
		"type": "FeatureCollection",
		"features": []
	};
	const bigquery = new BigQuery();
	for (let i = 0; i<isos.length; i++) {
		let iso = isos[i];
		console.log(`Query for ${iso.label}`);
		let isoQuery = `SELECT
		ST_AsGeoJSON(c.geom) AS geom,
		c.idINSPIRE, c.id,
		(r_men * ind_c)/r_ind_r men_c,
		(r_men_prop * ind_c)/r_ind_r men_prop_c,
		(r_ind_srf * ind_c)/r_ind_r revenus_c,
		(r_ind_age4 * ind_c)/r_ind_r age4_c,
		(r_ind_age5 * ind_c)/r_ind_r age5_c,
		(r_ind_age6 * ind_c)/r_ind_r age6_c,
		(r_ind_age7 * ind_c)/r_ind_r age7_c
		FROM \`ggo-bq-gis.insee.carreaux\` c 
		LEFT JOIN \`ggo-bq-gis.insee.carreaux_indicateurs\` ci 
		ON c.idINSPIRE = ci.idINSPIRE
		WHERE 
			ST_DWITHIN(
				ST_GEOGFROMGEOJSON ('${JSON.stringify(iso.feature.geometry)}'), 
				c.centroid, 10)`;
		//console.log('query: ' + isoQuery);
		const options = {
		    query: isoQuery,
		    // Location must match that of the dataset(s) referenced in the query.
		    location: 'EU',
		};

		// Runs the query as a job
		const [job] = await bigquery.createQueryJob(options);
		console.log(`Job ${job.id} started.`);

		// Waits for the query to finish
		const [rows] = await job.getQueryResults();
		rows.forEach(row => {		
		  	const c_geom = row['geom'];
			const c_id = row['id'];
			const c_idINSPIRE = row['idINSPIRE'];
			res.features.push({
				"type": "Feature",
				"properties" : {
					"id" : c_id,
					"idINSPIRE" : c_idINSPIRE,
					"bucket": iso.feature.properties.bucket,
					"men" : row['men_c'],
					"men_prop" : row['men_prop_c'],
					"revenus" : row['revenus_c'],
					"age4" : row['age4_c'],
					"age5" : row['age5_c'],
					"age6" : row['age6_c'],
					"age7" : row['age7_c']						
				},
				"geometry" : JSON.parse(c_geom)
			});
		});
	}
	return res;
}

function buildSubLayerQuery(layername, codeinsee, sublayer) {
	if (sublayer === 'carreaux') {
		/*
		return `SELECT 
			ST_AsGeoJSON(c.geom) AS geom,
			idINSPIRE, id
			FROM \`ggo-bq-gis.insee.carreaux\` c,
			(SELECT geom as d_geom FROM \`ggo-bq-gis.insee.departements\` where code_insee = '${codeinsee}' LIMIT 1) d
			WHERE ST_WITHIN(ST_CENTROID(c.geom), d.d_geom)`;
		*/
		return `SELECT 
			ST_AsGeoJSON(c.geom) AS geom,
			idINSPIRE, id
			FROM \`ggo-bq-gis.insee.carreaux\` c,
			(SELECT geom as d_geom FROM \`ggo-bq-gis.insee.departements\` where code_insee = '${codeinsee}' LIMIT 1) d
			WHERE ST_DWITHIN(d.d_geom, c.centroid, 10)`;
	} else {
		return `SELECT
			ST_AsGeoJSON(geom) AS geom,
			* EXCEPT(geom, r_geom)
		FROM
		  \`ggo-bq-gis.insee.${sublayer}\` d,
		  ( SELECT geom AS r_geom FROM \`ggo-bq-gis.insee.${layername}\` WHERE code_insee = '${codeinsee}' LIMIT 1) r
		WHERE ST_WITHIN(ST_CENTROID(d.geom), r.r_geom)`;
	}
}

function parseFeature(rows, sublayer) {
	var features = [];
	
	if (sublayer === 'carreaux') {
		console.log(`Carreaux request return ${rows.length} row(s)`);
		rows.forEach(row => {		
		  	const c_geom = row['geom'];
			const c_id = row['id'];
			const c_idINSPIRE = row['idINSPIRE'];
			features.push({
				"type": "Feature",
				"properties" : {
					"id" : c_id,
					"idINSPIRE" : c_idINSPIRE
				},
				"geometry" : JSON.parse(c_geom)
			});
		});
	} else {
		console.log(`${sublayer} sublayer request return ${rows.length} row(s)`);
		rows.forEach(row => {		
		  	const l_geom = row['geom'];
			const l_name = row['nom'];
			const l_codeinsee = row['code_insee'];
			features.push({
				"type": "Feature",
				"properties" : {
					"code_insee" : l_codeinsee,
					"name" : l_name,
					"surface" : row['surf_km2']
				},
				"geometry" : JSON.parse(l_geom)
			});
		});
	}
	return features;
}

module.exports = {
	getLayer: _getLayer,
	getLayerWithin : _getLayerWithin,
	analyzerFromDriveTime: _analyzerFromDriveTime,
	getCarreaux: _getCarreaux
};
