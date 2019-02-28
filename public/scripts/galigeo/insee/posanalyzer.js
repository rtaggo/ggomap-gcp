(function() {
	'use strict';
	GGO.PoSAnalyzer = function(options){
		this._options = options || {};
		this.init();
	};

	GGO.PoSAnalyzer.prototype = {
		init:function(){
			this.setupListeners();
		},
		setupListeners:function(){
			var self = this;
			GGO.EventBus.addEventListener(GGO.EVENTS.MAPISLOADED, function(e) {
				console.log(`PoS Analyzer received ${GGO.EVENTS.MAPISLOADED} event`);
				/*
				self.fetchFeatures({
					layername : 'regions'
				});
				*/
			});
		},
		displayNotifyer: function(layername) {
			let ctnr = $('#notifierContainer').empty();
			ctnr
				.append($('<div class="slds-notify slds-notify_toast slds-theme_info" role="status"></div>')
					.append($('<div class="slds-notify__content"></div>')
						.append($('<h2 class="slds-text-heading_small">Chargement de la couche ' + layername + ' ... </h2>')))
					.append($('<div class="slds-notify__close"></div>')
						.append($('<div role="status" class="slds-spinner slds-spinner_small slds-spinner_inline" style="top: 12px;"></div>')
							.append($('<span class="slds-assistive-text">Loading</span>'))
							.append($('<div class="slds-spinner__dot-a"></div>'))
							.append($('<div class="slds-spinner__dot-b"></div>'))
						)
					)
				);
			ctnr.removeClass('slds-hide');
		},
		fetchFeatures: function(params) {
			let self = this;
			self.displayNotifyer(params.sublayername || params.layername);
			let url = `/insee/layer/${params.layername}`;
			if (params.codeinsee && params.sublayername) {
				url += `/${params.codeinsee}/${params.sublayername}`;
			}
			$.ajax({
				type: 'GET',
				url: url,
				success: function(data) {
					var response = {
						layername : (params.sublayername || params.layername),
						geojson: data
					};
					self._options.app.setFeatures(response);
					/*
					var bbox = turf.bbox(data);
					var minSurf = Infinity;
					var maxSurf = -Infinity;
					for (const [index, val] of data.features.entries()) {
						minSurf = Math.min(minSurf, val.properties.surface);
						maxSurf = Math.max(maxSurf, val.properties.surface);
					}
					const stops =  [[minSurf, '#fff'], [maxSurf, '#f00']];
					map.addLayer({
						'id': 'regions',
						'type': 'fill',
						'source': {
							'type': 'geojson',
							'data': data
						},
						'layout': {},
						'paint': {
							'fill-color': {
								property: 'surface',
								stops: stops
							},
							'fill-opacity': 0.1,
							'fill-outline-color' : '#FF00FF'
						}
					});						
					*/
				},
				error:  function(jqXHR, textStatus, errorThrown) { 
					if (textStatus === 'abort') {
						console.warn('Regions request aborted');
					} else {
						console.error('Error for Regions request: ' + textStatus, errorThrown);
					}
				}
			});	
		}
	};
})();