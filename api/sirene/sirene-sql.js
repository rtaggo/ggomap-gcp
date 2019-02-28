'use strict';

const Pubsub = require('@google-cloud/pubsub');
//const config = require('../config');
const logging = require('../../lib/logging');

const topicName = 'pdvanalyzer-topic'; // config.get('TOPIC_NAME');

const pubsub = new Pubsub({
  projectId: 'ggo-background' //config.get('GCLOUD_PROJECT'),
});

const Buffer = require('safe-buffer').Buffer;

async function _findSireneSIRET(sirets) {
	console.log(`[SIRENE-SQL Module] _findSireneSIRET`);
	const {BigQuery} = require('@google-cloud/bigquery');
	let siretList =  sirets.map(e=> '\'' + e + '\'').join(',');

	const searchquery = `SELECT siret, 
	adresseetablissement, codepostaletablissement, 
	libellecommuneetablissement,
	departementetablissement, 
	longitude, latitude,
	CASE WHEN  (enseigne1etablissement IS NOT NULL) AND (LENGTH(LTRIM(enseigne1etablissement)) > 0) THEN enseigne1etablissement
	  WHEN  (denominationusuelleetablissement IS NOT NULL) AND (LENGTH(LTRIM(denominationusuelleetablissement)) > 0) THEN denominationusuelleetablissement
	  WHEN  (denominationusuelle1unitelegale IS NOT NULL) AND (LENGTH(LTRIM(denominationusuelle1unitelegale)) > 0) THEN denominationusuelle1unitelegale
		ELSE 'INCONNU' END name 
	FROM \`ggo-bq-gis.SIRENE.sirene_v3\`
	WHERE siret in (${siretList})`;

	const bigquery = new BigQuery();
	const options = {
	    query: searchquery,
	    // Location must match that of the dataset(s) referenced in the query.
	    location: 'EU',
	};
	const [job] = await bigquery.createQueryJob(options);
	console.log(`Job ${job.id} started.`);

	// Waits for the query to finish
	const [rows] = await job.getQueryResults();
	console.log('return ' + rows.length);
	return rows;
}

