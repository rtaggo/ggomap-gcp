(function() {
	'use strict';
	GGO.MapManager = function(options){
		this._options = options || {};
		this._options.mapboxAccessToken = this._options.mapboxAccessToken || 'pk.eyJ1IjoicnRhZ2dvIiwiYSI6Ijg5YWI5YzlkYzJiYzg2Mjg2YWQyMTQyZjRkZWFiMWM5In0._yZGbo26CQle1_JfHPxWzg';
		this._options.mapDivId = this._options.mapDivId || 'map';
		L.mapbox.accessToken = this._options.mapboxAccessToken;

		//this._cat_colors = ['#d7191c', '#fdae61', '#ffffbf', '#abdda4', '#2b83ba'];
		this._cat_colors = ['#f1eef6', '#d7b5d8', '#df65b0', '#dd1c77', '#980043'];
		
		this._colors = {
			pickup : ['#f1eef6', '#d7b5d8', '#df65b0', '#dd1c77', '#980043'],
			dropoff : ['#ffffcc', '#a1dab4', '#41b6c4', '#2c7fb8','#253494']
		};
		
		this._cabZones = {
			pickup : {
				layer: L.mapbox.featureLayer()
			},
			dropoff : {
				layer: L.mapbox.featureLayer()
			}
		};
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
			}).setView([40.74289608033983, -73.92909407615663], 11);

			this._cabZones.pickup.layer
				.on('add', function(l){
					console.log('pickup layer added to map');
					if (typeof(self._cabZones.pickup.legendCtrl) !== 'undefined') {
						self._cabZones.pickup.legendCtrl.addTo(self._map);
					}
				})
				.on('remove', function(l){
					console.log('pickup layer removed from map');
					if (typeof(self._cabZones.pickup.legendCtrl) !== 'undefined') {
						self._map.removeControl(self._cabZones.pickup.legendCtrl);
					}
				});
			this._cabZones.dropoff.layer
				.on('add', function(l){
					console.log('dropoff layer added to map');
					if (typeof(self._cabZones.dropoff.legendCtrl) !== 'undefined') {
						self._cabZones.dropoff.legendCtrl.addTo(self._map);
					}
				})
				.on('remove', function(l){
					console.log('dropoff layer removed from map');
					if (typeof(self._cabZones.dropoff.legendCtrl) !== 'undefined') {
						self._map.removeControl(self._cabZones.dropoff.legendCtrl);
					}
				});
				
			var overlayMaps = {
				"Pickup & DropOff": {
					"Pickup Areas" : this._cabZones.pickup.layer,
					"DropOff Areas" : this._cabZones.dropoff.layer
				}
			};
			var lgOptions = {
				// Make the "Landmarks" group exclusive (use radio inputs)
				exclusiveGroups: ["Pickup & DropOff"],
				// Show a checkbox next to non-exclusive group labels for toggling all
				groupCheckboxes: true
			};
			this._cabZones.pickup.layer.addTo(this._map);
			//this._cabZones.dropoff.layer.addTo(this._map);
			L.control.groupedLayers({}, overlayMaps,lgOptions).addTo(this._map);
			new L.control.zoom({
				position:'topright'
			}).addTo(this._map);
		},
		applyClassifier: function(data, classifier, prop) {
			$.each(data, function(idx, val){
				val.properties["stroke"] 		= "#EDEDED";
				val.properties["stroke-width"] 	= 2;
				val.properties["stroke-opacity"]= 0.5;
				val.properties["fill-opacity"]	= 0.5;
				val.properties["fill"] 			= classifier(val.properties[prop]);
			});
		},
		highlightFeature: function(l, classifier, prop) {
			l.setStyle({
				weight:5,
				fillOpacity: 0.8
			});
		},
		resetHighlightFeature: function(l, classifier, prop) {
			l.setStyle({
				weight:2,
				fillOpacity: 0.5
			});
		},
		getTooltip:function(l) {
			var tt = '<span class="ttip-title">' + l.feature.properties.name + '</span><br />';
			tt += '<span># Pick Up : ' + l.feature.properties.nb_pickup + '</span><br />';
			tt += '<span># Drop Off : ' + l.feature.properties.nb_dropoff + '</span>';
			return tt;
		},
		setCabZoneData: function(data) {
			var self = this;
			self._cabZones.data = turf.featureCollection(data.features);
			self._cabZones.pickup.classifier = this.getDataClassifier(self._cabZones.data, this._colors.pickup, 'nb_pickup');
			var pickupGeoJSON = JSON.parse(JSON.stringify(self._cabZones.data));
			self.applyClassifier(pickupGeoJSON.features, self._cabZones.pickup.classifier, 'nb_pickup');
			self._cabZones.pickup.layer.setGeoJSON(pickupGeoJSON);
			self._cabZones.pickup.layer.eachLayer(function(l){
				l
					.on('mouseover', function(e){
						console.log('mouse over', e);
						self.highlightFeature(e.target, self._cabZones.pickup.classifier, 'nb_pickup');
						e.target.openTooltip();
					})
					.on('mouseout', function(e){
						console.log('mouse over', e);
						self.resetHighlightFeature(e.target, self._cabZones.pickup.classifier, 'nb_pickup');
						e.target.closeTooltip();
					});
				l.bindTooltip(self.getTooltip(l), {direction: 'top'});
			});
			self._cabZones.pickup.legendCtrl = self.getLegend(self._cabZones.pickup.classifier, 'Pick Up');
			self._cabZones.pickup.legendCtrl.addTo(self._map);
			
			self._cabZones.dropoff.classifier = this.getDataClassifier(self._cabZones.data, this._colors.dropoff, 'nb_dropoff');
			var dropoffGeoJSON = JSON.parse(JSON.stringify(self._cabZones.data));
			self.applyClassifier(dropoffGeoJSON.features, self._cabZones.dropoff.classifier, 'nb_dropoff');
			self._cabZones.dropoff.layer.setGeoJSON(dropoffGeoJSON);
			self._cabZones.dropoff.layer.eachLayer(function(l){
				l
					.on('mouseover', function(e){
						console.log('mouse over', e);
						self.highlightFeature(e.target, self._cabZones.dropoff.classifier, 'nb_pickup');
					})
					.on('mouseout', function(e){
						console.log('mouse over', e);
						self.resetHighlightFeature(e.target, self._cabZones.dropoff.classifier, 'nb_pickup');
					});
				l.bindTooltip(self.getTooltip(l));
			});
			
			self._cabZones.dropoff.legendCtrl = self.getLegend(self._cabZones.dropoff.classifier, 'Drop Off');
			//self._cabZones.dropoff.legendCtrl.addTo(self._map);
			self._map.fitBounds(self._cabZones.pickup.layer.getBounds());
		},
		buildLegendContent:function(classifier, title) {
			var rangeColors = classifier.range(),
				values = classifier.domain(),
				outlabels = [],
				outspans = [],
				from, value;

			for (var i = 0; i < rangeColors.length; i++) {
				value = values[i];
				
				outspans.push('<span style=\'background:'+rangeColors[i]+';\'></span>');
				outlabels.push('<label>' + value + '</label>');
			}
				
			var outgoingLgd = '<div class="map-legend wax-legend">';
			outgoingLgd += '<strong>'+title+'</strong>';
			outgoingLgd += '<nav class=\'legend clearfix\'>'+outspans.join('')+outlabels.join('')+'</nav>';
			outgoingLgd += '</div>';

			var lgds = outgoingLgd;

			return lgds;
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
		getDataClassifier:function(data, colorsRange, property){
			var color = d3.scaleQuantile().range(colorsRange);
			const numberOfClasses = color.range().length - 1;
			const jenksNaturalBreaks = GGO.jenks(data.features.map(d => d.properties[property]), numberOfClasses);
			console.log('numberOfClasses', numberOfClasses);
			console.log('jenksNaturalBreaks', jenksNaturalBreaks);

			// set the domain of the color scale based on our data
			color
				.domain(jenksNaturalBreaks);

			return color;
		}
	};
})();