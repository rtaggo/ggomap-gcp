'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const path = require(`path`);

const router = express.Router();

// Automatically parse request body as JSON
router.use(bodyParser.json());

router.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, '../../views/sirene.html'));
});

router.get('/search', (req, res) => {
	console.log('/sirene/search ' + JSON.stringify(req.query));
	doSearchSirene(req.query.searchTerm).then(resSirene => {
		res.header('Content-Type', 'application/json'); 
		res.json(resSirene);
	});
});

router.get('/pdvanalyzer', (req, res) => {
	console.log('/sirene/pdvanalyzer ' + JSON.stringify(req.query));
	const sirenePublisher = require('./sirene-sql.js');

	//return sirenePublisher.publish(req.query.sirets);
	sirenePublisher.publish(req.query.sirets).then(resPublish => {
		res.header('Content-Type', 'application/json'); 
		res.json(resPublish);
	});
});

/**
 * Errors on "/sirene/*" routes.
 */
router.use((err, req, res, next) => {
	// Format error and forward to generic error handler for logging and
	// responding to the request
	err.response = err.message;
	next(err);
});

async function doSearchSirene(searchTerm) {
	const sireneSQL = require('./sirene-sql.js');

	return sireneSQL.search(searchTerm);
};



module.exports = router;
