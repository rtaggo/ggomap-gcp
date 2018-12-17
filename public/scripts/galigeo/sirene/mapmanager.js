(function() {
	'use strict';
	GGO.MapManager = function(options){
		this._options = options || {};
		this._options.mapboxAccessToken = this._options.mapboxAccessToken || 'pk.eyJ1IjoicnRhZ2dvIiwiYSI6Ijg5YWI5YzlkYzJiYzg2Mjg2YWQyMTQyZjRkZWFiMWM5In0._yZGbo26CQle1_JfHPxWzg';
		this._options.mapDivId = this._options.mapDivId || 'map';
		L.mapbox.accessToken = this._options.mapboxAccessToken;

		this.searched = {
			layer: L.mapbox.featureLayer()
		};
		this.setupMap();
	};

	GGO.MapManager.prototype = {
		setupMap: function() {
			var self = this;
			var stamen_tonerLite = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}{r}.{ext}', {
				attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
				subdomains: 'abcd',
				minZoom: 0,
				maxZoom: 20,
				ext: 'png'
			});

			var OpenMapSurfer_Grayscale = L.tileLayer('https://korona.geog.uni-heidelberg.de/tiles/roadsg/x={x}&y={y}&z={z}', {
				maxZoom: 19,
				attribution: 'Imagery from <a href="http://giscience.uni-hd.de/">GIScience Research Group @ University of Heidelberg</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
			});
			var mapDivId = this._options.mapDivId || 'map';
			this._map = L.map(mapDivId, {
				preferCanvas: true,
				zoomControl: false,
				contextmenu: true,
				contextmenuWidth: 140,						
				layers: [OpenMapSurfer_Grayscale]
			}).setView([0, 0], 2);
			
			new L.control.zoom({
				position:'topright'
			}).addTo(this._map);
		},
		setSearchResponse: function(response){
			var self = this;
			self.searched.geojson = response;
			$.each(self.searched.geojson.features, function(idx, val){
				val.properties['marker-size'] = 'small';
				var desc = '<span class="ttip-title">' + val.properties.name + '</span><br />';
				var tbl = '<table>';
				tbl += '<tr><td class="infowindow-field">SIRET : </td><td>' + val.properties.siret +'</td></tr>';
				var addr = val.properties.adresse + '<br />';
				addr += val.properties.codepostal + ' - ' + val.properties.commune + '<br />';
				addr += val.properties.departement;								
				
				tbl += '<tr style="vertical-align:top;"><td  class="infowindow-field">Adresse : </td><td>' + addr +'</td></tr>';
				tbl += '</table>';
				
				desc += tbl;				
				val.properties['description'] = desc;
			});
			self.searched.layer.setGeoJSON(self.searched.geojson);


			if (!self._map.hasLayer(self.searched.layer)) {
				self._map.addLayer(self.searched.layer);
			}
			self._map.fitBounds(self.searched.layer.getBounds());
		}
	};
})();