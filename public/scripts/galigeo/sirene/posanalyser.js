(function() {
	'use strict';
	GGO.POSAnalyzer = function(options){
		this._options = options || {};
		this._options.posanalyzerurl = '/sirene/posanalyzer';
		this._jobRunning = false;
		this.analysis = {
			sirene_layer: L.mapbox.featureLayer(),
			google_layer: L.mapbox.featureLayer(),
			line_layer: L.mapbox.featureLayer(),
		};
		this.init();
	};

	GGO.POSAnalyzer.prototype = {
		init:function() {
			this.setupListeners();
			this.fetchAnalyis();
		}, 
		setupListeners: function() {
			var self = this;
			GGO.EventBus.addEventListener(GGO.EVENTS.DOPOSANALYZER, function(e) {
				var data = e.target;
				console.log('Sirene Explorer recevied GGO.EVENTS.DOPOSANALYZER event', data);
				$('#sirene-analysis__item').trigger('click');
				self._doAnalyzing(data.sirets);
			});
		},
		fetchAnalyis: function() {
			var self = this;
			var sUrl = self._options.posanalyzerurl;
			$.ajax({
				type: 'GET',
				url: sUrl,
				success: function(data) {
					self._handleFetchAnalysis(data);
				},
				error:  function(jqXHR, textStatus, errorThrown) { 
					if (textStatus === 'abort') {
						console.warn('POS Job Analysis list request aborted');
					} else {
						console.error('Error for POS Job Analysis list request: ' + textStatus, errorThrown);
					}
				}
			});
		}, 
		_handleFetchAnalysis: function(data) {
			console.log('>> _handleFetchAnalysis', data);
			this._jobs = data;
			this.renderJobs();
		},
		renderJobs : function() {
			var self = this;
			var ctnr = $('#jobs-list-panel').empty();
			
			$.each(self._jobs, function(idxJ, valJ){
				var jCard = $('<article class="slds-card" style="border: 1px solid #dddbda; border-radius: 0.25rem; background-clip: padding-box; -webkit-box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.1); box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.1);margin-top: 0;"></article>');
				var jCardHeader = $('<div class="slds-card__header slds-grid" style="padding: 0.25rem 0.25rem 0; margin: 0;"></div>');
				
				var viewBtn = $('<button class="slds-button slds-button_icon slds-button_icon-border-filled" title="Voir l\'analyse" aria-pressed="false"></button')
					.append($('<svg class="slds-button__icon" aria-hidden="true"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="/styles/slds/assets/icons/utility-sprite/svg/symbols.svg#chart" /></svg>'))
					.append($('<span class="slds-assistive-text">Charts</span>'))
				viewBtn.click(function(e){
					//alert('TODO: view analysis for Job ' + this.messageid);
					self.fetchAnalysisResults(this.messageid);
				}.bind(valJ));
				var delBtn = $('<button class="slds-button slds-button_icon slds-button_icon-border-filled" title="Supprimer l\'analyse" aria-pressed="false"></button')
					.append($('<svg class="slds-button__icon" aria-hidden="true"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="/styles/slds/assets/icons/utility-sprite/svg/symbols.svg#delete" /></svg>'))
					.append($('<span class="slds-assistive-text">Charts</span>'))	
				delBtn.click(function(e){
					//alert('TODO: delete analysis for Job ' + this.messageid);
					self._deleteJob(this.messageid);
				}.bind(valJ));
				var jCardBtnGrp = $('<div class="slds-no-flex"></div>')
					.append($('<ul class="slds-button-group-list"></ul>')
						.append($('<li></li>').append(viewBtn))
						.append($('<li></li>').append(delBtn)));

				jCardHeader
					.append($('<div class="slds-media__body"></div>')
						.append($('<div class="slds-text-heading_small" style="font-size: .9rem; line-height: 2;"></div>').text('Analyse ' + valJ.messageid)))
					.append(jCardBtnGrp);
				
				var jCardBody = $('<div class="slds-card__body slds-card__body_inner" style="margin-bottom: 0.25rem; padding: 0 0.25rem;"></div>')
					.append($('<div></div>').text('Mot clé : ' + valJ.searchText))
					.append($('<div></div>').text('Créé le ' + moment(valJ.created_date).format('DD/MM/YYYY HH:mm')))
					.append($('<div></div>').text('Calculé en ' + moment.duration(valJ.exectime).format("h [hrs], m [min] s [sec]")));

				jCard.append(jCardHeader).append(jCardBody).append($('<footer class="slds-card__footer"></footer>'));
				ctnr.append(jCard);
			});
		},
		_doAnalyzing: function(sirets) {
			var self = this;
			self._sirets = sirets;
			var sUrl = self._options.posanalyzerurl + '/run?sirets='+sirets+'&searchTerm=' + self._options.app.getSearchText();
			$.ajax({
				type: 'GET',
				url: sUrl,
				success: function(data) {
					console.log('POS Analyzer Run Response : ', data);
					self._handleStartJob(data);
				},
				error:  function(jqXHR, textStatus, errorThrown) { 
					if (textStatus === 'abort') {
						console.warn('POS Analyzer Run request aborted');
					} else {
						console.error('Error for POS Analyzer Run request: ' + textStatus, errorThrown);
					}
				}
			});
		},
		_handleStartJob: function(data){
			var self = this;
			if (data.jobId) {
				self._jobRunning = true;
				self._jobId = data.jobId;
				self.renderCurrentJobRunning();
				self.checkForJobDone();
			}
		},
		renderCurrentJobRunning: function() {
			var ctnr = $('#jobs-list-panel');
			var jCard = $('<article class="slds-card" style="border: 1px solid #dddbda; border-radius: 0.25rem; background-clip: padding-box; -webkit-box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.1); box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.1);"></article>');
			var jCardHeader = $('<div class="slds-card__header slds-grid" style="padding: 0.25rem; margin: 0 0 0 0.25rem;"></div>');
			
			jCardHeader
				.append($('<div class="slds-media__body"></div>')
					.append($('<div class="slds-text-heading_small" style="font-size: .9rem; line-height: 2;"></div>').text('Analyse ' + this._jobId)))
				.append($('<div class="slds-no-flex"></div>')
					.append($('<div role="status" class="slds-spinner slds-spinner_small slds-spinner_inline" style="top:1rem; right: .5rem;"></div>')
					.append($('<span class="slds-assistive-text">Loading</span>'))
					.append($('<div class="slds-spinner__dot-a"></div>'))
					.append($('<div class="slds-spinner__dot-b"></div>'))));
			
			var jCardBody = $('<div class="slds-card__body slds-card__body_inner" style="margin-bottom: 0.25rem; padding: 0 0.25rem;"></div>');

			jCard.append(jCardHeader).append(jCardBody);
			ctnr.append(jCard);
		}, 
		checkForJobDone: function() {
			var self = this;
			var sUrl = self._options.posanalyzerurl + '/job/'+self._jobId+'/status';
			setTimeout(function(){ 
				$.ajax({
					type: 'GET',
					url: sUrl,
					success: function(data) {
						console.log('JOB Status Response : ', data);
						if (data.status === 'done') {
							console.log('Job is completed. TODO: fetch analysis results');
							self._jobRunning = false;
							//self.fetchAnalysisResults();
							self.fetchAnalyis();
						} else {
							self.checkForJobDone();
						}
					},
					error:  function(jqXHR, textStatus, errorThrown) { 
						if (textStatus === 'abort') {
							console.warn('Job Status request aborted');
						} else {
							console.error('Error for Job Status request: ' + textStatus, errorThrown);
						}
					}
				});

			}, 500);
		},
		fetchAnalysisResults: function(jobId){
			var self = this;
			var sUrl = self._options.posanalyzerurl + '/job/'+jobId+'/results';
			$.ajax({
				type: 'GET',
				url: sUrl,
				success: function(data) {
					console.log('JOB Results Response : ', data);
					self.handleAnalysisResults(data);
				},
				error:  function(jqXHR, textStatus, errorThrown) { 
					if (textStatus === 'abort') {
						console.warn('Fetching job analysis result aborted');
					} else {
						console.error('Error for Fetching job analysis result request: ' + textStatus, errorThrown);
					}
				}
			});
		},
		handleAnalysisResults: function(response){
			this.buildCharts(response);
			this.buildDataTable(response);
			this.buildLayers(response);
			$('#recordsDocker-heading-01').text('Analyse');
			$('#recordsContent').addClass('slds-hide');
			$('#jobAnalysisContent').removeClass('slds-hide');
			$('#data-composer').removeClass('slds-hide');
			var data2Send = {
				isExpanded: true
			};
			GGO.EventBus.dispatch('sirenedatapaneheightchanged', data2Send);
		},
		buildLayers: function(data) {
			var self = this;
			self.analysis.line_layer.clearLayers();
			var sireneGeojson = {
				"type": "FeatureCollection",
				"features": []
			};
			var googleGeojson = {
				"type": "FeatureCollection",
				"features": []
			};
			$.each(data, function(idx, val){
				var sirene_props = {
					'siret' : val.siret,
					'distance' : val.distance,
					'marker-size' : 'small',
					'marker-symbol' : 's',
					'marker-color' : '#FF00FF'
				};
				var aFeature = { 
					"type" : "Feature",					
					"geometry" : {
						"type" : "Point",
						"coordinates" : [val.s_lng, val.s_lat]
					},
					"properties" : sirene_props
				};
				sireneGeojson.features.push(aFeature);
				if (val.g_lat !== null) {
					var google_props = $.extend({}, sirene_props);
					google_props['marker-symbol'] = 'g';
					google_props['marker-color'] = '#00FF00';
					var aFeature = { 
						"type" : "Feature",
						"geometry" : {
							"type" : "Point",
							"coordinates" : [val.g_lng, val.g_lat]
						},
						"properties" : google_props
					};
					googleGeojson.features.push(aFeature);
				}
			});
			var theMap = this._options.app.getMap();

			self.analysis.google_layer.setGeoJSON(googleGeojson);
			self.analysis.google_layer.eachLayer(function(lyr) {
				lyr.on('click', function(e){
					self.buildLine(e.target, false);
				});
			});

			self.analysis.sirene_layer.setGeoJSON(sireneGeojson);
			self.analysis.sirene_layer.eachLayer(function(lyr) {
				lyr.on('click', function(e){
					self.buildLine(e.target, true);
				});
			});

			if (!theMap.hasLayer(self.analysis.google_layer)) {
				theMap.addLayer(self.analysis.google_layer);
			}
			if (!theMap.hasLayer(self.analysis.sirene_layer)) {
				theMap.addLayer(self.analysis.sirene_layer);
			}

			theMap.fitBounds(self.analysis.sirene_layer.getBounds());
		},
		buildLine: function(lyr, isSirene) {
			this.analysis.line_layer.clearLayers();
			
			var lyrToSearch = (isSirene)?this.analysis.google_layer: this.analysis.sirene_layer;
			var siret = lyr.feature.properties.siret;
			var linkLyr = null;
			lyrToSearch.eachLayer(function(l) {
				if (l.feature.properties.siret === siret) {
					linkLyr = l;
					return false;
				}
			});
			if (linkLyr !== null) {
				var lineGeojSON = {
					"type": "FeatureCollection",
					"features": [{
						"type": "Feature",
						"properties": {
							"stroke": "#0000FF",
							"stroke-width": 2,
							"stroke-opacity": 1
						},
						"geometry": {
							"type": "LineString",
							"coordinates": [
								lyr.feature.geometry.coordinates,
								linkLyr.feature.geometry.coordinates									
							]
						}						
					}]
				};
				this.analysis.line_layer.setGeoJSON(lineGeojSON);
				var theMap = this._options.app.getMap();
				if (!theMap.hasLayer(this.analysis.line_layer)) {
					theMap.addLayer(this.analysis.line_layer);
				}
				theMap.fitBounds(this.analysis.line_layer.getBounds());
			}
		},
		buildDataTable : function(data) {
			var self = this;
			var ctnr = $('#jobAnalysis-list').empty();

			var tbl = $('<table class="slds-table slds-table--bordered slds-table--cell-buffer slds-table--striped slds-table--fixed-layout slds-table_col-bordered slds-scrollable--y" role="grid"></table>')
				.append($('<thead></thead>')
					.append($('<tr class="slds-line-height_reset"></tr>')
						.append($('<th class="slds-text-title_caps" scope="col" style="width:160px;">SIRET</th>'))
						.append($('<th class="slds-text-title_caps" scope="col" >NOM</th>'))
						.append($('<th class="slds-text-title_caps" scope="col" >ADRESSE (SIRENE)</th>'))
						.append($('<th class="slds-text-title_caps" scope="col" >ADRESSE (GOOGLE)</th>'))
						.append($('<th class="slds-text-title_caps" scope="col" style="width:80px;">Dist.</th>'))
						.append($('<th class="slds-text-title_caps" scope="col" style="width:60px;">Réf.</th>'))));
			var tblBody = $('<tbody></tbody>');

			var okIconPath = '/styles/slds/assets/icons/utility-sprite/svg/symbols.svg#check';
			var koIconPath = '/styles/slds/assets/icons/utility-sprite/svg/symbols.svg#clear';
			var gmapUrl = 'https://www.google.com/maps/search/';
			$.each(data, function(idx, val){
				var referenced = $('<span class="slds-icon_container" title="Description of icon when needed"></span>')
					.append($('<svg class="slds-icon slds-icon-text-default slds-icon_x-small" aria-hidden="true" style="fill: ' + ((val.distance!==null)?'green':'red') +'"><use xlink:href="'+((val.distance!==null)?okIconPath:koIconPath)+'"></use>'));
				
				var saddrLink = $('<a href="' + gmapUrl+ val.s_addr.replace(/ /g,'+') +'" target="_blank">'+val.s_addr+'</a>');
				var aRow = $('<tr></tr>')
					.append($('<td></td>').append($('<div class="slds-truncate" title="SIRET">').text(val.siret)))
					.append($('<td></td>').append($('<div class="slds-truncate" title="Nom">').text(val.name)))
					.append($('<td></td>').append($('<div class="slds-truncate" title="'+val.s_addr+'">').append(saddrLink)))
					.append($('<td></td>').append($('<div class="slds-truncate" title="Adresse GOOGLE">').text(val.g_addr)))
					.append($('<td></td>').append($('<div class="slds-truncate" title="Distance" style="text-align:right;">').text((val.distance !== null)?(val.distance*1000).toFixed(0) + ' m' : '')))
					.append($('<td></td>').append($('<div class="slds-truncate" title="Ref">').append(referenced)));
				aRow.click(function(e){
					var sireneM = null;
					var clickedVal = this;
					self.analysis.sirene_layer.eachLayer(function(l) {
						if (l.feature.properties.siret === clickedVal.siret) {
							sireneM = l;
							return false;
						}
					});
					if (sireneM !== null) {
						var theMap = self._options.app.getMap();
						theMap.setView(sireneM.getLatLng(), 19);
						self.buildLine(sireneM,true);
					}
				}.bind(val));
				tblBody.append(aRow);
			});

			ctnr.append(tbl.append(tblBody));
		}, 
		buildCharts: function(data) {
			var self = this;
			var gFound = data.filter(function(e,i) {
				return e.g_lat !== null;
			});
			var gNotFound = data.filter(function(e,i) {
				return e.g_lat === null;
			});
			
			var nbAnalyzed = data.length;
			var percentFound = (gFound.length * 100) / nbAnalyzed;
			//alert(percent.toFixed(2) + '% found on Google');
			var percentDataSet = [
				{ name:'Référencés', percent: percentFound},
				{ name:'Non-Référencés', percent: 100-percentFound}
			];
			var chartsCtnr=$('#jobAnalysis-chart').empty();

			var color = d3.scaleOrdinal(["#1a9850","#d73027"]);
			
			const width = 240;
		    const height = 240;
		    const radius = Math.min(width, height) / 2;
    		
    		const pie = d3.pie()
			    .sort(null)
			    .value(d => d.percent);
    		const arcs = pie(percentDataSet);

    		const arc = d3.arc()
			    .innerRadius(radius/2)
			    .outerRadius(radius)

    		const svg = d3.select("#jobAnalysis-chart")
		        .append("svg")
		            .attr("width", width)
		            .attr("height", height)
		    const g = svg.append("g")
		      .attr("transform", `translate(${width / 2},${height / 2})`);
					g.selectAll("path")
					    .data(arcs)
					    .enter().append("path")
					      .attr("fill", d => color(d.data.name))
					      .attr("stroke", "white")
					      .attr("d", arc)
					    .append("title")
					      .text(d => `${d.data.name}: ${d.data.percent.toFixed(2)} %`);
			g.append("text")
			   .attr("text-anchor", "middle")
				 .attr('font-size', '2em')
				 .attr('y', 5)
			   .text(nbAnalyzed);
		},
		_deleteJob:function(jobId){
			var self = this;
			var sUrl = self._options.posanalyzerurl + '/job/'+jobId+'/delete';
			$.ajax({
				type: 'GET',
				url: sUrl,
				success: function(data) {
					console.log('JOB delete Results Response : ', data);
					self.fetchAnalyis();
				},
				error:  function(jqXHR, textStatus, errorThrown) { 
					if (textStatus === 'abort') {
						console.warn('Job delete request request aborted');
					} else {
						console.error('Error for Job delete request: ' + textStatus, errorThrown);
					}
				}
			});
		}
	};
})();