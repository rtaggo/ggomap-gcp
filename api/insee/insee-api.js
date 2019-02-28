'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const path = require(`path`);
const logging = require('../../lib/logging');

const router = express.Router();

// Automatically parse request body as JSON
router.use(bodyParser.json());

router.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, '../../views/insee.html'));
});

router.get('/layer/:layername', (req, res) => {
	let lyrname = req.params.layername;
	logging.info(`/layer/${lyrname}`);
	const sireneSQL = require('./insee-bq.js');
	if (lyrname === 'carreaux') {
		sireneSQL.getCarreaux().then(features => {
			res.header('Content-Type', 'application/json'); 
			res.json(features);
		});
	} else {
		sireneSQL.getLayer(lyrname).then(features => {
			res.header('Content-Type', 'application/json'); 
			res.json(features);
		});
	}
});

router.get('/layer/:layername/:codeinsee/:sublayer', (req, res) => {
	let lyrname = req.params.layername;
	let codeinsee = req.params.codeinsee;
	let sublyr = req.params.sublayer
	logging.info(`/layer/${lyrname}/${codeinsee}/${sublyr}`);
	const sireneSQL = require('./insee-bq.js');
	sireneSQL.getLayerWithin(lyrname, codeinsee, sublyr).then(features => {
		res.header('Content-Type', 'application/json'); 
		res.json(features);
	});
});

router.post('/pos/analyzer',function(req,res){
	//console.log(`/insee/pos/analyzer. body: ${JSON.stringify(req.body)}`);
	console.log(`/insee/pos/analyzer.`);
	var isochronies=req.body.isochronies;
	const sireneSQL = require('./insee-bq.js');
	
	sireneSQL.analyzerFromDriveTime(isochronies).then(features => {
		res.header('Content-Type', 'application/json'); 
		res.json(features);
	});

	/*
	res.header('Content-Type', 'application/json'); 
	res.json({
		isos: isochrones
	});
	*/
});

/**
 * Errors on "/insee/*" routes.
 */
router.use((err, req, res, next) => {
	// Format error and forward to generic error handler for logging and
	// responding to the request
	err.response = err.message;
	next(err);
});

module.exports = router;