async function _search(searchTerm) {
	console.log(`[SIRENE-SQL Module] _search: : '${searchTerm}'`);
	// Imports the Google Cloud client library
	const {BigQuery} = require('@google-cloud/bigquery');
	var res = {
		"type": "FeatureCollection",
		"features": []
	};

	/* Comment/Uncomment those line to make real call 
	*/
	searchTerm = searchTerm.toUpperCase();

	const searchquery = `SELECT 
	siret, siren, nic, 
	adresseetablissement, codepostaletablissement, 
	libellecommuneetablissement,
	departementetablissement,
	regionetablissement,
	CASE WHEN  (enseigne1etablissement IS NOT NULL) AND (LENGTH(LTRIM(enseigne1etablissement)) > 0) THEN enseigne1etablissement
	  WHEN  (denominationusuelleetablissement IS NOT NULL) AND (LENGTH(LTRIM(denominationusuelleetablissement)) > 0) THEN denominationusuelleetablissement
	  WHEN  (denominationusuelle1unitelegale IS NOT NULL) AND (LENGTH(LTRIM(denominationusuelle1unitelegale)) > 0) THEN denominationusuelle1unitelegale
		ELSE 'INCONNU' END name, 
	ST_AsGeoJSON(ST_GeogPoint(longitude, latitude)) AS point
	FROM \`ggo-bq-gis.SIRENE.sirene_v3\`
	WHERE (activiteprincipaleetablissement NOT LIKE "47.9%") AND (activiteprincipaleetablissement NOT LIKE "47.9%")
	AND (
	  (denominationusuelleetablissement LIKE '%${searchTerm}%')
	  OR 
	  (denominationusuelle1unitelegale LIKE '%${searchTerm}%')
	  OR 
	  (enseigne1etablissement LIKE '%${searchTerm}%')
	)`;	

	console.log(`Query: ${searchquery}`);

	const bigquery = new BigQuery();
	const options = {
	    query: searchquery,
	    // Location must match that of the dataset(s) referenced in the query.
	    location: 'EU',
	};
	const [job] = await bigquery.createQueryJob(options);
	console.log(`Job ${job.id} started.`);

	// Waits for the query to finish
	const [rows] = await job.getQueryResults();
	console.log('return ' + rows.length);
	rows.forEach(row => {
		res.features.push({
			"type": "Feature",
			"properties" : {
				"name"			: row["name"],
				"siret" 		: row["siret"],
				"siren" 		: row["siren"],
				"nic"			: row["nic"],
				"adresse" 		: row["adresseetablissement"],
				"codepostal" 	: row["codepostaletablissement"],
				"commune" 		: row["libellecommuneetablissement"],
				"departement" 	: row["departementetablissement"],
				"region"		: row["regionetablissement"]
			},
			"geometry" : JSON.parse(row['point'])
		});
	});

	return res;
	/*
	var resStr = '{"type":"FeatureCollection","features":[{"type":"Feature","properties":{"name":"FRANPRIX","siret":"45144281800014","siren":"451442818","nic":"00014","adresse":"76 AV JEAN JAURES","codepostal":"78500","commune":"SARTROUVILLE","departement":"YVELINES","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.157655,48.938624]}},{"type":"Feature","properties":{"name":"LEADER PRICE","siret":"41422750400043","siren":"414227504","nic":"00043","adresse":"RUE DU MARECHAL FOCH","codepostal":"76580","commune":"LE TRAIT","departement":"SEINE-MARITIME","region":"NORMANDIE"},"geometry":{"type":"Point","coordinates":[0.813547,49.474726]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"49153535700025","siren":"491535357","nic":"00025","adresse":"101 RUE DE BUZENVAL","codepostal":"92380","commune":"GARCHES","departement":"HAUTS-DE-SEINE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.205027,48.851747]}},{"type":"Feature","properties":{"name":"FRANPRIX LEADER PRICE","siret":"40217783600010","siren":"402177836","nic":"00010","adresse":"AV JEAN JAURES","codepostal":"77550","commune":"MOISSY CRAMAYEL","departement":"SEINE-ET-MARNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.580147,48.627296]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"41801006200051","siren":"418010062","nic":"00051","adresse":"3 RUE BEAUMARCHAIS","codepostal":"93100","commune":"MONTREUIL","departement":"SEINE-SAINT-DENIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.431613,48.857043]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"68164290600033","siren":"681642906","nic":"00033","adresse":"300 AV MARYSE BASTIE","codepostal":"46000","commune":"CAHORS","departement":"LOT","region":"LANGUEDOC-ROUSSILLON-MIDI-PYRENEES"},"geometry":{"type":"Point","coordinates":[1.426268,44.456444]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"44050135100033","siren":"440501351","nic":"00033","adresse":"216 RUE DE LA TOURRACHE","codepostal":"83600","commune":"FREJUS","departement":"VAR","region":"PROVENCE-ALPES-COTE D\'AZUR"},"geometry":{"type":"Point","coordinates":[6.730645,43.430113]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"75149719900016","siren":"751497199","nic":"00016","adresse":"9 AV DE STALINGRAD","codepostal":"78260","commune":"ACHERES","departement":"YVELINES","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.069156,48.961198]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"44001792900033","siren":"440017929","nic":"00033","adresse":"118 RUE HOUDAN","codepostal":"92330","commune":"SCEAUX","departement":"HAUTS-DE-SEINE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.289209,48.779046]}},{"type":"Feature","properties":{"name":"FRANPRIX MAGENTA","siret":"32902488900019","siren":"329024889","nic":"00019","adresse":"55 BD DE MAGENTA","codepostal":"75010","commune":"PARIS 10","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.358078,48.873751]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"50124400800048","siren":"501244008","nic":"00048","adresse":"3 RUE D ORMESSON","codepostal":"95170","commune":"DEUIL LA BARRE","departement":"VAL-D\'OISE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.317384,48.966828]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"41863280800022","siren":"418632808","nic":"00022","adresse":"10 RUE NICOLAS CHUQUET","codepostal":"75017","commune":"PARIS 17","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.303126,48.888607]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"52379706600025","siren":"523797066","nic":"00025","adresse":"16 RUE FELIX JACQUIER","codepostal":"69006","commune":"LYON 6EME","departement":"RHONE","region":"AUVERGNE-RHONE-ALPES"},"geometry":{"type":"Point","coordinates":[4.847222,45.773526]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"41441748500011","siren":"414417485","nic":"00011","adresse":"RUE DU MONT CHALATS","codepostal":"77500","commune":"CHELLES","departement":"SEINE-ET-MARNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.597882,48.88182]}},{"type":"Feature","properties":{"name":"FRANPRIX SUPER DISCOUNT","siret":"32713932500010","siren":"327139325","nic":"00010","adresse":"180 RUE DE LA ROQUETTE","codepostal":"75011","commune":"PARIS 11","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.387025,48.859295]}},{"type":"Feature","properties":{"name":"FRANPRIX SUPER DISCOUNT","siret":"33258675900059","siren":"332586759","nic":"00059","adresse":"65 RUE SERVAN","codepostal":"75011","commune":"PARIS 11","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.381367,48.863401]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"32892090500010","siren":"328920905","nic":"00010","adresse":"2 RUE TISSERAND","codepostal":"75015","commune":"PARIS 15","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.284917,48.840244]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"33496216400011","siren":"334962164","nic":"00011","adresse":"5 RUE GEOFFROY MARIE","codepostal":"75009","commune":"PARIS 9","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.343515,48.873379]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"33514906800017","siren":"335149068","nic":"00017","adresse":"2 AV DE LA GARE","codepostal":"93420","commune":"VILLEPINTE","departement":"SEINE-SAINT-DENIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.565492,48.945425]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"97220353300088","siren":"972203533","nic":"00088","adresse":"AV BEAUREGARD","codepostal":"74960","commune":"ANNECY","departement":"HAUTE-SAVOIE","region":"AUVERGNE-RHONE-ALPES"},"geometry":{"type":"Point","coordinates":[6.101832,45.904308]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"40441076300027","siren":"404410763","nic":"00027","adresse":"194 RUE D ALESIA","codepostal":"75014","commune":"PARIS 14","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.312181,48.832738]}},{"type":"Feature","properties":{"name":"LE MARCHE FRANPRIX","siret":"31719242500021","siren":"317192425","nic":"00021","adresse":"29 AV LAPLACE","codepostal":"94110","commune":"ARCUEIL","departement":"VAL-DE-MARNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.331981,48.807785]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"31223771200012","siren":"312237712","nic":"00012","adresse":"26 RUE DURET","codepostal":"75116","commune":"PARIS 16","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.285988,48.874434]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"42405522600031","siren":"424055226","nic":"00031","adresse":"6 RUE VOLTAIRE","codepostal":"92250","commune":"LA GARENNE COLOMBES","departement":"HAUTS-DE-SEINE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.247144,48.908346]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"44798797500011","siren":"447987975","nic":"00011","adresse":"120 RUE ANATOLE FRANCE","codepostal":"69100","commune":"VILLEURBANNE","departement":"RHONE","region":"AUVERGNE-RHONE-ALPES"},"geometry":{"type":"Point","coordinates":[4.881028,45.768376]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"39913645600015","siren":"399136456","nic":"00015","adresse":"137 BD AUGUSTE BLANQUI","codepostal":"75013","commune":"PARIS 13","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.343055,48.830912]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"34369784300013","siren":"343697843","nic":"00013","adresse":"272 RUE DE VAUGIRARD","codepostal":"75015","commune":"PARIS 15","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.299887,48.839162]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"34303168800017","siren":"343031688","nic":"00017","adresse":"2 RUE ERNEST LAVISSE","codepostal":"78300","commune":"POISSY","departement":"YVELINES","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.052321,48.926431]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"42030800900018","siren":"420308009","nic":"00018","adresse":"4 RUE PIERRE MIDRIN","codepostal":"92310","commune":"SEVRES","departement":"HAUTS-DE-SEINE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.211535,48.822687]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"52131682800024","siren":"521316828","nic":"00024","adresse":"29 BD JEAN VINGT TROIS","codepostal":"69008","commune":"LYON 8EME","departement":"RHONE","region":"AUVERGNE-RHONE-ALPES"},"geometry":null},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"61202299600013","siren":"612022996","nic":"00013","adresse":"56 RUE DES BATIGNOLLES","codepostal":"75017","commune":"PARIS 17","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.319037,48.886165]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"34960343100017","siren":"349603431","nic":"00017","adresse":"68 AV DU GEN PIERRE BILLOTTE","codepostal":"94000","commune":"CRETEIL","departement":"VAL-DE-MARNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.457641,48.773022]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"47889733300017","siren":"478897333","nic":"00017","adresse":"2 RUE ARTAUD","codepostal":"69004","commune":"LYON 4EME","departement":"RHONE","region":"AUVERGNE-RHONE-ALPES"},"geometry":{"type":"Point","coordinates":[4.833818,45.781423]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"51226653700020","siren":"512266537","nic":"00020","adresse":"102 RUE REAUMUR","codepostal":"75002","commune":"PARIS 2","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.348048,48.867311]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"45276840100013","siren":"452768401","nic":"00013","adresse":"29 CRS VITTON","codepostal":"69006","commune":"LYON 6EME","departement":"RHONE","region":"AUVERGNE-RHONE-ALPES"},"geometry":{"type":"Point","coordinates":[4.852828,45.769639]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"34180214800013","siren":"341802148","nic":"00013","adresse":"173 RUE LECOURBE","codepostal":"75015","commune":"PARIS 15","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.297389,48.840934]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"34224466200017","siren":"342244662","nic":"00017","adresse":"35 RUE CHARCOT","codepostal":"75013","commune":"PARIS 13","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.369945,48.82998]}},{"type":"Feature","properties":{"name":"LE MARCHE FRANPRIX","siret":"50963047100019","siren":"509630471","nic":"00019","adresse":"9 RUE PASTEUR","codepostal":"26000","commune":"VALENCE","departement":"DROME","region":"AUVERGNE-RHONE-ALPES"},"geometry":{"type":"Point","coordinates":[4.891937,44.928898]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"51819751200024","siren":"518197512","nic":"00024","adresse":"116 RUE DE LA TOUR","codepostal":"75116","commune":"PARIS 16","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.275949,48.862982]}},{"type":"Feature","properties":{"name":"FRANPRIX SUPER DISCOUNT","siret":"30950685500019","siren":"309506855","nic":"00019","adresse":"6 RUE DE LA PHILOSOPHIE","codepostal":"93140","commune":"BONDY","departement":"SEINE-SAINT-DENIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.495014,48.889772]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"52255095300023","siren":"522550953","nic":"00023","adresse":"26 RUE SALA","codepostal":"69002","commune":"LYON 2EME","departement":"RHONE","region":"AUVERGNE-RHONE-ALPES"},"geometry":{"type":"Point","coordinates":[4.830021,45.755509]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"40282879200018","siren":"402828792","nic":"00018","adresse":"29 RUE SAINTE CROIX","codepostal":"91150","commune":"ETAMPES","departement":"ESSONNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.163375,48.433803]}},{"type":"Feature","properties":{"name":"MARCHE FRANPRIX","siret":"52520100000029","siren":"525201000","nic":"00029","adresse":"75 BD VOLTAIRE","codepostal":"92600","commune":"ASNIERES SUR SEINE","departement":"HAUTS-DE-SEINE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.293081,48.915262]}},{"type":"Feature","properties":{"name":"FRANPRIX SUPER DISCOUNT","siret":"32349441900019","siren":"323494419","nic":"00019","adresse":"19 BD JEAN JAURES","codepostal":"92110","commune":"CLICHY","departement":"HAUTS-DE-SEINE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.307732,48.897993]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"33501660600014","siren":"335016606","nic":"00014","adresse":"13 RUE DU DOCTEUR LERAY","codepostal":"95100","commune":"ARGENTEUIL","departement":"VAL-D\'OISE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.256591,48.949148]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"33975422800056","siren":"339754228","nic":"00056","adresse":"19 RUE LENINE","codepostal":"94200","commune":"IVRY SUR SEINE","departement":"VAL-DE-MARNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.396573,48.817252]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"40119681100020","siren":"401196811","nic":"00020","adresse":"56 RUE DES VIGNOLES","codepostal":"75020","commune":"PARIS 20","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.40117,48.854921]}},{"type":"Feature","properties":{"name":"LE MARCHE FRANPRIX","siret":"51510038600017","siren":"515100386","nic":"00017","adresse":"PL DES TROIS NOYERS","codepostal":"95200","commune":"SARCELLES","departement":"VAL-D\'OISE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.378882,48.990197]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"32079835800018","siren":"320798358","nic":"00018","adresse":"CAMP DE SATORY","codepostal":"78000","commune":"VERSAILLES","departement":"YVELINES","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.117785,48.784348]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"34322047100019","siren":"343220471","nic":"00019","adresse":"26 RUE DE MEAUX","codepostal":"75019","commune":"PARIS 19","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.372629,48.880315]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"56206769400017","siren":"562067694","nic":"00017","adresse":"34 RUE DE LA REPUBLIQUE","codepostal":"93200","commune":"SAINT DENIS","departement":"SEINE-SAINT-DENIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.355115,48.936432]}},{"type":"Feature","properties":{"name":"FRANPRIX SUPER DISCOUNT","siret":"30717843400014","siren":"307178434","nic":"00014","adresse":"112 RUE DU PDT WILSON","codepostal":"92300","commune":"LEVALLOIS PERRET","departement":"HAUTS-DE-SEINE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.286374,48.896819]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"34969633600016","siren":"349696336","nic":"00016","adresse":"101 RUE DES MORILLONS","codepostal":"75015","commune":"PARIS 15","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.305494,48.831806]}},{"type":"Feature","properties":{"name":"SUPER FRANPRIX","siret":"73202623200015","siren":"732026232","nic":"00015","adresse":"67 RUE DE LA CROIX NIVERT","codepostal":"75015","commune":"PARIS 15","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.296868,48.844416]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"82368988000016","siren":"823689880","nic":"00016","adresse":"75 RUE CARNOT","codepostal":"92300","commune":"LEVALLOIS PERRET","departement":"HAUTS-DE-SEINE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.285597,48.892873]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"52520105900025","siren":"525201059","nic":"00025","adresse":"20 RUE PHILIPPE DE GIRARD","codepostal":"75010","commune":"PARIS 10","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.361696,48.883339]}},{"type":"Feature","properties":{"name":"LE MARCHE FRANPRIX","siret":"32181928600022","siren":"321819286","nic":"00022","adresse":"21 RUE ALAIN CHARTIER","codepostal":"75015","commune":"PARIS 15","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.295974,48.837966]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"32206718200012","siren":"322067182","nic":"00012","adresse":"23 AV PARMENTIER","codepostal":"75011","commune":"PARIS 11","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.377794,48.86091]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"51051650300024","siren":"510516503","nic":"00024","adresse":"22 AV DE SAINT OUEN","codepostal":"75018","commune":"PARIS 18","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.326138,48.888616]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"53337447600018","siren":"533374476","nic":"00018","adresse":"21 AV DU MAL FOCH","codepostal":"77680","commune":"ROISSY EN BRIE","departement":"SEINE-ET-MARNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.668442,48.790871]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"51762678400022","siren":"517626784","nic":"00022","adresse":"4 RUE CARNOT","codepostal":"95300","commune":"PONTOISE","departement":"VAL-D\'OISE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.095346,49.048047]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"52024609100026","siren":"520246091","nic":"00026","adresse":"PL MARC SANGNIER","codepostal":"95500","commune":"GONESSE","departement":"VAL-D\'OISE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.422797,49.001955]}},{"type":"Feature","properties":{"name":"LE MARCHE FRANPRIX","siret":"52286350500023","siren":"522863505","nic":"00023","adresse":"21 RUE RAYMOND PATENOTRE","codepostal":"78120","commune":"RAMBOUILLET","departement":"YVELINES","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[1.830406,48.641489]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"42956144200022","siren":"429561442","nic":"00022","adresse":"12 AV GENERAL LECLERC","codepostal":"93250","commune":"VILLEMOMBLE","departement":"SEINE-SAINT-DENIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.510553,48.88608]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"75067207300012","siren":"750672073","nic":"00012","adresse":"38 AV DE SUFFREN","codepostal":"75015","commune":"PARIS 15","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.295076,48.854722]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"34904455200025","siren":"349044552","nic":"00025","adresse":"46 RUE DE LA GLACIERE","codepostal":"75013","commune":"PARIS 13","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.344549,48.833381]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"40329860700017","siren":"403298607","nic":"00017","adresse":"102 AV DU GENERAL DE GAULLE","codepostal":"94700","commune":"MAISONS ALFORT","departement":"VAL-DE-MARNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.428318,48.80292]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"40408894000014","siren":"404088940","nic":"00014","adresse":"18 BD DE BELLEVILLE","codepostal":"75020","commune":"PARIS 20","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.378971,48.872535]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"34835964700016","siren":"348359647","nic":"00016","adresse":"28 RUE MARC SANGNIER","codepostal":"94230","commune":"CACHAN","departement":"VAL-DE-MARNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.332626,48.786105]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"35088924200011","siren":"350889242","nic":"00011","adresse":"11 RUE DELAMBRE","codepostal":"75014","commune":"PARIS 14","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.328278,48.841652]}},{"type":"Feature","properties":{"name":"LE MARCHE FRANPRIX","siret":"35082150000039","siren":"350821500","nic":"00039","adresse":"44 RUE FORTUNY","codepostal":"75017","commune":"PARIS 17","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.307991,48.882802]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"41154146900028","siren":"411541469","nic":"00028","adresse":"RUE DE LONDRES","codepostal":"94140","commune":"ALFORTVILLE","departement":"VAL-DE-MARNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.428125,48.790337]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"41057038600012","siren":"410570386","nic":"00012","adresse":"60 AV GAMBETTA","codepostal":"94700","commune":"MAISONS ALFORT","departement":"VAL-DE-MARNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.442584,48.809937]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"41285568600017","siren":"412855686","nic":"00017","adresse":"22 RUE DE VILLIERS","codepostal":"92300","commune":"LEVALLOIS PERRET","departement":"HAUTS-DE-SEINE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.281859,48.88818]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"34345016900010","siren":"343450169","nic":"00010","adresse":"174 RUE DE LA POMPE","codepostal":"75116","commune":"PARIS 16","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.279288,48.865676]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"32870428300014","siren":"328704283","nic":"00014","adresse":"3 RUE DE LA CHAPELLE","codepostal":"75018","commune":"PARIS 18","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.359686,48.89064]}},{"type":"Feature","properties":{"name":"LE MARCHE FRANPRIX","siret":"30521933900069","siren":"305219339","nic":"00069","adresse":"RUE PIERRE DE COUBERTIN","codepostal":"91330","commune":"YERRES","departement":"ESSONNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.479119,48.713193]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"38791806300018","siren":"387918063","nic":"00018","adresse":"ALL DES TROIS FONTAINES","codepostal":"77176","commune":"SAVIGNY LE TEMPLE","departement":"SEINE-ET-MARNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.55461,48.607271]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"51361282000029","siren":"513612820","nic":"00029","adresse":"9 RUE DE LA PLATIERE","codepostal":"69001","commune":"LYON 1ER","departement":"RHONE","region":"AUVERGNE-RHONE-ALPES"},"geometry":{"type":"Point","coordinates":[4.832125,45.766126]}},{"type":"Feature","properties":{"name":"LE MARCHE FRANPRIX","siret":"41942523600017","siren":"419425236","nic":"00017","adresse":"55 AV JEAN JAURES","codepostal":"75019","commune":"PARIS 19","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.37583,48.884415]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"34952619400015","siren":"349526194","nic":"00015","adresse":"55 RUE DU GENERAL DE GAULLE","codepostal":"94290","commune":"VILLENEUVE LE ROI","departement":"VAL-DE-MARNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.421613,48.735085]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"50946389900021","siren":"509463899","nic":"00021","adresse":"77 RUE JULES GUESDE","codepostal":"92300","commune":"LEVALLOIS PERRET","departement":"HAUTS-DE-SEINE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.290792,48.895226]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"34818814500018","siren":"348188145","nic":"00018","adresse":"112 RUE CARDINET","codepostal":"75017","commune":"PARIS 17","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.311973,48.885818]}},{"type":"Feature","properties":{"name":"FRANPRIX TAVERNY SAINTE HONORINE","siret":"52095696200028","siren":"520956962","nic":"00028","adresse":"461 RUE DES PEUPLIERS","codepostal":"95150","commune":"TAVERNY","departement":"VAL-D\'OISE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.208527,49.010513]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"41057488300014","siren":"410574883","nic":"00014","adresse":"2 RUE HENRI JANIN","codepostal":"94190","commune":"VILLENEUVE SAINT GEORGES","departement":"VAL-DE-MARNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.447532,48.728999]}},{"type":"Feature","properties":{"name":"LE MARCHE FRANPRIX","siret":"34322024000018","siren":"343220240","nic":"00018","adresse":"12 RUE POUCHET","codepostal":"75017","commune":"PARIS 17","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.319207,48.892206]}},{"type":"Feature","properties":{"name":"LE MARCHE FRANPRIX","siret":"34904455200017","siren":"349044552","nic":"00017","adresse":"41 RUE JOSEPH DE MAISTRE","codepostal":"75018","commune":"PARIS 18","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.330198,48.893077]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"45105737600019","siren":"451057376","nic":"00019","adresse":"128 RUE HAXO","codepostal":"75019","commune":"PARIS 19","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.402018,48.877301]}},{"type":"Feature","properties":{"name":"LE MARCHE FRANPRIX","siret":"38349878900015","siren":"383498789","nic":"00015","adresse":"CTRE COMMERCIAL ST EXUPERY","codepostal":"94380","commune":"BONNEUIL SUR MARNE","departement":"VAL-DE-MARNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.482861,48.771559]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"34332336600025","siren":"343323366","nic":"00025","adresse":"85 RUE REAUMUR","codepostal":"75002","commune":"PARIS 2","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.348037,48.866981]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"34419406300014","siren":"344194063","nic":"00014","adresse":"79 RUE DU RANELAGH","codepostal":"75016","commune":"PARIS 16","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.271507,48.855164]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"41537732400017","siren":"415377324","nic":"00017","adresse":"28 CHE DE MEAUX","codepostal":"93360","commune":"NEUILLY PLAISANCE","departement":"SEINE-SAINT-DENIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.512003,48.86263]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"38765154000024","siren":"387651540","nic":"00024","adresse":"17 BD HENRI IV","codepostal":"75004","commune":"PARIS 4","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.363758,48.851604]}},{"type":"Feature","properties":{"name":"LE MARCHE FRANPRIX","siret":"75002736900024","siren":"750027369","nic":"00024","adresse":"64 RUE DU CHEVALERET","codepostal":"75013","commune":"PARIS 13","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.375451,48.830209]}},{"type":"Feature","properties":{"name":"LE MARCHE FRANPRIX","siret":"32535618600016","siren":"325356186","nic":"00016","adresse":"24 RUE LA CONDAMINE","codepostal":"75017","commune":"PARIS 17","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.3234,48.887292]}},{"type":"Feature","properties":{"name":"TANG FRERES FRANPRIX","siret":"35153882200039","siren":"351538822","nic":"00039","adresse":"2 RUE DU SUFFRAGE UNIVERSEL","codepostal":"77185","commune":"LOGNES","departement":"SEINE-ET-MARNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.631043,48.837428]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"39530661600016","siren":"395306616","nic":"00016","adresse":"10 AV LOUVOIS","codepostal":"92190","commune":"MEUDON","departement":"HAUTS-DE-SEINE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.239924,48.807506]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"41167505100014","siren":"411675051","nic":"00014","adresse":"6 AV VICTOR HUGO","codepostal":"94600","commune":"CHOISY LE ROI","departement":"VAL-DE-MARNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.415163,48.767007]}},{"type":"Feature","properties":{"name":"LE PANIER GOURMET BY FRANPRIX","siret":"53323955400017","siren":"533239554","nic":"00017","adresse":"36 RUE DE SAUSSURE","codepostal":"75017","commune":"PARIS 17","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.315866,48.884654]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"53782748700027","siren":"537827487","nic":"00027","adresse":"74 AV ARISTIDE BRIAND","codepostal":"93190","commune":"LIVRY GARGAN","departement":"SEINE-SAINT-DENIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.527606,48.914644]}},{"type":"Feature","properties":{"name":"SD FRANPRIX","siret":"32281513500015","siren":"322815135","nic":"00015","adresse":"121 AV DE WAGRAM","codepostal":"75017","commune":"PARIS 17","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.300959,48.882252]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"41863263400014","siren":"418632634","nic":"00014","adresse":"40 BD ST JACQUES","codepostal":"75014","commune":"PARIS 14","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.337498,48.833139]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"42120468600016","siren":"421204686","nic":"00016","adresse":"39 RUE GODOT DE MAUROY","codepostal":"75009","commune":"PARIS 9","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.32741,48.872483]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"41968977300010","siren":"419689773","nic":"00010","adresse":"99 RUE DE FONTENAY","codepostal":"94300","commune":"VINCENNES","departement":"VAL-DE-MARNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.435844,48.848283]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"44322767300011","siren":"443227673","nic":"00011","adresse":"18 RUE DE SAINT DENIS","codepostal":"93400","commune":"SAINT OUEN","departement":"SEINE-SAINT-DENIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.331182,48.917031]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"38918707100029","siren":"389187071","nic":"00029","adresse":"64 BD DE BELLEVILLE","codepostal":"75020","commune":"PARIS 20","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.383017,48.873398]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"34324784700019","siren":"343247847","nic":"00019","adresse":"23 BD DE GRENELLE","codepostal":"75015","commune":"PARIS 15","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.290445,48.853174]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"42470094600025","siren":"424700946","nic":"00025","adresse":"6 RUE DES ECOLES","codepostal":"95880","commune":"ENGHIEN LES BAINS","departement":"VAL-D\'OISE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.311359,48.969507]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"51242174400024","siren":"512421744","nic":"00024","adresse":"157 RUE DU ROUET","codepostal":"13008","commune":"MARSEILLE 8","departement":"BOUCHES-DU-RHONE","region":"PROVENCE-ALPES-COTE D\'AZUR"},"geometry":{"type":"Point","coordinates":[5.392486,43.278247]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"39426928600016","siren":"394269286","nic":"00016","adresse":"133 RUE NATIONALE","codepostal":"75013","commune":"PARIS 13","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.364162,48.83048]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"42074556400013","siren":"420745564","nic":"00013","adresse":"6 BD JOURDAN","codepostal":"75014","commune":"PARIS 14","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.343557,48.819699]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"73203122400015","siren":"732031224","nic":"00015","adresse":"13 RUE RUBENS","codepostal":"75013","commune":"PARIS 13","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.355788,48.834102]}},{"type":"Feature","properties":{"name":"LE MARCHE FRANPRIX","siret":"37795047200011","siren":"377950472","nic":"00011","adresse":"32 RUE DE LA CONVENTION","codepostal":"75015","commune":"PARIS 15","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.280065,48.844546]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"40078414600021","siren":"400784146","nic":"00021","adresse":"12 RUE DE LA CHINE","codepostal":"75020","commune":"PARIS 20","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.399199,48.86723]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"38250320900027","siren":"382503209","nic":"00027","adresse":"LES MERISIERS","codepostal":"78711","commune":"MANTES LA VILLE","departement":"YVELINES","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[1.706669,48.976585]}},{"type":"Feature","properties":{"name":"LE MARCHE FRANPRIX","siret":"41048216000026","siren":"410482160","nic":"00026","adresse":"BD DE LA VERVILLE","codepostal":"91540","commune":"MENNECY","departement":"ESSONNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.428198,48.552931]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"40904851900014","siren":"409048519","nic":"00014","adresse":"1 RUE DE STAEL","codepostal":"75015","commune":"PARIS 15","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.309855,48.844399]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"40819111200023","siren":"408191112","nic":"00023","adresse":"67 RUE BALARD","codepostal":"75015","commune":"PARIS 15","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.278183,48.84028]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"31873171800017","siren":"318731718","nic":"00017","adresse":"16 RUE ALEXANDRE PARODI","codepostal":"75010","commune":"PARIS 10","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.365148,48.880081]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"41359907700026","siren":"413599077","nic":"00026","adresse":"42 AV DE PROVENCE","codepostal":"91170","commune":"VIRY CHATILLON","departement":"ESSONNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.36152,48.668468]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"33106611800018","siren":"331066118","nic":"00018","adresse":"PL LOUVOIS","codepostal":"78140","commune":"VELIZY VILLACOUBLAY","departement":"YVELINES","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.198326,48.781867]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"50048862200019","siren":"500488622","nic":"00019","adresse":"106 AV DU MARECHAL DE SAXE","codepostal":"69003","commune":"LYON 3EME","departement":"RHONE","region":"AUVERGNE-RHONE-ALPES"},"geometry":{"type":"Point","coordinates":[4.84582,45.758613]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"50161144600029","siren":"501611446","nic":"00029","adresse":"23 BD DES BATIGNOLLES","codepostal":"75008","commune":"PARIS 8","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.324738,48.882768]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"42478800800011","siren":"424788008","nic":"00011","adresse":"31 RUE FREMICOURT","codepostal":"75015","commune":"PARIS 15","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.299413,48.847627]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"53755540100034","siren":"537555401","nic":"00034","adresse":"24 RUE DU GENERAL LECLERC","codepostal":"91420","commune":"MORANGIS","departement":"ESSONNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.329432,48.707279]}},{"type":"Feature","properties":{"name":"LE MARCHE FRANPRIX","siret":"51043957300013","siren":"510439573","nic":"00013","adresse":"PL DU DOUBS","codepostal":"78310","commune":"MAUREPAS","departement":"YVELINES","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[1.943277,48.768006]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"31680644700025","siren":"316806447","nic":"00025","adresse":"74 RUE DE WATTIGNIES","codepostal":"75012","commune":"PARIS 12","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.399473,48.834914]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"33463055500038","siren":"334630555","nic":"00038","adresse":"61 AV LEDRU ROLLIN","codepostal":"75012","commune":"PARIS 12","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.372951,48.849034]}},{"type":"Feature","properties":{"name":"FRANPRIX FROT","siret":"34316086700028","siren":"343160867","nic":"00028","adresse":"8 RUE LEON FROT","codepostal":"75011","commune":"PARIS 11","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.388264,48.853479]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"47908205900029","siren":"479082059","nic":"00029","adresse":"84 CRS DE VINCENNES","codepostal":"75012","commune":"PARIS 12","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.406703,48.84704]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"39902934700016","siren":"399029347","nic":"00016","adresse":"2 RUE RAYMOND QUENEAU","codepostal":"75018","commune":"PARIS 18","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.36199,48.895427]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"32104458800036","siren":"321044588","nic":"00036","adresse":"85 AV DU GENERAL DE GAULLE","codepostal":"92800","commune":"PUTEAUX","departement":"HAUTS-DE-SEINE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.231135,48.886416]}},{"type":"Feature","properties":{"name":"MARCHE FRANPRIX","siret":"31570959200028","siren":"315709592","nic":"00028","adresse":"130 AV DU ROULE","codepostal":"92200","commune":"NEUILLY SUR SEINE","departement":"HAUTS-DE-SEINE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.264711,48.885569]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"41120268200018","siren":"411202682","nic":"00018","adresse":"10 RUE DE SAINT SENOCH","codepostal":"75017","commune":"PARIS 17","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.293675,48.881632]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"40421898400015","siren":"404218984","nic":"00015","adresse":"2 RUE DU CHATELET","codepostal":"51100","commune":"REIMS","departement":"MARNE","region":"ALSACE-CHAMPAGNE-ARDENNE-LORRAINE"},"geometry":{"type":"Point","coordinates":[4.037834,49.242594]}},{"type":"Feature","properties":{"name":"CASINO","siret":"50950685300019","siren":"509506853","nic":"00019","adresse":"29 RUE ALPHONSE KARR","codepostal":"06000","commune":"NICE","departement":"ALPES-MARITIMES","region":"PROVENCE-ALPES-COTE D\'AZUR"},"geometry":{"type":"Point","coordinates":[7.263686,43.701379]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"33831861100021","siren":"338318611","nic":"00021","adresse":"130 RUE DANIELLE CASANOVA","codepostal":"93300","commune":"AUBERVILLIERS","departement":"SEINE-SAINT-DENIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.400102,48.915436]}},{"type":"Feature","properties":{"name":"SDV FRANPRIX","siret":"66202595600019","siren":"662025956","nic":"00019","adresse":"240 BD VOLTAIRE","codepostal":"75011","commune":"PARIS 11","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.39043,48.851462]}},{"type":"Feature","properties":{"name":"FRANPRIX SUPER DISCOUNT","siret":"33356461500016","siren":"333564615","nic":"00016","adresse":"CENTRE CIAL DE LA HABETTE","codepostal":"94000","commune":"CRETEIL","departement":"VAL-DE-MARNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.465758,48.773079]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"34919554500018","siren":"349195545","nic":"00018","adresse":"13 RUE D ESTIENNE D ORVES","codepostal":"92110","commune":"CLICHY","departement":"HAUTS-DE-SEINE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.303425,48.906421]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"62205870900016","siren":"622058709","nic":"00016","adresse":"51 AV PIERRE BROSSOLETTE","codepostal":"94170","commune":"LE PERREUX SUR MARNE","departement":"VAL-DE-MARNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.499199,48.835284]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"31971274100010","siren":"319712741","nic":"00010","adresse":"7 RUE DES PETITES ECURIES","codepostal":"75010","commune":"PARIS 10","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.353542,48.873019]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"72205443400013","siren":"722054434","nic":"00013","adresse":"122 RUE MOUFFETARD","codepostal":"75005","commune":"PARIS 5","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.349705,48.840161]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"50003675100013","siren":"500036751","nic":"00013","adresse":"AV DU GENERAL DE GAULLE","codepostal":"94000","commune":"CRETEIL","departement":"VAL-DE-MARNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.447262,48.792504]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"69200251200014","siren":"692002512","nic":"00014","adresse":"25 AV CHARLES GIDE","codepostal":"94270","commune":"LE KREMLIN BICETRE","departement":"VAL-DE-MARNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.353682,48.806977]}},{"type":"Feature","properties":{"name":"FRANPRIX SUPER DISCOUNT","siret":"33356508300016","siren":"333565083","nic":"00016","adresse":"287 AV DU GENERAL DE GAULLE","codepostal":"94000","commune":"CRETEIL","departement":"VAL-DE-MARNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.445253,48.790987]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"82117195600021","siren":"821171956","nic":"00021","adresse":"10 CHE DE SAVIGNY","codepostal":"93270","commune":"SEVRAN","departement":"SEINE-SAINT-DENIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.522496,48.940661]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"48098942500024","siren":"480989425","nic":"00024","adresse":"12 RUE DANES DE MONTARDAT","codepostal":"78100","commune":"SAINT GERMAIN EN LAYE","departement":"YVELINES","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.089608,48.896353]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"51859291000013","siren":"518592910","nic":"00013","adresse":"7 AV DE VALENTON","codepostal":"94450","commune":"LIMEIL BREVANNES","departement":"VAL-DE-MARNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.500713,48.742873]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"39095335400011","siren":"390953354","nic":"00011","adresse":"87 RUE DAMREMONT","codepostal":"75018","commune":"PARIS 18","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.336386,48.893887]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"45262129500016","siren":"452621295","nic":"00016","adresse":"47 AV DE LA DIVISION LECLERC","codepostal":"93350","commune":"LE BOURGET","departement":"SEINE-SAINT-DENIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.424086,48.933441]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"53969848000024","siren":"539698480","nic":"00024","adresse":"17 AV JEAN LOLIVE","codepostal":"93500","commune":"PANTIN","departement":"SEINE-SAINT-DENIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.4114,48.892936]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"39213630500019","siren":"392136305","nic":"00019","adresse":"RUE DE LA RONCE","codepostal":"92410","commune":"VILLE D\'AVRAY","departement":"HAUTS-DE-SEINE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.190558,48.822855]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"41463101000025","siren":"414631010","nic":"00025","adresse":"78 RUE ARMAND SILVESTRE","codepostal":"92400","commune":"COURBEVOIE","departement":"HAUTS-DE-SEINE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.266313,48.901592]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"41488533500037","siren":"414885335","nic":"00037","adresse":"121 RUE DE LA GLACIERE","codepostal":"75013","commune":"PARIS 13","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.342181,48.826977]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"41838580300030","siren":"418385803","nic":"00030","adresse":"5 RUE DAREAU","codepostal":"75014","commune":"PARIS 14","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.339137,48.831785]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"38013119300019","siren":"380131193","nic":"00019","adresse":"7 PL DE L EGLISE","codepostal":"94260","commune":"FRESNES","departement":"VAL-DE-MARNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.323003,48.754709]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"82136063300027","siren":"821360633","nic":"00027","adresse":"74 AV ARISTIDE BRIAND","codepostal":"93190","commune":"LIVRY GARGAN","departement":"SEINE-SAINT-DENIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.527606,48.914644]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"82079653000021","siren":"820796530","nic":"00021","adresse":"12 RUE POUCHET","codepostal":"75017","commune":"PARIS 17","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.319207,48.892206]}},{"type":"Feature","properties":{"name":"FRANPRIX PHILEAS ESSO","siret":"37945523101130","siren":"379455231","nic":"01130","adresse":"AUTOROUTE A6","codepostal":"69380","commune":"LES CHERES","departement":"RHONE","region":"AUVERGNE-RHONE-ALPES"},"geometry":{"type":"Point","coordinates":[4.738417,45.886563]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"35290487400018","siren":"352904874","nic":"00018","adresse":"10 RUE DE MONTEVIDEO","codepostal":"75116","commune":"PARIS 16","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.27774,48.86541]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"31519988500015","siren":"315199885","nic":"00015","adresse":"5 PL DE RUNGIS","codepostal":"75013","commune":"PARIS 13","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.346943,48.822035]}},{"type":"Feature","properties":{"name":"LE MARCHE  FRANPRIX","siret":"50898184200018","siren":"508981842","nic":"00018","adresse":"7 RUE DE L ANNEXION","codepostal":"74000","commune":"ANNECY","departement":"HAUTE-SAVOIE","region":"AUVERGNE-RHONE-ALPES"},"geometry":{"type":"Point","coordinates":[6.124289,45.90085]}},{"type":"Feature","properties":{"name":"LE MARCHE FRANPRIX","siret":"50021667600022","siren":"500216676","nic":"00022","adresse":"85 AV DE LA REPUBLIQUE","codepostal":"93300","commune":"AUBERVILLIERS","departement":"SEINE-SAINT-DENIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.388744,48.907211]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"32314213300012","siren":"323142133","nic":"00012","adresse":"3 RUE PAUL VAILLANT COUTURIER","codepostal":"93170","commune":"BAGNOLET","departement":"SEINE-SAINT-DENIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.417488,48.868312]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"32066050900011","siren":"320660509","nic":"00011","adresse":"13 RUE DE SAMBRE ET MEUSE","codepostal":"75010","commune":"PARIS 10","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.370833,48.875125]}},{"type":"Feature","properties":{"name":"LEADER EXPRESS","siret":"34327943600012","siren":"343279436","nic":"00012","adresse":"16 RUE LOUIS BRAILLE","codepostal":"75012","commune":"PARIS 12","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.401907,48.839642]}},{"type":"Feature","properties":{"name":"FRANPRIX SD","siret":"34394649700017","siren":"343946497","nic":"00017","adresse":"9 RUE DE LABORDE","codepostal":"75008","commune":"PARIS 8","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.322051,48.875729]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"53483951900020","siren":"534839519","nic":"00020","adresse":"30 RUE DU FAUBOURG DU TEMPLE","codepostal":"75011","commune":"PARIS 11","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.367911,48.868694]}},{"type":"Feature","properties":{"name":"LE MARCHE FRANPRIX","siret":"35352065300018","siren":"353520653","nic":"00018","adresse":"13 PL D ALIGRE","codepostal":"75012","commune":"PARIS 12","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.378794,48.848977]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"31980338300037","siren":"319803383","nic":"00037","adresse":"147 IMP ALPHONSE DAUDET","codepostal":"83136","commune":"ROCBARON","departement":"VAR","region":"PROVENCE-ALPES-COTE D\'AZUR"},"geometry":{"type":"Point","coordinates":[6.081886,43.300809]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"33838771500018","siren":"338387715","nic":"00018","adresse":"71 RUE DE DUNKERQUE","codepostal":"75009","commune":"PARIS 9","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.347567,48.881663]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"75175512500018","siren":"751755125","nic":"00018","adresse":"129 AV ARISTIDE BRIAND","codepostal":"92120","commune":"MONTROUGE","departement":"HAUTS-DE-SEINE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.326721,48.811043]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"41420095600020","siren":"414200956","nic":"00020","adresse":"5 RUE PIERRE WACQUANT","codepostal":"92190","commune":"MEUDON","departement":"HAUTS-DE-SEINE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.228394,48.819876]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"34536669400023","siren":"345366694","nic":"00023","adresse":"53 AV PIERRE MENDES FRANCE","codepostal":"75013","commune":"PARIS 13","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.368908,48.839739]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"41339342200055","siren":"413393422","nic":"00055","adresse":"61 RUE DU POTEAU","codepostal":"75018","commune":"PARIS 18","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.340151,48.895184]}},{"type":"Feature","properties":{"name":"MARCHE FRANPRIX","siret":"41525019000022","siren":"415250190","nic":"00022","adresse":"6 PL MARCEAU","codepostal":"28000","commune":"CHARTRES","departement":"EURE-ET-LOIR","region":"CENTRE-VAL DE LOIRE"},"geometry":{"type":"Point","coordinates":[1.487762,48.445278]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"41758638500011","siren":"417586385","nic":"00011","adresse":"23 AV PAUL DOUMER","codepostal":"75116","commune":"PARIS 16","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.289559,48.870694]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"41453227500016","siren":"414532275","nic":"00016","adresse":"56 RUE DE LONGCHAMP","codepostal":"75116","commune":"PARIS 16","departement":"PARIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.287224,48.865088]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"41847542200014","siren":"418475422","nic":"00014","adresse":"LES HOUTRAITS","codepostal":"92500","commune":"RUEIL MALMAISON","departement":"HAUTS-DE-SEINE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.205434,48.867954]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"43342999000040","siren":"433429990","nic":"00040","adresse":"6 AV VICTOR HUGO","codepostal":"94600","commune":"CHOISY LE ROI","departement":"VAL-DE-MARNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.415163,48.767007]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"43483204400011","siren":"434832044","nic":"00011","adresse":"210 AV PIERRE BROSSOLETTE","codepostal":"94170","commune":"LE PERREUX SUR MARNE","departement":"VAL-DE-MARNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.512688,48.834315]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"41772064600039","siren":"417720646","nic":"00039","adresse":"12 PL DU 14 JUILLET","codepostal":"91270","commune":"VIGNEUX SUR SEINE","departement":"ESSONNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.422806,48.705843]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"41762746000021","siren":"417627460","nic":"00021","adresse":"23 PL DU MARCHE","codepostal":"91290","commune":"ARPAJON","departement":"ESSONNE","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.24965,48.588899]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"42230931000023","siren":"422309310","nic":"00023","adresse":"39 RUE ORBE","codepostal":"76000","commune":"ROUEN","departement":"SEINE-MARITIME","region":"NORMANDIE"},"geometry":{"type":"Point","coordinates":[1.104154,49.44317]}},{"type":"Feature","properties":{"name":"FRANPRIX","siret":"42823673100017","siren":"428236731","nic":"00017","adresse":"70 RUE DU ONZE NOVEMBRE","codepostal":"93330","commune":"NEUILLY SUR MARNE","departement":"SEINE-SAINT-DENIS","region":"ILE-DE-FRANCE"},"geometry":{"type":"Point","coordinates":[2.52649,48.863201]}}]}';
	return JSON.parse(resStr);
	*/
};

