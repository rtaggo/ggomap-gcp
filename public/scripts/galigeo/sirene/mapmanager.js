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
		this.init();
	};

	GGO.MapManager.prototype = {
		init:function(){
			this.setupListeners();
			this.setupMap();
		},
		setupListeners:function(){
			var self = this;				
			GGO.EventBus.addEventListener('sirenedatapaneheightchanged', function(e) {
				var data = e.target;
				console.log('Panel size changed', data);
				//smallmap
				self.changeMapSize(data.isExpanded);
			});
		},
		changeMapSize(isExpanded) {
			if (isExpanded) {
				$('#'+this._options.mapDivId).addClass('smallmap');
			} else {
				$('#'+this._options.mapDivId).removeClass('smallmap');
			}
			this._map.invalidateSize();
		},
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
				val.properties['isVisible'] = true;
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
			self.buildDataTableContent(self.searched.layer.getLayers());
		},
		buildDataTableContent: function(layers){
			var self = this;
			var ctnr = $('#datapanelcontent').empty();
			var globalOtherActionsIcon = $('<i class="more_action material-icons">arrow_drop_down</i>');
			var tbl = $('<table></table>')
				.append($('<thead></thead>')
					.append($('<tr></tr>')
						.append($('<th></th>'))
						.append($('<th>SIRET</th>'))
						.append($('<th>NOM</th>'))
						.append($('<th>Adresse</th>'))
						.append($('<th></th>').append(globalOtherActionsIcon))));

			var tblBody = $('<tbody></tbody>');
			$.each(layers, function(idxL, valL){
				tblBody.append(self.buildLayerTableRow(valL));
			});
			ctnr.append(tbl.append(tblBody));

			$('#sirenedatapanel').removeClass('hide');
			self.changeMapSize(true);
		},
		buildLayerTableRow: function(layer){
			var mkId = layer.feature.properties['siret'];
				var chkMkId = 'chk-' + mkId;
				var chk = $('<input type="checkbox"/>')
					.attr('checked', layer.feature.properties['isVisible']);
				
				var chkElt = $('<label></label>').append(chk)
					.append($('<span>&nbsp;</span>'));
				
				var addr = layer.feature.properties['adresse'] + ', ' + layer.feature.properties['codepostal'];
				addr += layer.feature.properties['commune'] + ', ' + layer.feature.properties['departement']


				return $('<tr><tr/>')
						.append($('<td></td>').append(chkElt))
						.append($('<td></td>').append(mkId))
						.append($('<td></td>').append(layer.feature.properties['name']))
						.append($('<td></td>').append(addr))
						.append($('<td><i class="more_action material-icons">arrow_drop_down</i></td>'));
		}
	};
})();