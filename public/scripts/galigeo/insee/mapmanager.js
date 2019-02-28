(function() {
	'use strict';
	GGO.MapManager = function(options){
		this._options = options || {};
		this._options.mapboxAccessToken = this._options.mapboxAccessToken || 'pk.eyJ1IjoicnRhZ2dvIiwiYSI6ImNqcXFvN3k1cTA0enA0Mm81czZhYm5wM3oifQ.vG1w7oOdnpOJA7Mfs1uRnA';
		this._options.mapDivId = this._options.mapDivId || 'map';
		this._clickableLayers = [];
		mapboxgl.accessToken = this._options.mapboxAccessToken;
		this.init();
	};

	GGO.MapManager.prototype = {
		init:function(){
			this.setupListeners();
			this.setupMap();
		},
		setupListeners:function(){
			var self = this;
			/*
			GGO.EventBus.addEventListener('sirenedatapaneheightchanged', function(e) {
				var data = e.target;
				console.log('Panel size changed', data);
				self.changeMapSize(data.isExpanded);
			});
			*/
		},
		getMap: function() {
			return this._map;
		},
		setupMap: function() {
			var self = this;
			this._map = new mapboxgl.Map({
				container: 'map',
				style: 'mapbox://styles/mapbox/light-v9',
				attributionControl: false
			})
			.addControl(new mapboxgl.NavigationControl())
			.addControl(new mapboxgl.AttributionControl({ compact: true }));
			this._map.on('load', function(){
				self.setupMapEvent();
				GGO.EventBus.dispatch(GGO.EVENTS.MAPISLOADED);
				/*
				self._options.app.fetchFeatures({
					layername: 'regions'
				});
				*/
			});
			this._popup = new mapboxgl.Popup({
				closeButton: false,
				closeOnClick: false
			});
		}, 
		setupMapEvent: function() {
			var self = this;
			self._map.on('click', function(e) {
				self._popup.remove();					
				if (self._clickableLayers.length === 0) {
					return;
				}
				var features = self._map.queryRenderedFeatures(e.point, { layers: self._clickableLayers });
				if (!features.length) {
					if (!self._clickableLayers.includes('departements')) {
						self._clickableLayers.pop();
					}
					return;
				}
				var feature = features[0];

				var regGeoJSON = feature.toJSON();
				console.log(regGeoJSON);

				if (feature.layer.id === 'regions') {
					if (typeof self._map.getLayer('selectedRegion') !== 'undefined' ) {
						self._map.removeLayer('selectedRegion')
						self._map.removeSource('selectedRegion');
					}
					if (typeof self._map.getLayer('departements') !== 'undefined' ) {
						self._map.removeLayer('departements')
						self._map.removeSource('departements');
					}
					if (typeof self._map.getLayer('selectedDepartement') !== 'undefined' ) {
						self._map.removeLayer('selectedDepartement')
						self._map.removeSource('selectedDepartement');
					}
					if (typeof self._map.getLayer('carreaux') !== 'undefined' ) {
						self._map.removeLayer('carreaux')
						self._map.removeSource('carreaux');
					}
					if (self._clickableLayers.includes('departements')) {
						self._clickableLayers.pop();
					}
					
					/*
					self._map.addSource('selectedRegion', {
						'type':'geojson',
						'data': regGeoJSON
					});
					self._map.addLayer({
						'id': 'selectedRegion',
						'type': 'line',
						'source': 'selectedRegion',
						'layout': { },
						'paint': {
							"line-color": "#FF00FF",
							"line-width": 1.5,
						}
					});
					*/
					/*
					self._options.app.fetchFeatures({
						layername: 'regions', 
						codeinsee: regGeoJSON.properties.code_insee,
						sublayername : 'departements'
					});
					*/
				} else if (feature.layer.id === 'departements') {
					if (typeof self._map.getLayer('carreaux') !== 'undefined' ) {
						self._map.removeLayer('carreaux')
						self._map.removeSource('carreaux');
					}
					if (typeof self._map.getLayer('selectedDepartement') !== 'undefined' ) {
						self._map.removeLayer('selectedDepartement')
						self._map.removeSource('selectedDepartement');
					}

					self._map.addSource('selectedDepartement', {
						'type':'geojson',
						'data': regGeoJSON
					});
					self._map.addLayer({
						'id': 'selectedDepartement',
						'type': 'line',
						'source': 'selectedDepartement',
						'layout': { },
						'paint': {
							"line-color": "#FF00FF",
							"line-width": 2,
						}
					});
					self._options.app.fetchFeatures({
						layername: 'departements', 
						codeinsee: regGeoJSON.properties.code_insee,
						sublayername : 'carreaux'
					});
				}					
			});
			/*
			self._map.on('mousemove', function(e) {
				var features = self._map.queryRenderedFeatures(e.point, { layers:  self._clickableLayers });
				if (!features.length) {
					self._popup.remove();
					return;
				}
				var feature = features[0];
				var popupContent = '<span  class="feature-name">' + feature.properties.name + '</span><br/>Surface: ' + feature.properties.surface.toFixed(0) + ' km2';
	            self._popup.setLngLat(turf.centerOfMass(feature.toJSON()).geometry.coordinates)
					.setHTML(popupContent)
					.addTo(self._map);

					//map.getCanvas().style.cursor = features.length ? 'pointer' : '';
			});
			*/
		},
		setFeatures: function(response){
			let self = this;
			if (response.layername === 'regions') {
				if (!self._clickableLayers.includes('departements')) {
					self._clickableLayers.push('regions');
				}
				let bbox = turf.bbox(response.geojson);
				/*
				let minSurf = Infinity;
				let maxSurf = -Infinity;
				for (const [index, val] of response.geojson.features.entries()) {
					minSurf = Math.min(minSurf, val.properties.surface);
					maxSurf = Math.max(maxSurf, val.properties.surface);
				}
				const stops =  [[minSurf, '#fff'], [maxSurf, '#f00']];
				*/
				self._map.addLayer({
					'id': 'regions',
					'type': 'fill',
					'source': {
						'type': 'geojson',
						'data': response.geojson
					},
					'layout': {},
					'paint': {
						/*
						'fill-color': {
							property: 'surface',
							stops: stops
						},
						'fill-opacity': 0.1,
						'fill-outline-color' : '#FF00FF'
						*/
						'fill-opacity': 0.1,
						'fill-color': '#FFFFFF',
						'fill-outline-color' : '#FF00FF'
						
					}
				});
				self._map.fitBounds(bbox, {padding: 20});
			} else if (response.layername === 'departements') {
				let bbox = turf.bbox(response.geojson);
				let minSurfD = Infinity;
				let maxSurfD = -Infinity;
				for (const [index, val] of response.geojson.features.entries()) {
					minSurfD = Math.min(minSurfD, val.properties.surface);
					maxSurfD = Math.max(maxSurfD, val.properties.surface);
				}
				const stopsD =  [[minSurfD, '#f7fcb9'], [maxSurfD, '#31a354']];
				self._map.addLayer({
					'id': 'departements',
					'type': 'fill',
					'source': {
						'type': 'geojson',
						'data': response.geojson
					},
					'layout': {},
					'paint': {
						'fill-color': {
							property: 'surface',
							stops: stopsD
						},
						'fill-opacity': 0.5,
						'fill-outline-color' : '#FFFFFF'
					}
				});
				self._map.fitBounds(bbox, {padding: 20});
				if (!self._clickableLayers.includes('departements')) {
					self._clickableLayers.push('departements');
				}
			} else if (response.layername === 'carreaux') {
				var bboxCarreaux = turf.bbox(response.geojson);
				self._map.addLayer({
					'id': 'carreaux',
					'type': 'fill',
					'source': {
						'type': 'geojson',
						'data': response.geojson
					},
					'layout': {},
					'paint': {
						'fill-color': '#0000FF',
						'fill-opacity': 0.7,
						'fill-outline-color' : '#0000FF'
					}
				});
				self._map.fitBounds(bboxCarreaux, {padding: 20});
			}
		}
	};
})();