function insertNewJob(messageid, searchTerm) {
	console.log(`insertNewJob for searchTerm = ${searchTerm}`);
	const extend = require('lodash').assign;
	const mysql = require('mysql');
	const config = require('../../config');

	let dbconfig = {
		"GCLOUD_PROJECT": "ggo-background",
		"MYSQL_USER": "root",
		"MYSQL_PASSWORD": "G@L1ge02018",
		"INSTANCE_CONNECTION_NAME": "ggo-background:europe-west1:ggobgpdvanalyzer",
		"DATABASE_NAME": "pdvanalyzerdb"
	};

	dbconfig = {
		MYSQL_USER: process.env.SQL_USER,
		MYSQL_PASSWORD: process.env.SQL_PASSWORD,
		DATABASE_NAME: process.env.SQL_DATABASE,
	};
	const options = {
	  user: dbconfig.MYSQL_USER,
	  password: dbconfig.MYSQL_PASSWORD,
	  database: dbconfig.DATABASE_NAME,
	};


	/*
	if (
	  config.get('INSTANCE_CONNECTION_NAME') &&
	  config.get('NODE_ENV') === 'production'
	) {
	  options.socketPath = `/cloudsql/${config.get('INSTANCE_CONNECTION_NAME')}`;
	}
	*/
	//options.socketPath = `/cloudsql/${config.get('INSTANCE_CONNECTION_NAME')}`;
	if ( process.env.NODE_ENV === 'production') {
		options.socketPath = `/cloudsql/${dbconfig['INSTANCE_CONNECTION_NAME']}`;
	}

	//const connection = mysql.createConnection(options);
	const connection = getConnection();
	let insertJob = `INSERT INTO jobs(messageid, searchText, status) VALUES ('${messageid}', '${searchTerm}', 'waiting')`;

	connection.query(insertJob, (err, res) => {
		if (err) {
			logging.error(`Failed to insert a new job for message id ${messageid}. ${err}`);
			return;
		}
	});
};

