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
			/*
			var OpenMapSurfer_Grayscale = L.tileLayer('https://korona.geog.uni-heidelberg.de/tiles/roadsg/x={x}&y={y}&z={z}', {
				maxZoom: 19,
				attribution: 'Imagery from <a href="http://giscience.uni-hd.de/">GIScience Research Group @ University of Heidelberg</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
			});
			*/
			var mapDivId = this._options.mapDivId || 'map';
			this._map = L.map(mapDivId, {
				preferCanvas: true,
				zoomControl: false,
				contextmenu: true,
				contextmenuWidth: 140,						
				layers: [stamen_tonerLite]
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
			var ctnr = $('#recordsContent').empty();
			var globalOtherActionsIcon = $('<i class="more_action material-icons">arrow_drop_down</i>');
			
			var moreIconPath = '/styles/slds/assets/icons/utility-sprite/svg/symbols.svg#down';
			var moreMenu = $('<div class="slds-dropdown-trigger slds-dropdown-trigger--click"></div>');
			var moreBtn = $('<button class="slds-button slds-button_icon slds-button_icon-border-filled slds-button_icon-x-small" aria-haspopup="true"></button>')
							.append($('<svg aria-hidden="true" class="slds-button__icon"><use xlink:href="'+moreIconPath+'"></use></svg><span class="slds-assistive-text">More</span>'));
			var panToRecordAction = $('<li class="slds-dropdown__item" role="presentation"><a href="javascript:void(0);" role="menuitem" tabindex="0"><span class="slds-truncate">Analyses</span></a></li>');
			panToRecordAction.click(function(e) {
				$('#recordsContent .slds-dropdown-trigger').removeClass('slds-is-open');
				alert('TODO: Analyse avec Google Places API via un worker');
			});
			moreBtn.click(function(){
				var thisParent = $(this).parent();
				var needToOpen = !thisParent.hasClass('slds-is-open');
				$('#recordsContent .slds-dropdown-trigger').removeClass('slds-is-open');
				if (needToOpen) {
					thisParent.addClass('slds-is-open');
				}
			});
			var actionsList = $('<ul class="slds-dropdown__list" role="menu"></ul>');
			actionsList.append(panToRecordAction);
			var moreActions = $('<div class="slds-dropdown slds-dropdown--right slds-nubbin--right" style="top: -12px; right: 32px;"></div>').append(actionsList);
								
			moreMenu.append(moreBtn).append(moreActions);

			var tbl = $('<table class="slds-table slds-table--bordered slds-table--cell-buffer slds-table--striped slds-table--fixed-layout slds-scrollable--y" role="grid"></table>')
				.append($('<thead></thead>')
					.append($('<tr class="slds-text-title--caps"></tr>')
						.append($('<th class="slds-cell-shrink" scope="col"></th>'))
						.append($('<th scope="col" style="width:140px;">SIRET</th>'))
						.append($('<th scope="col" style="width:200px;">NOM</th>'))
						.append($('<th scope="col">Adresse</th>'))
						.append($('<th class="slds-cell-shrink" scope="col"></th>').append(moreMenu))));

			var tblBody = $('<tbody></tbody>');
			$.each(layers, function(idxL, valL){
				tblBody.append(self.buildLayerTableRow(valL));
			});
			ctnr.append(tbl.append(tblBody));

			$('#data-composer').removeClass('slds-hide');
			self.changeMapSize(true);
		},
		buildLayerTableRow: function(layer){
			var self = this;
			var mkId = layer.feature.properties['siret'];
			var chkMkId = 'chk-' + mkId;
			var vizChkBox = $('<label class="slds-checkbox"></label>');
			var chkRecord = $('<input type="checkbox" name="options" />');
			var recordVisible = layer.feature.properties['isVisible'];
			chkRecord.attr('checked', recordVisible);
			chkRecord.change(function(e){
				e.stopImmediatePropagation();
				var isChecked = e.target.checked;
				console.log('checkbox for PDV changed to ' + (isChecked?'Checked': 'UnChecked'));
				this.pdvLayer.feature.properties['isVisible'] = isChecked;
				self.refreshLayer();
			}.bind({siret: mkId, pdvLayer: layer}));
			vizChkBox.append(chkRecord).append($('<span class="slds-checkbox--faux"></span><span class="slds-assistive-text"></span>'));

			var addr = layer.feature.properties['adresse'] + ', ' + layer.feature.properties['codepostal'];
			addr += layer.feature.properties['commune'] + ', ' + layer.feature.properties['departement']

			var moreIconPath = '/styles/slds/assets/icons/utility-sprite/svg/symbols.svg#down';
			var moreMenu = $('<div class="slds-dropdown-trigger slds-dropdown-trigger--click"></div>');
			var moreBtn = $('<button class="slds-button slds-button_icon slds-button_icon-border-filled slds-button_icon-x-small" aria-haspopup="true"></button>')
							.append($('<svg aria-hidden="true" class="slds-button__icon"><use xlink:href="'+moreIconPath+'"></use></svg><span class="slds-assistive-text">More</span>'));
			var panToRecordAction = $('<li class="slds-dropdown__item" role="presentation"><a href="javascript:void(0);" role="menuitem" tabindex="0"><span class="slds-truncate">Pan To Record</span></a></li>');
			panToRecordAction.click(function(e) {
				$('#recordsContent .slds-dropdown-trigger').removeClass('slds-is-open');
				self._map.setView(this.pdvLayer.getLatLng(),16);
				this.pdvLayer.openPopup();
			}.bind({siretId: mkId,  pdvLayer: layer}));
			moreBtn.click(function(){
				var thisParent = $(this).parent();
				var needToOpen = !thisParent.hasClass('slds-is-open');
				$('#recordsContent .slds-dropdown-trigger').removeClass('slds-is-open');
				if (needToOpen) {
					thisParent.addClass('slds-is-open');
				}
			});
			var actionsList = $('<ul class="slds-dropdown__list" role="menu"></ul>');
			actionsList.append(panToRecordAction);
			var moreActions = $('<div class="slds-dropdown slds-dropdown--right slds-nubbin--right" style="top: -12px; right: 32px;"></div>').append(actionsList);
								
			moreMenu.append(moreBtn).append(moreActions);
			return $('<tr></tr>')
					.append($('<td role="gridcell" class="slds-cell-shrink" data-label=""></td>').append(vizChkBox))
					.append($('<td></td>').append($('<div class="slds-truncate" title="'+mkId+'">').append(mkId)))
					.append($('<td></td>').append($('<div class="slds-truncate" title="'+layer.feature.properties['name']+'">').append(layer.feature.properties['name'])))
					.append($('<td></td>').append($('<div class="slds-truncate" title="'+addr+'">').append(addr)))
					.append($('<td role="gridcell" class="slds-cell-shrink" data-label="Actions"></td>').append(moreMenu));
		},
		_isFiltered: function(feature) {
			return feature.properties.isVisible;
		},
		refreshLayer: function() {
			var self = this;

			self.searched.layer.setFilter(function(feature){
				return self._isFiltered(feature);
			});
		}
	};
})();