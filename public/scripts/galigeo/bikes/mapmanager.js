(function() {
	'use strict';
	GGO.MapManager = function(options){
		this._options = options || {};
		this._options.mapboxAccessToken = this._options.mapboxAccessToken || 'pk.eyJ1IjoicnRhZ2dvIiwiYSI6Ijg5YWI5YzlkYzJiYzg2Mjg2YWQyMTQyZjRkZWFiMWM5In0._yZGbo26CQle1_JfHPxWzg';
		this._options.mapDivId = this._options.mapDivId || 'map';
		L.mapbox.accessToken = this._options.mapboxAccessToken;
		this.relatedTrips = {
			outgoing: {
				layer: L.mapbox.featureLayer(),
				curveLayer: L.mapbox.featureLayer(),
				convexeLayer : L.mapbox.featureLayer()
			},
			incoming: {
				curveLayer: L.mapbox.featureLayer(),
				convexeLayer : L.mapbox.featureLayer()
			}
		};
		this._cHullOptions = {units: 'miles', maxEdge: Infinity};
		this.outgoingStations = { };
		this.cat_colors = ['#d7191c', '#fdae61', '#ffffbf', '#abdda4', '#2b83ba'];
		this._colors = {
			outgoing : ['#f1eef6', '#d7b5d8', '#df65b0', '#dd1c77', '#980043'],
			incoming : ['#ffffcc', '#a1dab4', '#41b6c4', '#2c7fb8','#253494']
		}
		this.setupMap();
	};

	GGO.MapManager.prototype = {
		setupMap: function() {
			var self = this;
			var streets = L.tileLayer('//server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
				attribution: "© Galigeo | ESRI",
				minZoom: 1,
    			maxZoom: 19,    
			}),
			grey    = L.tileLayer('//services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
				attribution: "© Galigeo | ESRI",
				minZoom: 1,
    			maxZoom: 15,    
			}),
			black   = L.tileLayer('//services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
				attribution: "© Galigeo | ESRI",
				minZoom: 1,
    			maxZoom: 15,    
			});
			var mapDivId = this._options.mapDivId || 'map';
			this._map = L.map(mapDivId, {
				preferCanvas: true,
				zoomControl: false,
				contextmenu: true,
				contextmenuWidth: 140,						
				layers: [black]
			}).setView([0, 0], 2);

			var overlayMaps = {
				"Flows": {
					"Outgoing Trips": this.relatedTrips.outgoing.curveLayer,
					"Incoming Trips": this.relatedTrips.incoming.curveLayer,
				},
				"Convexe Hulls": {
					"Outgoing Trips area": this.relatedTrips.outgoing.convexeLayer,
					"Incoming Trips area": this.relatedTrips.incoming.convexeLayer,
				}
			};
			L.control.groupedLayers({}, overlayMaps).addTo(this._map);
			new L.control.zoom({
				position:'topright'
			}).addTo(this._map);

			this.relatedTrips.outgoing.curveLayer
				.on('add', function(l){
					if (typeof(self.relatedTrips.outgoing.legendCtrl) !== 'undefined') {
						self.relatedTrips.outgoing.legendCtrl.addTo(self._map);
					}
				})
				.on('remove', function(l){
					if (typeof(self.relatedTrips.outgoing.legendCtrl) !== 'undefined') {
						self._map.removeControl(self.relatedTrips.outgoing.legendCtrl);
					}
				});
			this.relatedTrips.incoming.curveLayer
				.on('add', function(l){
					if (typeof(self.relatedTrips.incoming.legendCtrl) !== 'undefined') {
						self.relatedTrips.incoming.legendCtrl.addTo(self._map);
					}
				})
				.on('remove', function(l){
					if (typeof(self.relatedTrips.incoming.legendCtrl) !== 'undefined') {
						self._map.removeControl(self.relatedTrips.incoming.legendCtrl);
					}
				});
		},
		setBikeStation: function(data){
			var self = this;
			self.bikeStations = {
				layer: L.mapbox.featureLayer().addTo(self._map),
				data: data
			};
			$.each(self.bikeStations.data.features, function(idx, val){
				var ll = L.latLng(val.geometry.coordinates[1], val.geometry.coordinates[0]);
				var markerOptions = {
					radius: 5,
					color: "#DEDEDE",
					weight: 1,					
				};
				var c = L.circleMarker(ll, markerOptions);
				c.id=val.properties.id;
				c.name=val.properties.name;
				
				c.on('click', function(e) {
					console.log('clicked on marker',e);
					var cGeoJSON = e.target.toGeoJSON();
					cGeoJSON.properties = {
						id: this.id,
						name : this.name
					};
					self.handleClickOnBikeStation(cGeoJSON);
				}.bind(c));
				c.addTo(self.bikeStations.layer);
			});
			self._map.fitBounds(self.bikeStations.layer.getBounds());
		},
		handleClickOnBikeStation: function(station){
			var self = this;
			self._clearLayers();
			station.properties["marker-color"] = "#FF00FF";
			self.relatedTrips.outgoing.start_station = station;
			self._options.app.fetchStationOutgoing(station.properties.id);	
			self._options.app.fetchStationIncoming(station.properties.id);	
		},
		setOutGoingData: function(outgoingData){
			var self = this;
			self.relatedTrips.outgoing.start_station_layer = L.mapbox.featureLayer();
			var ll = L.latLng(self.relatedTrips.outgoing.start_station.geometry.coordinates[1], 
							self.relatedTrips.outgoing.start_station.geometry.coordinates[0]);
			var markerOptions = {
				radius: 5,
				color: "#FF00FF",
				weight: 1,					
			};
			var cm = L.circleMarker(ll, markerOptions);
			self.relatedTrips.outgoing.start_station_layer.addLayer(cm);
			//self.outgoingStations.start_station_layer.setGeoJSON(self.outgoingStations.start_station);

			var cHull = turf.concave(outgoingData, this._cHullOptions);
			//var cHull = turf.convex(outgoingData, {concavity: Infinity});
			var cHullColor = self._colors.outgoing[self._colors.outgoing.length-1];
			cHull.properties = {
				"stroke": cHullColor,
				"stroke-width": 2,
				"stroke-opacity": 0.5,
				"fill": cHullColor,
				"fill-opacity": 0.3
			};
			this.relatedTrips.outgoing.convexeLayer.setGeoJSON(cHull);

			self.relatedTrips.outgoing.outgoingData = outgoingData;
			var colorClassifier = self.getDataClassifier(self.relatedTrips.outgoing.outgoingData.features, self._colors.outgoing, 'nb_outgoing');
			self.relatedTrips.outgoing.end_stations_layer = L.mapbox.featureLayer();

			$.each(outgoingData.features, function(idx, val){
				var ll = L.latLng(val.geometry.coordinates[1], val.geometry.coordinates[0]);
				var markerOptions = {
					radius: 5,
					color: colorClassifier(val.properties.nb_outgoing),
					weight: 1,					
				};
				var c = L.circleMarker(ll, markerOptions);
				c.id=val.properties.id;
				c.name=val.properties.name;
				c.addTo(self.relatedTrips.outgoing.end_stations_layer);
			});
			self.relatedTrips.outgoing.layer = L.featureGroup();
			self.relatedTrips.outgoing.layer.addLayer(self.relatedTrips.outgoing.start_station_layer);
			self.relatedTrips.outgoing.layer.addLayer(self.relatedTrips.outgoing.end_stations_layer);
			self.computeCurveLines(colorClassifier, self.relatedTrips.outgoing.outgoingData.features, true, 'nb_outgoing', self.relatedTrips.outgoing.curveLayer);
			self.relatedTrips.outgoing.layer.addTo(self._map);
			self.relatedTrips.outgoing.curveLayer.addTo(self._map);
			self._map.fitBounds(self.relatedTrips.outgoing.layer.getBounds());
			if (typeof(self.relatedTrips.outgoing.legendCtrl) === 'undefined') {
				self.relatedTrips.outgoing.legendCtrl = self.getLegend(colorClassifier, 'Outgoing Trips');
				self.relatedTrips.outgoing.legendCtrl.addTo(self._map);
			} else {
				self.relatedTrips.outgoing.legendCtrl.update(colorClassifier, 'Outgoing Trips');
			}

		},
		setIncomingData: function(incomingData) {
			var self = this;
			var cHull = turf.concave(incomingData, this._cHullOptions);
			var cHullColor = self._colors.incoming[self._colors.incoming.length-1];
			cHull.properties = {
				"stroke": cHullColor,
				"stroke-width": 2,
				"stroke-opacity": 0.5,
				"fill": cHullColor,
				"fill-opacity": 0.3
			};
			this.relatedTrips.incoming.convexeLayer.setGeoJSON(cHull);

			self.relatedTrips.incoming.incomingData = incomingData;
			var colorClassifier = self.getDataClassifier(self.relatedTrips.incoming.incomingData.features, self._colors.incoming, 'nb_incoming');
			self.computeCurveLines(colorClassifier,self.relatedTrips.incoming.incomingData.features, false, 'nb_incoming', self.relatedTrips.incoming.curveLayer);
			self.relatedTrips.incoming.curveLayer.addTo(self._map);
			if (typeof(self.relatedTrips.incoming.legendCtrl) === 'undefined') {
				self.relatedTrips.incoming.legendCtrl = self.getLegend(colorClassifier, 'Incoming Trips');
				self.relatedTrips.incoming.legendCtrl.addTo(self._map);
			} else {
				self.relatedTrips.incoming.legendCtrl.update(colorClassifier, 'Incoming Trips');
			}

		},
		buildLegendContent:function(classifier, title) {
			var rangeColors = classifier.range(),
				outlabels = [],
				outspans = [],
				from, to, 
				invertExt;

			for (var i = 0; i < rangeColors.length; i++) {
				invertExt = classifier.invertExtent(rangeColors[i])
				from = invertExt[0];
				to = invertExt[1];

				outspans.push('<span style=\'background:'+rangeColors[i]+';\'></span>');
				outlabels.push('<label>' + to + '</label>');
			}
				
			var outgoingLgd = '<div class="map-legend wax-legend">';
			outgoingLgd += '<strong>'+title+'</strong>';
			outgoingLgd += '<nav class=\'legend clearfix\'>'+outspans.join('')+outlabels.join('')+'</nav>';
			outgoingLgd += '</div>';

			var lgds = outgoingLgd;

			return lgds;
		},
		setLegend: function(classifier, title) {
			var self = this;
			if (typeof(self.legendCtrl) === 'undefined') {
				self.legendCtrl = L.control({position: 'bottomright'});

				self.legendCtrl.onAdd = function (map) {
					this._div = L.DomUtil.create('div', 'map-legends wax-legends');

					this._div.innerHTML = self.buildLegendContent(classifier, title);
					return this._div;
				};
				self.legendCtrl.update = function (_classifier, _title) {
					this._div.innerHTML = self.buildLegendContent(_classifier, _title);
				};

				self.legendCtrl.addTo(this._map);
			} else {
				self.legendCtrl.update(classifier, title);
			}
		},
		getLegend: function(classifier, title) {
			var self = this;
			var legendCtrl = L.control({position: 'bottomright'});

			legendCtrl.onAdd = function (map) {
				this._div = L.DomUtil.create('div', 'map-legends wax-legends');

				this._div.innerHTML = self.buildLegendContent(classifier, title);
				return this._div;
			};
			legendCtrl.update = function (_classifier, _title) {
				this._div.innerHTML = self.buildLegendContent(_classifier, _title);
			};
			return legendCtrl;
		},
		
		computeCurveLines: function(classifier,data, isout, prop, outputLayer) {
			var self = this;
			var startStation = self.relatedTrips.outgoing.start_station;
			var geojson = {
				type: 'FeatureCollection', 
				features: []
			};
			var curveOptions = {
				resolution : 10000,
				sharpness: .90
			}
			$.each(data, function(idx, val){
				var latlngs = [];

				var latlng1 = [startStation.geometry.coordinates[1], startStation.geometry.coordinates[0]];			
				var latlng2 = [val.geometry.coordinates[1], val.geometry.coordinates[0]];
				
				latlng1 = isout?startStation.geometry.coordinates:val.geometry.coordinates;
				latlng2 = isout?val.geometry.coordinates:startStation.geometry.coordinates;
				var offsetX = latlng2[1] - latlng1[1],
					offsetY = latlng2[0] - latlng1[0];

				var r = Math.sqrt( Math.pow(offsetX, 2) + Math.pow(offsetY, 2) ),
					theta = Math.atan2(offsetY, offsetX);

				var thetaOffset = (3.14/30);

				var r2 = (r/2)/(Math.cos(thetaOffset)),
					theta2 = theta + thetaOffset;

				var midpointX = (r2 * Math.cos(theta2)) + latlng1[1],
					midpointY = (r2 * Math.sin(theta2)) + latlng1[0];

				var midpointLatLng = [midpointY, midpointX];

				var line = turf.lineString([
					latlng1,
					midpointLatLng,
					latlng2
				]);

				var curved = turf.bezierSpline(line, curveOptions);
				curved.properties = {
					"stroke": classifier(val.properties[prop]),
					"stroke-width": 2,
					"stroke-opacity": 0.6
				}
				geojson.features.push(curved);

			});
			if (typeof(outputLayer) === 'undefined') {
				var curveLayer = L.mapbox.featureLayer();
				curveLayer.setGeoJSON(geojson);
				curveLayer.addTo(self.outgoingStations.layer);
			} else {
				outputLayer.setGeoJSON(geojson);
			}
		},
		getDataClassifier:function(data, colorsRange, property){
			var self = this;
			var quantizeScale = d3.scaleQuantize()
				.domain([0, d3.max(data, function(d) { 
					return d.properties[property];
				})])
				.range(colorsRange);
			return quantizeScale;
		},
		_clearLayers: function(){
			var self = this;
			if ((typeof(self.relatedTrips.outgoing.start_station_layer) !== 'undefined') && self._map.hasLayer(self.relatedTrips.outgoing.start_station_layer)) {
				self._map.removeLayer(self.relatedTrips.outgoing.start_station_layer);
			}
			if (typeof(self.relatedTrips.outgoing.layer)!=='undefined' &&  self._map.hasLayer(self.relatedTrips.outgoing.layer)){
				self._map.removeLayer(self.relatedTrips.outgoing.layer);
				self.relatedTrips.outgoing.layer.off();
			}
			if ((typeof(self.relatedTrips.outgoing.curveLayer)!=='undefined') && self._map.hasLayer(self.relatedTrips.outgoing.curveLayer)) {
				self._map.removeLayer(self.relatedTrips.outgoing.curveLayer);
			}	
			if ((typeof(self.relatedTrips.incoming.curveLayer)!=='undefined') && self._map.hasLayer(self.relatedTrips.incoming.curveLayer)) {
				self._map.removeLayer(self.relatedTrips.incoming.curveLayer);
			}	
		}
	};
})();