function getTopic(cb) {
	pubsub.createTopic(topicName, (err, topic) => {
		// topic already exists.
		if (err && err.code === 6) {
			cb(null, pubsub.topic(topicName));
			return;
		}
		cb(err, topic);
	});
}
/**
 * Publishes a message to a Cloud Pub/Sub Topic.

 * @param {object} req Cloud Function request context.
 * @param {object} req.body The request body.
 * @param {string} req.body.topic Topic name on which to publish.
 * @param {string} req.body.message Message to publish.
 * @param {object} res Cloud Function response context.
 */
async function _publish (sirets, searchTerm, res) {
	const dbTable = 'pdvanalyzer_' + Date.now();
	const message = {
		sirets: sirets
	};

	/*
	const topicname = 'pdvanalyzer-topic';
	// References an existing topic
	const topic = pubsub.topic(topicname);
	console.log(`Publishing message to topic ${topicname}`);
	
	
	getTopic((err, topic) => {
		if (err) {
			logging.error('Error occurred while getting pubsub topic', err);
			return;
		}

		logging.info(`Message info to send ${JSON.stringify(message)}`);

		const publisher = topic.publisher();
		publisher.publish(Buffer.from(JSON.stringify(message)), err => {
		  if (err) {
		    logging.error('Error occurred while queuing background task', err);
		  } else {
		    logging.info(`Queued for background processing`);
		  }
		});
	});
	*/
	const dataBuffer = Buffer.from(JSON.stringify(message));

	const msgId = await pubsub
		.topic(topicName)
		.publisher()
		.publish(dataBuffer);
	logging.info(`Message ${msgId} published.`);

	insertNewJob(msgId, searchTerm);
	logging.info(`New Job ${msgId} inserted in database.`);

	return { jobId: msgId};
};

