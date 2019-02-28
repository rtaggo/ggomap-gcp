'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const path = require(`path`);
const logging = require('../../lib/logging');

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

router.get('/posanalyzer', (req, res) => {
	let jobId = req.params.jobid;
	logging.info(`[GET] /sirene/posanalyzer`);
	const sirenesql = require('./sirene-sql.js');
	/*
	sirenesql.jobstatus(jobId).then(resStatus => {
		console.log(`sirenesql.jobstatus callback. RES = ${JSON.stringify(resStatus)}`);
		res.header('Content-Type', 'application/json'); 
		res.json(resStatus);
	});
	*/
	const conn = sirenesql.getConnection();
	conn.query(
		'SELECT * FROM `jobs` ORDER BY created_date DESC',
	    (err, results) => {
			res.header('Content-Type', 'application/json'); 
	    	//logging.info(`query res= ${JSON.stringify(results)}`);
			if (err) {
				res.json({error: err});
			} else {
				res.json(results);
			}
		}
	);
});

router.get('/posanalyzer/run', (req, res) => {
	console.log('[GET] /sirene/posanalyzer/run' + JSON.stringify(req.query));
	const sirenePublisher = require('./sirene-sql.js');

	sirenePublisher.publish(req.query.sirets, req.query.searchTerm).then(resPublish => {
		res.header('Content-Type', 'application/json'); 
		res.json(resPublish);
	});
});

router.get('/posanalyzer/job/:jobid/status', (req, res) => {
	let jobId = req.params.jobid;
	logging.info(`[GET] /sirene/posanalyzer/job/${jobId}/status`);
	const sirenesql = require('./sirene-sql.js');
	/*
	sirenesql.jobstatus(jobId).then(resStatus => {
		console.log(`sirenesql.jobstatus callback. RES = ${JSON.stringify(resStatus)}`);
		res.header('Content-Type', 'application/json'); 
		res.json(resStatus);
	});
	*/
	const conn = sirenesql.getConnection();
	conn.query(
		'SELECT * FROM `jobs` WHERE `messageid` = ?',
	    jobId,
	    (err, results) => {
			res.header('Content-Type', 'application/json'); 
	    	logging.info(`query res= ${JSON.stringify(results)}`);
			if (err) {
				res.json({error: err});
			} else {
				res.json(results[0]);
			}
		}
	);
});

router.get('/posanalyzer/job/:jobid/results', (req, res) => {
	let jobId = req.params.jobid;
	logging.info(`[GET] /sirene/posanalyzer/job/${jobId}/status`);
	const sirenesql = require('./sirene-sql.js');
	/*
	sirenesql.jobstatus(jobId).then(resStatus => {
		console.log(`sirenesql.jobstatus callback. RES = ${JSON.stringify(resStatus)}`);
		res.header('Content-Type', 'application/json'); 
		res.json(resStatus);
	});
	*/
	const conn = sirenesql.getConnection();
	conn.query(
		'SELECT * FROM `analysis` WHERE `messageid` = ?',
	    jobId,
	    (err, results) => {
			res.header('Content-Type', 'application/json'); 
	    	//logging.info(`query res= ${JSON.stringify(results)}`);
			if (err) {
				res.json({error: err});
			} else {
				let sirets = [];
				results.forEach(row => {
					sirets.push(row['siret']);
				});
				findSireneSIRET(sirets).then(resSirene => {
					results.forEach(jRow => {
						for (const [index, val] of resSirene.entries()) {
							if (val['siret'] === jRow['siret']) {
								jRow['name'] = val['name'];
								break;
							}
						}
					});
					res.json(results);
				});
				//res.json(results);
			}
		}
	);
});

router.get('/posanalyzer/job/:jobid/delete', (req, res) => {
	let jobId = req.params.jobid;
	logging.info(`[GET] /sirene/posanalyzer/job/${jobId}/delete`);
	const sirenesql = require('./sirene-sql.js');
	const conn = sirenesql.getConnection();
	conn.query(
		'DELETE FROM `analysis` WHERE `messageid` = ?',
	    jobId,
	    (err, results) => {
			//logging.info(`query res= ${JSON.stringify(results)}`);
			if (err) {
				res.header('Content-Type', 'application/json'); 	    	
				res.json({error: err});
			} else {
				conn.query(
					'DELETE FROM `jobs` WHERE `messageid` = ?',
				    jobId,
				    (err, results) => {
						res.header('Content-Type', 'application/json'); 
				    	//logging.info(`query res= ${JSON.stringify(results)}`);
						if (err) {
							res.json({error: err});
						} else {
							res.json(results);
						}
					}
				);
			}
		}
	);
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


async function findSireneSIRET(sirets) {
	const sireneSQL = require('./sirene-sql.js');
	return sireneSQL.findSireneSIRET(sirets);
};




module.exports = router;
