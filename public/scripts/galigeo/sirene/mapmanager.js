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

		this._filtersProps = {
			regions: {
				values: [],
				filteredValues : []
			}
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
			self.searched.pdvs = {};
			var regionsValuesSet = new Set();
			if (self.searched.geojson.features.length>0) {
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
					regionsValuesSet.add(val.properties.region);
				});

				self._filtersProps.regions.values = Array.from(regionsValuesSet).sort();
				self._filtersProps.regions.filteredValues = new Set(regionsValuesSet);

				self.searched.layer.setGeoJSON(self.searched.geojson);
				self.searched.layer.eachLayer(function(lyr) {
					self.searched.pdvs[lyr.feature.properties.siret] = lyr;
				});

				if (!self._map.hasLayer(self.searched.layer)) {
					self._map.addLayer(self.searched.layer);
				}
				self._map.fitBounds(self.searched.layer.getBounds());
				self.buildDataTableContent(self.searched.geojson.features);
			} else {
				$('#recordsContent').empty();
			}
			$('#search-infos').empty()
				.text(self.searched.geojson.features.length + ' élément(s) trouvé(s)')
				.removeClass('slds-hide');
			GGO.EventBus.dispatch(GGO.EVENTS.SIRENESEARCHCOMPLETED);
		},		
		buildDataTableContent: function(pdvs){
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

			var filterIconPath = '/styles/slds/assets/icons/utility-sprite/svg/symbols.svg#filterList';
			var regionFilterMenu = $('<button class="slds-button slds-button_icon slds-th__action-button slds-button_icon-x-small" aria-haspopup="true" tabindex="-1" title="Show Name column actions"></button>')
							.append($('<svg class="slds-button__icon slds-button__icon_hint slds-button__icon_small" aria-hidden="true"><use xlink:href="'+filterIconPath+'"></use></svg><span class="slds-assistive-text">More</span>'));

			regionFilterMenu.click(function(e){
				if ($('regionsFilterPopup').length===0) {
					var fContent = $('<div id="regionsFilterPopup" class="slds-dropdown slds-dropdown--right-top slds-nubbin--right-top slds-m-around-small" style="top: -4px; right: 0px;left:120px;font-size:smaller;width: 300px; max-width: 300px;"></div>');
					fContent.append($('<div class="slds-text-title_caps slds-text-title_caps slds-p-around_x-small">Filtres sur les régions</div>'));
					var regionsDiv = $('<div class="slds-scrollable--y slds-p-around_x-small" style="max-height:160px; height:160px;"></div>');
					var regUL = $('<ul class=""></ul>');
					$.each(self._filtersProps.regions.values , function(ridx, rval){
						var inputChk = $('<input type="checkbox" name="options" id="region-' + ridx+'" value="'+rval+'" />')
							.attr('checked', self._filtersProps.regions.filteredValues.has(rval));
						inputChk.change(function(e){
							e.stopImmediatePropagation();
							var isChecked = e.target.checked;
							if (isChecked) {
								self._filtersProps.regions.filteredValues.add($(this).val());
							} else {
								self._filtersProps.regions.filteredValues.delete($(this).val());
							}
						});

						regUL.append($('<li class="slds-item"></li>')
							.append($('<div class="slds-p-around_xx-small" style="max-width: 240px;"></div>')
								.append($('<label class="slds-checkbox"></label>')
									.append(inputChk)
									.append($('<span class="slds-checkbox--faux"></span><span class="slds-assistive-text"></span>')))
								.append($('<div class="slds-truncate" style="display: inline-block;vertical-align: middle;max-width: 240px;padding-left: 5px;" title="'+rval+'">'+rval+'</div>'))
								));
					});				
					//regForm.append(regFormElt);
					regionsDiv.append(regUL);

					var btnFormElt = $('<div class="slds-form-element" style="text-align:center;"></div>');
					var okBtn = $('<button class="slds-button slds-button_brand" style="width:80px;">OK</button>');
					var cancelBtn = $('<button class="slds-button slds-button_neutral" style="width:80px;">Annuler</button>');

					okBtn.click(function(){
						$('#regionsFilterPopup').remove();
						self.refreshLayer();
						self.redrawTableBody();
					});
					cancelBtn.click(function(e){
						$('#regionsFilterPopup').remove();
					});

					btnFormElt.append(okBtn).append(cancelBtn);
					//regionsDiv.append(btnFormElt);
					fContent.append(regionsDiv).append(btnFormElt);
					$(this).parent().append(fContent);
				}
			});

			var regionSortBy = $('<a class="slds-th__action slds-text-link_reset" href="javascript:void(0);" role="button" tabindex="-1"></a>')
				.append($('<span class="slds-assistive-text">Sort by: </span>'))
				.append($('<div class="slds-grid slds-grid_vertical-align-center slds-has-flexi-truncate"></div>')
					.append($('<span class="slds-truncate" title="Région">Région</span>'))
					.append($('<span class="slds-icon_container slds-icon-utility-arrowdown"></span>')
						.append($('<svg class="slds-icon slds-icon-text-default slds-is-sortable__icon " aria-hidden="true"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="/styles/slds/assets/icons/utility-sprite/svg/symbols.svg#arrowdown" /></svg>')))
					);

			regionSortBy.click(function(e){
				var theTHParent =$(this).parent();
				theTHParent.addClass('slds-is-sorted');
				var ariasort = theTHParent.attr('aria-sort');
				ariasort = (ariasort === 'ascending' ? 'descending': 'ascending');
				if (ariasort === 'ascending') {
					theTHParent.removeClass('slds-is-sorted_desc');
					theTHParent.addClass('slds-is-sorted_asc');
				} else {
					theTHParent.removeClass('slds-is-sorted_asc');
					theTHParent.addClass('slds-is-sorted_desc');
				}
				theTHParent.attr('aria-sort', ariasort);
				self._sortProps = {
					property: 'region', 
					order: ariasort
				};
				self.redrawTableBody();
			});

			var tbl = $('<table class="slds-table slds-table--bordered slds-table--cell-buffer slds-table--striped slds-table--fixed-layout slds-table_col-bordered slds-scrollable--y" role="grid"></table>')
				.append($('<thead></thead>')
					.append($('<tr class="slds-line-height_reset"></tr>')
						.append($('<th class="slds-cell-shrink" scope="col"></th>'))
						.append($('<th class="slds-text-title_caps" scope="col" style="width:140px;">SIRET</th>'))
						.append($('<th class="slds-text-title_caps" scope="col" style="width:200px;">NOM</th>'))
						.append($('<th class="slds-text-title_caps" scope="col">Adresse</th>'))
						.append($('<th class="slds-text-title_caps" scope="col" style="width:70px;">CP</th>'))
						.append($('<th class="slds-text-title_caps" scope="col">Commune</th>'))
						.append($('<th class="slds-text-title_caps" scope="col">Département</th>'))
						.append($('<th aria-sort="none" class="slds-text-title_caps slds-has-button-menu slds-is-sortable" scope="col" style="width:300px;"></th>')
							.append(regionSortBy)
							.append(regionFilterMenu)
						)
						.append($('<th class="slds-cell-shrink" scope="col"></th>').append(moreMenu))));

			var tblBody = $('<tbody></tbody>');

			self.buildDataTableBody(tblBody, pdvs);
			ctnr.append(tbl.append(tblBody));

			$('#data-composer').removeClass('slds-hide');
			self.changeMapSize(true);
		},
		_sortOnPropFn : function(prop, reverse) {
			return function (af, bf) {
				var a = af.properties;
				var b = bf.properties;
				var aprop = a[prop];
				var bprop = b[prop];
				if (aprop < bprop) return reverse ? 1 : -1;
				if (aprop > bprop) return reverse ? -1 : 1;
				return 0;
			};
		},			
		redrawTableBody : function() {
			var self = this;
			$.each(self.searched.geojson.features, function(idx, val) { 
				if (val.properties.siret === '40421898400015') {
					console.log('find it: ', val); 
				}
			});
			var layers = self.searched.layer.getLayers();
			var _layers = [];
			for (var k in Object.keys(self.searched.layer._layers)) {
				_layers.push(self.searched.layer._layers[k]);
			}
			var _layers = self.searched.geojson.features.filter(function(elt){
				return self._filtersProps.regions.filteredValues.has(elt.properties.region);
			});

			var sortedArr = (self._sortProps?_layers.sort(self._sortOnPropFn(self._sortProps.property, (self._sortProps.order === 'ascending' ? false : true))):_layers);
			self.buildDataTableBody($('#recordsContent tbody').empty(), sortedArr);
		},
		buildDataTableBody: function(tbodyCtnr, pdvs){
			var self = this;
			$.each(pdvs, function(idxPDV, valPDV){
				tbodyCtnr.append(self.buildLayerTableRow(valPDV));
			});
		},
		buildLayerTableRow: function(pdv){
			var self = this;
			var vizTD = $('<td role="gridcell" class="slds-cell-shrink" data-label=""></td>');
			var moreActionTD = $('<td role="gridcell" class="slds-cell-shrink" data-label="Actions"></td>');
			var mkId = pdv.properties['siret'];
			
			if (pdv.geometry !==  null) {
				var chkMkId = 'chk-' + mkId;
				var vizChkBox = $('<label class="slds-checkbox"></label>');
				var chkRecord = $('<input type="checkbox" name="options" />');
				var recordVisible = pdv.properties['isVisible'];
				chkRecord.attr('checked', recordVisible);
				chkRecord.change(function(e){
					e.stopImmediatePropagation();
					var isChecked = e.target.checked;
					console.log('checkbox for PDV changed to ' + (isChecked?'Checked': 'UnChecked'));
					this.pdvLayer.feature.properties['isVisible'] = isChecked;
					self.refreshLayer();
				}.bind({siret: mkId, pdvLayer: self.searched.pdvs[mkId]}));
				vizChkBox.append(chkRecord).append($('<span class="slds-checkbox--faux"></span><span class="slds-assistive-text"></span>'));

				//var addr = layer.feature.properties['adresse'] + ', ' + layer.feature.properties['codepostal'];
				//addr += layer.feature.properties['commune'] + ', ' + layer.feature.properties['departement']

				var moreIconPath = '/styles/slds/assets/icons/utility-sprite/svg/symbols.svg#down';
				var moreMenu = $('<div class="slds-dropdown-trigger slds-dropdown-trigger--click"></div>');
				var moreBtn = $('<button class="slds-button slds-button_icon slds-button_icon-border-filled slds-button_icon-x-small" aria-haspopup="true"></button>')
								.append($('<svg aria-hidden="true" class="slds-button__icon"><use xlink:href="'+moreIconPath+'"></use></svg><span class="slds-assistive-text">More</span>'));
				var panToRecordAction = $('<li class="slds-dropdown__item" role="presentation"><a href="javascript:void(0);" role="menuitem" tabindex="0"><span class="slds-truncate">Pan To Record</span></a></li>');
				panToRecordAction.click(function(e) {
					$('#recordsContent .slds-dropdown-trigger').removeClass('slds-is-open');
					self._map.setView(this.pdvLayer.getLatLng(),16);
					this.pdvLayer.openPopup();
				}.bind({siretId: mkId,  pdvLayer: self.searched.pdvs[mkId]}));
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

				vizTD.append(vizChkBox);
				moreActionTD.append(moreMenu);
			}

			return $('<tr></tr>')
					.append(vizTD)
					.append($('<td></td>').append($('<div class="slds-truncate" title="'+mkId+'">').append(mkId)))
					.append($('<td></td>').append($('<div class="slds-truncate" title="'+pdv.properties['name']+'">').append(pdv.properties['name'])))
					.append($('<td></td>').append($('<div class="slds-truncate" title="'+pdv.properties['adresse']+'">').append(pdv.properties['adresse'])))
					.append($('<td></td>').append($('<div class="slds-truncate" title="'+pdv.properties['codepostal']+'">').append(pdv.properties['codepostal'])))
					.append($('<td></td>').append($('<div class="slds-truncate" title="'+pdv.properties['commune']+'">').append(pdv.properties['commune'])))
					.append($('<td></td>').append($('<div class="slds-truncate" title="'+pdv.properties['departement']+'">').append(pdv.properties['departement'])))
					.append($('<td></td>').append($('<div class="slds-truncate" title="'+pdv.properties['region']+'">').append(pdv.properties['region'])))
					.append(moreActionTD);
		},
		_isFiltered: function(feature) {
			return this._filtersProps.regions.filteredValues.has(feature.properties.region) && feature.properties.isVisible;
		},
		refreshLayer: function() {
			var self = this;

			self.searched.layer.setFilter(function(feature){
				return self._isFiltered(feature);
			});
		}
	};
})();