function getConnection() {
	const mysql = require('mysql');
	const config = require('../../config');

	let dbconfig = {
		"GCLOUD_PROJECT": "ggo-background",
		"MYSQL_USER": "root",
		"MYSQL_PASSWORD": "G@L1ge02018",
		"INSTANCE_CONNECTION_NAME": "ggo-background:europe-west1:ggobgpdvanalyzer",
		"DATABASE_NAME": "pdvanalyzerdb"
	};
	/*
	dbconfig = {
		"MYSQL_USER": process.env.SQL_USER,
		"MYSQL_PASSWORD": process.env.SQL_PASSWORD,
		"DATABASE_NAME": process.env.SQL_DATABASE,
	};
	*/
	console.log(`dbconfig: ${JSON.stringify(dbconfig)}`);
	const options = {
		user: dbconfig.MYSQL_USER,
		password: dbconfig.MYSQL_PASSWORD,
		database: dbconfig.DATABASE_NAME,
	};


	/*
	if (
	  config.get('INSTANCE_CONNECTION_NAME') &&
	  config.get('NODE_ENV') === 'production'
	) {
	  options.socketPath = `/cloudsql/${config.get('INSTANCE_CONNECTION_NAME')}`;
	}
	*/
	//options.socketPath = `/cloudsql/${config.get('INSTANCE_CONNECTION_NAME')}`;
	if ( process.env.NODE_ENV === 'production') {
		options.socketPath = `/cloudsql/${dbconfig['INSTANCE_CONNECTION_NAME']}`;
	}

	const connection = mysql.createConnection(options);

	return connection;
}

function getJobStatus(jobid, callback) {
	const extend = require('lodash').assign;
	const mysql = require('mysql');
	const config = require('../../config');

	const dbconfig = {
		"GCLOUD_PROJECT": "ggo-background",
		"MYSQL_USER": "root",
		"MYSQL_PASSWORD": "G@L1ge02018",
		"INSTANCE_CONNECTION_NAME": "ggo-background:europe-west1:ggobgpdvanalyzer",
		"DATABASE_NAME": "pdvanalyzerdb"
	};

	const options = {
	  user: dbconfig.MYSQL_USER,
	  password: dbconfig.MYSQL_PASSWORD,
	  database: dbconfig.DATABASE_NAME,
	};


	/*
	if (
	  config.get('INSTANCE_CONNECTION_NAME') &&
	  config.get('NODE_ENV') === 'production'
	) {
	  options.socketPath = `/cloudsql/${config.get('INSTANCE_CONNECTION_NAME')}`;
	}
	*/
	//options.socketPath = `/cloudsql/${config.get('INSTANCE_CONNECTION_NAME')}`;
	if ( process.env.NODE_ENV === 'production') {
		options.socketPath = `/cloudsql/${dbconfig['INSTANCE_CONNECTION_NAME']}`;
	}

	const connection = mysql.createConnection(options);
	//let selectJobStatus = 'SELECT * FROM `jobs` WHERE `messageid`= ?';

	connection.query(
		'SELECT * FROM `jobs` WHERE `messageid` = ?',
	    jobid,
	    (err, results) => {
	    	logging.info(`query res= ${JSON.stringify(results)}`);
			connection.end();
			if (err) {
				logging.error(`Failed to get status for job  ${jobid}. ${err}`);
				if (callback) {
					callback({error: err});
				}
				return {error: err};
			}
			if (callback) {
				callback(results[0]);
			}
			return results[0];
		}
	);
};

async function _jobstatus(jobid) {
	logging.info(`>> _jobstatus`);
	/*
	getJobStatus(jobid, (res) => {
		logging.info(`>> _jobstatus. getJobStatus callback`);
    	logging.info(`getJobStatus  res= ${JSON.stringify(res)}`);
		return res;
	});
	*/

	let res = await getJobStatus(jobid);
	logging.info(`getJobStatus res= ${JSON.stringify(res)}`);
	
	return res;
}

module.exports = {
	search: _search,
	findSireneSIRET : _findSireneSIRET,
	publish: _publish,
	jobstatus: _jobstatus,
	getConnection: getConnection
};
