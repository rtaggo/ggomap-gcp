(function() {
	'use strict';
	GGO.GeoServiceManager = function(options){
		this._options = options || {};
		this.init();
		this._visibleCarreauxLayer = null;
		this._numberFormatterInt = Intl.NumberFormat('fr' ,{useGrouping: true, maximumFractionDigits:0});
		this._heightsRange = [0, 1000];
	};

	GGO.GeoServiceManager.prototype = {
		init:function(){
			this.setupListeners();
			$('#isochonesLayer').attr('disabled', true);
			$('input:radio[name="carreaux_layers"]').attr('disabled', true);
		},
		setupListeners:function(){
			var self = this;
			GGO.EventBus.addEventListener(GGO.EVENTS.MAPISLOADED, function(e) {
				console.log(`PoS Analyzer received ${GGO.EVENTS.MAPISLOADED} event`);
				self._popup = new mapboxgl.Popup({
					closeButton: false,
					closeOnClick: false
				});
				let _map = self._options.app.getMap();
				_map.on('mousemove', function(e) {
					if (self._visibleCarreauxLayer === null) {
						return;
					}
					var features = self._options.app.getMap().queryRenderedFeatures(e.point, { layers:  [self._visibleCarreauxLayer] });
					if (!features.length) {
						if (self._popup) {
							self._popup.remove();
						}
						return;
					}
					var feature = features[0];
					console.log('feature', feature);
					var popupContent = '<div class="ggoslds"><span  class="feature-name">' + feature.properties.id + '</span>';//<br/>Surface: ' + feature.properties.surface.toFixed(0) + ' km2';
					popupContent += '<dl class="slds-list_horizontal slds-wrap">';
					popupContent += '<dt class="slds-item_label slds-text-color_weak slds-truncate" style="width:50%; text-align:right;">Nb Ménage:</dt>';
					popupContent += '<dd class="slds-item_detail slds-truncate" style="width:50%;">'+ self._numberFormatterInt.format(feature.properties.men) +'</dd>';
					popupContent += '<dt class="slds-item_label slds-text-color_weak slds-truncate" style="width:50%; text-align:right;">Revenus:</dt>';
					popupContent += '<dd class="slds-item_detail slds-truncate" style="width:50%;">'+ self._numberFormatterInt.format(feature.properties.revenus) +' €</dd>';
					popupContent += '</dl></div>';
		            self._popup.setLngLat(turf.centerOfMass(feature.toJSON()).geometry.coordinates)
						.setHTML(popupContent)
						.addTo(self._options.app.getMap());
				});

			});
			$('#isochonesLayer').change(function(e){
				console.log('check iso layer changed', e);
				let layerId = $(this).val();
				let theMap = self._options.app.getMap();
				if (typeof theMap.getLayer(layerId) !== 'undefined' ) {
					theMap.setLayoutProperty(layerId, 'visibility', (this.checked?'visible':'none'));
				}
			});
			$('input:radio[name="carreaux_layers"]').click(function(e){
				console.log('clicked', e);
				let layerId = $(this).val();
				let theMap = self._options.app.getMap();
				let layerToHide = (layerId === 'carreaux_revenus') ? 'carreaux_men' : 'carreaux_revenus';
				if (typeof theMap.getLayer(layerToHide) !== 'undefined' ) {
					theMap.setLayoutProperty(layerToHide, 'visibility', 'none');
				}
				if (typeof theMap.getLayer(layerId) !== 'undefined' ) {
		            theMap.setLayoutProperty(layerId, 'visibility', 'visible');
		        }
		        self._visibleCarreauxLayer = layerId;
			});
			$('#search-input').on('input',function(e){
				self._searchTerm = $(this).val();
				if (self._searchTerm !== '') {
					$('#clear-search-input').removeClass('slds-hide');
					$('#do-search').attr('disabled', false);
				} else {
					$('#clear-search-input').addClass('slds-hide');
					$('#do-search').attr('disabled', true);
				}
			})
			.on('keydown', function(e){
				if (e.which === 13) {
					if (self._searchTerm !== '') {
						console.log('hit enter key ==> do search for term \'' + self._searchTerm + '\'');
						self.doAddressLookup(self._searchTerm);
					}
				}
			});
			$('#clear-search-input').click(function(e){
				$('#search-input').val('');
				$(this).addClass('slds-hide');
								
			});
			$('#isochrone-compute-btn').click(function(e){
				self.computeIsochrones();
			});
			$('#isochrone-analyze-btn').click(function(e){
				self.runPOSAnalyzer();
			});
			$('#locateUserIcon').click(function(e){
				console.log('TODO: Locate user');
				var options = {
					enableHighAccuracy: true,
					timeout: 5000,
					maximumAge: 0
				};
				navigator.geolocation.getCurrentPosition(
					function(pos) {
						var crd = pos.coords;
						console.log('Your current position is:');
						console.log(`Latitude : ${crd.latitude}`);
						console.log(`Longitude: ${crd.longitude}`);
						console.log(`More or less ${crd.accuracy} meters.`);
						self.doReverseGeocode({lat: crd.latitude, lng: crd.longitude});
					}, 
					function(err) {
						console.warn(`ERROR(${err.code}): ${err.message}`);
					},
					options
				);
			});
		},
		doReverseGeocode: function(latlng) {
			let self = this;
			let url = `/geoservice/geocoder/reverse?lat=${latlng.lat}&lng=${latlng.lng}`;
			$.ajax({
				type: 'GET',
				url: url,
				success: function(response) {
					console.log('reverse geocode', response);
					//self.handleAddressLookupResponse(response);
					self.selectAddress(response);
				},
				error:  function(jqXHR, textStatus, errorThrown) { 
					if (textStatus === 'abort') {
						console.warn('Address Lookup request aborted');
					} else {
						console.error('Error for Address lookup request: ' + textStatus, errorThrown);
					}
				}
			});		
		},
		doAddressLookup: function(q) {
			let self = this;
			let url = `/geoservice/geocoder/search?q=${q}`;
			$.ajax({
				type: 'GET',
				url: url,
				success: function(response) {
					console.log('addr candidates', response);
					self.handleAddressLookupResponse(response);
				},
				error:  function(jqXHR, textStatus, errorThrown) { 
					if (textStatus === 'abort') {
						console.warn('Address Lookup request aborted');
					} else {
						console.error('Error for Address lookup request: ' + textStatus, errorThrown);
					}
				}
			});	
		},
		handleAddressLookupResponse: function(response) {
			let self = this;
			let ctnr = $('#userAddrAutoCompleteRes').empty();
			var atLeastOne = false;
			var theLI = null;
			if (Array.isArray(response) && (response.length > 0)) {
				var addrList = $('<ul class="slds-listbox slds-listbox_vertical slds-has-dividers_bottom" role="group" style="font-size: 11px;"></ul>');
				atLeastOne = true;
				for (var i = 0; i<response.length; i++) {
					var anAddr = response[i];
					theLI = self.addGeocodeResult(anAddr);
					addrList.append(theLI);
				}
				ctnr.append(addrList);
			}
			if (atLeastOne) {
				if (response.length===1) {
					theLI.trigger('click');
				} else {
					ctnr.removeClass('slds-hide');
				}
			} 
		},
		addGeocodeResult: function(anAddress) {
			var self = this;
			/*
			var ali = $('<li role="presentation" class="slds-listbox__item slds-border_bottom" title="' +  anAddress.label + '"></li>')
				.append($('<div class="slds-media slds-listbox__option slds-listbox__option_entity slds-listbox__option_has-meta" role="option"></dov>')
					.append($('<span class="slds-media__body"><span class="slds-listbox__option-text slds-listbox__option-text_entity slds-p-top_x-small">' + anAddress.label + '</span></span>'))
					);
			*/
			var ali = $('<li class="slds-item">' + anAddress.label + '</li>');
			ali.click(function(e){
				//self._options.refreshFunc.call(self._options.app,this);
				self.selectAddress(this.addr);
				$('#userAddrAutoCompleteRes').empty().addClass('slds-hide');
			}.bind({addr: anAddress}));
			return ali;
		},
		selectAddress: function(addr) {
			let self = this;
			let theMap = this._options.app.getMap();
			if ((typeof(this._currentLocationMarker) !== 'undefined') && (this._currentLocationMarker !== null)) {
				this._currentLocationMarker.remove();
			}
			this._currentAddress = addr;
			let ctnr = $('#currentLocation').empty()
				.append($('<span class="slds-icon_container slds-icon-utility-checkin" style="float: left; position: absolute; top:5px;"></span>')
					.append($('<svg class="slds-icon slds-icon-text-default slds-icon_x-small" aria-hidden="true"><use xlink:href="/styles/slds/assets/icons/utility-sprite/svg/symbols.svg#checkin"></use></svg>')))
				.append($('<div style="display: inline-block; margin-left: 20px;"></div>').text(this._currentAddress.label))
				.removeClass('slds-hide');
			this._currentLocationMarker = new mapboxgl.Marker({
					draggable: true
				})
				.setLngLat(this._currentAddress.coordinates)
				.addTo(theMap);
			this._currentLocationMarker.on('dragend',function(e){
				console.log('current marker location drag end event');
				self.clearAnalysis();
				self.doReverseGeocode(e.target.getLngLat());
			});
			theMap.flyTo({center: this._currentAddress.coordinates, zoom: 16});
			$('#isochroniepanel').removeClass('slds-hide');
		},
		clearAnalysis: function() {
			$('#analysis_panel .slds-panel__close').trigger('click');
			let theMap = this._options.app.getMap();			
			if (typeof theMap.getLayer('isochrones') !== 'undefined' ) {
				theMap.removeLayer('isochrones')
				theMap.removeSource('isochrones');
			}
			if (typeof theMap.getLayer('isochrones_carreaux') !== 'undefined' ) {
				theMap.removeLayer('isochrones_carreaux')
				theMap.removeSource('isochrones_carreaux');
			}
			$('#isochonesLayer').attr('disabled', true);
			$('input:radio[name="carreaux_layers"]').attr('disabled', true);
		},
		computeIsochrones: function() {
			$('#notifierContainer').empty()
				.append($('<div class="slds-notify slds-notify_toast slds-theme_info" role="status"></div>')
					.append($('<div class="slds-notify__content"></div>')
						.append($('<h2 class="slds-text-heading_small">Calcule des isochrones ... </h2>')))
					.append($('<div class="slds-notify__close"></div>')
						.append($('<div role="status" class="slds-spinner slds-spinner_small slds-spinner_inline" style="top: 12px;"></div>')
							.append($('<span class="slds-assistive-text">Loading</span>'))
							.append($('<div class="slds-spinner__dot-a"></div>'))
							.append($('<div class="slds-spinner__dot-b"></div>'))
						)
					)
				)
				.removeClass('slds-hide');
			let self = this;
			let theMap = this._options.app.getMap();
			if (typeof theMap.getLayer('isochrones') !== 'undefined' ) {
				theMap.removeLayer('isochrones')
				theMap.removeSource('isochrones');
				$('#isochonesLayer').attr('disabled', true);
			}
			if (typeof theMap.getLayer('isochrones_carreaux') !== 'undefined' ) {
				theMap.removeLayer('isochrones_carreaux')
				theMap.removeSource('isochrones_carreaux');
			}			
			
			let url = `/geoservice/direction/isochrone?center=${this._currentAddress.coordinates.lat},${this._currentAddress.coordinates.lng}&time_limits=5,10,15`;
			$.ajax({
				type: 'GET',
				url: url,
				success: function(response) {
					console.log('isochones', response);
					$('#notifierContainer').empty().addClass('slds-hide');
					self.handleIsochronesResponse(response);
				},
				error:  function(jqXHR, textStatus, errorThrown) { 
					if (textStatus === 'abort') {
						console.warn('Address Lookup request aborted');
					} else {
						console.error('Error for Address lookup request: ' + textStatus, errorThrown);
					}
				}
			});	
		},
		handleIsochronesResponse: function(response) {
			let theMap = this._options.app.getMap();
			const stops =  [[0, '#2b83ba'], [1, '#abdda4'], [2, '#d7191c']];
			this._isochrones = response;
			theMap.addLayer({
					'id': 'isochrones',
					'type': 'line',
					'source': {
						'type': 'geojson',
						'data': response
					},
					'layout': {},
					'paint': {
						//'line-color': '#0000FF',
						'line-color': {
							property: 'bucket',
							stops: stops
						},
						'line-width' : 2
						
					}
				});
			let bbox = turf.bbox(response);
			theMap.fitBounds(bbox, {padding: 10});
			$('#isochrone-analyze-btn').parent().removeClass('slds-hide');
			$('#isochonesLayer').attr('disabled', false).attr('checked', true);
		},
		runPOSAnalyzer: function() {
			$('#notifierContainer').empty()
				.append($('<div class="slds-notify slds-notify_toast slds-theme_info" role="status"></div>')
					.append($('<div class="slds-notify__content"></div>')
						.append($('<h2 class="slds-text-heading_small">Analyse des carreaux ... </h2>')))
					.append($('<div class="slds-notify__close"></div>')
						.append($('<div role="status" class="slds-spinner slds-spinner_small slds-spinner_inline" style="top: 12px;"></div>')
							.append($('<span class="slds-assistive-text">Loading</span>'))
							.append($('<div class="slds-spinner__dot-a"></div>'))
							.append($('<div class="slds-spinner__dot-b"></div>'))
						)
					)
				)
				.removeClass('slds-hide');
			let theMap = this._options.app.getMap();			
			if (typeof theMap.getLayer('isochrones_carreaux') !== 'undefined' ) {
				theMap.removeLayer('isochrones_carreaux')
				theMap.removeSource('isochrones_carreaux');
			}
			let isos = [];
			$.each(this._isochrones.features, function(idxIso, valIso){
				isos.push({
					label : `Isochrone ${idxIso}`,
					feature: valIso
				});
			});
			var res = {
				"type": "FeatureCollection",
				"features": []
			};
			this.doRunPOSAnalyzer(isos, res);
		},
		doRunPOSAnalyzer: function(isos, res) {
			let self = this;
			if  (isos.length === 0) {
				$('#notifierContainer').empty().addClass('slds-hide');
				this.handlePoSAnalyzerResponse(res);
				return;
			}
			let requestData = {
				isochronies: [isos.pop()]
			};
			let url = `/insee/pos/analyzer`;
			$.ajax({
				type: "POST",
				url: url,
				data: JSON.stringify(requestData),
				contentType: "application/json; charset=utf-8",
				dataType: 'json',
				success: function (response) {
				   // you will get response from your php page (what you echo or print)                 
				   console.log('pos/analyzer response', response);
				   res.features = res.features.concat(response.features);
				   self.doRunPOSAnalyzer(isos, res);
				   //self.handlePoSAnalyzerResponse(response);
				},
				error: function(jqXHR, textStatus, errorThrown) {
				   console.log(textStatus, errorThrown);
				}
			});
		},
		_runPOSAnalyzer: function() {
			let self = this;
					
			let isos = [];
			$.each(self._isochrones.features, function(idxIso, valIso){
				isos.push({
					label : `Isochrone ${idxIso}`,
					feature: valIso
				});
			});
			let requestData = {
				isochronies: isos
			};
			let url = `/insee/pos/analyzer`;
			$.ajax({
				type: "POST",
				url: url,
				data: JSON.stringify(requestData),
				contentType: "application/json; charset=utf-8",
				dataType: 'json',
				success: function (response) {
				   // you will get response from your php page (what you echo or print)                 
				   console.log('pos/analyzer response', response);
				   self.handlePoSAnalyzerResponse(response);
				},
				error: function(jqXHR, textStatus, errorThrown) {
				   console.log(textStatus, errorThrown);
				}
			});
		},
		buildLegend: function(classifier) {
			let ctnr = $('#carreaux-legend').empty();
			ctnr.append($('<h4>Ménage</h4>'));

			var rangeColors = classifier.range(),
				values = classifier.domain(),
				outlabels = [],
				outspans = [],
				from, value;
			var numberFormatterInt = Intl.NumberFormat('fr' ,{useGrouping: true, maximumFractionDigits:0});

			for (var i = 0; i < rangeColors.length; i++) {
				value = values[i];
				ctnr.append($('<div><span style="background-color:'+rangeColors[i]+'"></span>'+ numberFormatterInt.format(value) +'</div>'))
			}
			
			ctnr.css('display', 'block');
		},
		handlePoSAnalyzerResponse: function(response){
			//const stops =  [[0, '#2b83ba'], [1, '#abdda4'], [2, '#d7191c']];
			//const colorsRange = ['#ca0020', '#f4a582', '#f7f7f7', '#92c5de', '#0571b0'];
			//const colorsRange = ['#d7191c', '#fdae61', '#ffffbf', '#a6d96a', '#1a9641'].reverse();
			const colorsRange = ['#ffffb2', '#fecc5c', '#fd8d3c', '#f03b20', '#bd0026'];
			/*
			var classifier = d3.scaleQuantile().range(colorsRange);
			const numberOfClasses = classifier.range().length - 1;
			const jenksNaturalBreaks = GGO.jenks(response.features.map(d => d.properties['men']
				), numberOfClasses);
			console.log('numberOfClasses', numberOfClasses);
			console.log('jenksNaturalBreaks', jenksNaturalBreaks);
			const stops = jenksNaturalBreaks.map(function(e,i){ console.log('i',i);console.log('e',e);return  [(i===0)?0:e, colorsRange[i]];});			
			this.buildLegend(classifier.domain(jenksNaturalBreaks));
			*/
			this._classifiers = {
				carreaux: {
					'men' : this.getDataClassifier(response, colorsRange, 'men'),
					'revenus' : this.getDataClassifier(response, colorsRange, 'revenus')
				}
			}
			this._carreaux = response;
			let theMap = this._options.app.getMap();
			if (typeof (theMap.getSource('carreaux_source')) === 'undefined') {
				theMap.addSource('carreaux_source', {
			       'type': 'geojson',
					'data': response
				});
			} else {
				theMap.getSource('carreaux_source').setData(response);
			}

			/*
			theMap.addLayer({
				'id': 'carreaux_men',
				'type': 'fill',
				'source': 'carreaux_source',
				'layout': {
				    'visibility': 'none'
				},
				'paint': {
					'fill-color': {
						property: 'men',
						stops: this._classifiers.carreaux.men.breaks
					},
					'fill-opacity': 0.6
				}
			});
			*/
			if (typeof theMap.getLayer('carreaux_men') === 'undefined' ) {
				theMap.addLayer({
					'id': 'carreaux_men',
					'type': 'fill-extrusion',
					'source': 'carreaux_source',
					'layout': {
					    'visibility': 'none'
					},
					'paint': {
						'fill-extrusion-color': {
							property: 'men',
							stops: this._classifiers.carreaux.men.breaks
						},
						'fill-extrusion-base': 0,
						'fill-extrusion-height' : { 
							'type': 'identity', 
							'property': 'height_men', 
						},
						'fill-extrusion-opacity' : 0.8
					}
				});
			}

			/*
			theMap.addLayer({
				'id': 'carreaux_revenus',
				'type': 'fill',
				'source': 'carreaux_source',
				'layout': {
				    'visibility': 'visible'
				},
				'paint': {
					'fill-color': {
						property: 'revenus',
						stops: this._classifiers.carreaux.revenus.breaks
					},
					'fill-opacity': 0.6
				}
			});
			*/
			if (typeof theMap.getLayer('carreaux_revenus') === 'undefined' ) {
				theMap.addLayer({
					'id': 'carreaux_revenus',
					'type': 'fill-extrusion',
					'source': 'carreaux_source',
					'layout': {
					    'visibility': 'visible'
					},
					'paint': {
						'fill-extrusion-color': {
							property: 'revenus',
							stops: this._classifiers.carreaux.revenus.breaks
						},
						'fill-extrusion-base': 0,
						'fill-extrusion-height' : { 
							'type': 'identity', 
							'property': 'height_revenus', 
						},
						'fill-extrusion-opacity' : 0.8
					}
				});
			}

			/*
			theMap.addLayer({
				'id': 'isochrones_carreaux',
				'type': 'fill',
				'source': {
					'type': 'geojson',
					'data': response
				},
				'layout': {},
				'paint': {
					'fill-color': {
						property: 'men',
						stops: stops
					},
					'fill-opacity': 0.6
				}
			});
			*/
			this.buildDashboard(response);
			$('input:radio[name="carreaux_layers"]').attr('disabled', false);
			$('#carreaux_revenus').attr('checked', true);
			this._visibleCarreauxLayer = 'carreaux_revenus';
		},
		calculateHeight: function(val, min, max) {
			return (this._heightsRange[1]-this._heightsRange[0]) * ((val - min)/(max-min)) + this._heightsRange[0];
		},
		getDataClassifier:function(data, colorsRange, property){
			let self = this;
			let color = d3.scaleQuantile().range(colorsRange);
			const numberOfClasses = color.range().length - 1;
			const jenksNaturalBreaks = GGO.jenks(data.features.map(d => d.properties[property]), numberOfClasses);
			console.log('numberOfClasses', numberOfClasses);
			console.log('jenksNaturalBreaks', jenksNaturalBreaks);

			// set the domain of the color scale based on our data
			color
				.domain(jenksNaturalBreaks);
			let breaks =  jenksNaturalBreaks.map(function(e,i){ console.log('i',i);console.log('e',e);return  [(e===null?0:e), colorsRange[i]];});
			//return color;
			var classif =  {
				property : property,
				classifier: color,
				breaks: breaks, 
				min: d3.min(data.features, function(d) { return d.properties[property]; }),
				max: d3.max(data.features, function(d) { return d.properties[property]; })
			};
			$.each(data.features, function(idx, val){
				val.properties['height_'+property] = self.calculateHeight(val.properties[property], classif.min, classif.max);
			});
			
			return classif;
		},
		buildDashboard: function(response){
			let carreaux5 = response.features.filter(function(e,i){
				return e.properties.bucket === 0;
			});
			let carreaux10 = response.features.filter(function(e,i){
				return e.properties.bucket === 1;
			});
			let carreaux15 = response.features.filter(function(e,i){
				return e.properties.bucket === 2;
			});
			let iso5 = this._isochrones.features.filter(function(e,i){
				return e.properties.bucket === 0;
			});
			let iso10 = this._isochrones.features.filter(function(e,i){
				return e.properties.bucket === 1;
			});
			let iso15 = this._isochrones.features.filter(function(e,i){
				return e.properties.bucket === 2;
			});
			let dataAnalysis = [{
					'label' : '5 min',
					'color' : '#2b83ba',
					'nb_carreaux'	 : carreaux5.length,
					'nb_men'		 : carreaux5.reduce((acc, carr) => acc + carr.properties.men, 0),
					'nb_men_prop'	 : carreaux5.reduce((acc, carr) => acc + carr.properties.men_prop, 0),
					'nb_age4'		 : carreaux5.reduce((acc, carr) => acc + carr.properties.age4, 0),
					'nb_age5'		 : carreaux5.reduce((acc, carr) => acc + carr.properties.age5, 0),
					'nb_age6'		 : carreaux5.reduce((acc, carr) => acc + carr.properties.age6, 0),
					'nb_age7'		 : carreaux5.reduce((acc, carr) => acc + carr.properties.age7, 0),
					'area_isochrone' : turf.area({type: "FeatureCollection", features: iso5})/1E6,
					'area_carreaux'  : turf.area({type: "FeatureCollection", features: carreaux5})/1E6
				},
				{
					'label' : '10 min',
					'color' : '#abdda4',
					'nb_carreaux'	 : carreaux10.length,
					'nb_men'		 : carreaux10.reduce((acc, carr) => acc + carr.properties.men, 0),
					'nb_men_prop'	 : carreaux10.reduce((acc, carr) => acc + carr.properties.men_prop, 0),
					'nb_age4'		 : carreaux10.reduce((acc, carr) => acc + carr.properties.age4, 0),
					'nb_age5'		 : carreaux10.reduce((acc, carr) => acc + carr.properties.age5, 0),
					'nb_age6'		 : carreaux10.reduce((acc, carr) => acc + carr.properties.age6, 0),
					'nb_age7'		 : carreaux10.reduce((acc, carr) => acc + carr.properties.age7, 0),
					'area_isochrone' : turf.area({type: "FeatureCollection", features: iso10})/1E6,
					'area_carreaux'  : turf.area({type: "FeatureCollection", features: carreaux10})/1E6
				},
				{
					'label' : '15 min',
					'color' : '#d7191c',
					'nb_carreaux'	 : carreaux15.length,
					'nb_men'		 : carreaux15.reduce((acc, carr) => acc + carr.properties.men, 0),
					'nb_men_prop'	 : carreaux15.reduce((acc, carr) => acc + carr.properties.men_prop, 0),
					'nb_age4'		 : carreaux15.reduce((acc, carr) => acc + carr.properties.age4, 0),
					'nb_age5'		 : carreaux15.reduce((acc, carr) => acc + carr.properties.age5, 0),
					'nb_age6'		 : carreaux15.reduce((acc, carr) => acc + carr.properties.age6, 0),
					'nb_age7'		 : carreaux15.reduce((acc, carr) => acc + carr.properties.age7, 0),
					'area_isochrone' : turf.area({type: "FeatureCollection", features: iso15})/1E6,
					'area_carreaux'  : turf.area({type: "FeatureCollection", features: carreaux15})/1E6
			}];
			let ctnr = $('analysis_panel');


			//this.buildAreaBarChart(dataAnalysis, '#area_barcharts');

			let detailsCtnr = $('#details_analysis').empty();
			var numberFormatterInt = Intl.NumberFormat('fr' ,{useGrouping: true, maximumFractionDigits:0});
			dataAnalysis.forEach(adata => {
				let dataDiv = $('<div class="slds-m-top_xx-small"></div>');
				let badge = $('<span class="slds-badge" style="background-color: '+adata.color+'; color: white;">'+adata.label+'</span>');
				let nv = $('<dl class="slds-list_horizontal slds-wrap slds-m-left_small"></div>');
				nv
					/*
					.append($('<dt class="slds-item_label slds-text-color_weak slds-truncate" style="width:50%;">Nb Carreaux:</dt>'))
					.append($('<dd class="slds-item_detail slds-truncate" style="width:50%;">'+adata.nb_carreaux+'</dd>'))
					*/
					.append($('<dt class="slds-item_label slds-text-color_weak slds-truncate" style="width:30%;">Surface:</dt>'))
					.append($('<dd class="slds-item_detail slds-truncate" style="width:70%;">'+ numberFormatterInt.format(adata.area_carreaux) +' km²</dd>'))
					.append($('<dt class="slds-item_label slds-text-color_weak slds-truncate" style="width:30%;"># Ménages:</dt>'))
					.append($('<dd class="slds-item_detail slds-truncate" style="width:70%;">'+ numberFormatterInt.format(adata.nb_men) +' (dont ' + numberFormatterInt.format(adata.nb_men_prop) + ' proprios)</dd>'))
					.append($('<dt class="slds-item_label slds-text-color_weak slds-truncate" style="width:30%;">Population:</dt>'))
					.append($('<dd class="slds-item_detail slds-truncate" style="width:70%;"></dd>')
						.append($('<dl class="slds-list_horizontal slds-wrap"></dl>')
							.append($('<dt class="slds-item_label slds-text-color_weak slds-truncate" style="width:50%;">11 à 14 ans</dt>'))
							.append($('<dd class="slds-item_detail slds-truncate" style="width:50%; text-align: right;">'+ numberFormatterInt.format(adata.nb_age4) +'</dd>'))
							.append($('<dt class="slds-item_label slds-text-color_weak slds-truncate" style="width:50%;">15 à 17 ans</dt>'))
							.append($('<dd class="slds-item_detail slds-truncate" style="width:50%; text-align: right;">'+ numberFormatterInt.format(adata.nb_age5) +'</dd>'))
							.append($('<dt class="slds-item_label slds-text-color_weak slds-truncate" style="width:50%;">25 ans et plus</dt>'))
							.append($('<dd class="slds-item_detail slds-truncate" style="width:50%; text-align: right;">'+ numberFormatterInt.format(adata.nb_age6) +'</dd>'))
							.append($('<dt class="slds-item_label slds-text-color_weak slds-truncate" style="width:50%;">65 ans et plus</dt>'))
							.append($('<dd class="slds-item_detail slds-truncate" style="width:50%; text-align: right;">'+ numberFormatterInt.format(adata.nb_age7) +'</dd>'))
						)
						/*
						.append($('<div></div>').text('11 à 14 ans: ' + numberFormatterInt.format(adata.nb_age4)))
						.append($('<div></div>').text('15 à 17 ans: ' + numberFormatterInt.format(adata.nb_age5)))
						.append($('<div></div>').text('25 ans et plus: ' + numberFormatterInt.format(adata.nb_age6)))
						.append($('<div></div>').text('65 ans et plus: ' + numberFormatterInt.format(adata.nb_age7)))
						*/
						)
					;
				dataDiv.append(badge).append(nv);


				detailsCtnr.append(dataDiv);
			});
			//$('#analysis_panel').removeClass('slds-hide');
			$('#slds-vertical-tabs-analytics__nav').trigger('click');
		},
		buildAreaBarChart: function(data_initial, divId){
			$(divId+' > svg').empty();
			var data= data_initial.reverse();
			var svg = d3.select(divId + '> svg'),
			    margin = {top: 10, right: 20, bottom: 30, left: 40},
			    width = +svg.attr("width") - margin.left - margin.right,
			    height = +svg.attr("height") - margin.top - margin.bottom,
			    g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			var x0 = d3.scaleBand()
			    .rangeRound([0, width])
			    .paddingInner(0.1);

			var x1 = d3.scaleBand()
			    .padding(0.05);

			var y = d3.scaleLinear()
			    .rangeRound([height, 0]);

			var z = d3.scaleOrdinal()
				.range(["#98abc5", "#ff8c00"]);
			    //.range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);

			/*
		    var nested = d3.nest().rollup(function(d) { 
		    	//console.log('rollup', d); 
		    	//delete d[0].label; 
		    	return d[0];}).key(function(d) {return d.label; }).entries(data);
			*/
		    //var keys = Object.keys(nested[0].value);//nested.map(function(d){ return d.key;});
		    var keys = ['area_isochrone', 'area_carreaux'];
		    x0.domain(data.map(function(d) { 
		    	return d.label; 
		    }));
			x1.domain(keys).rangeRound([0, x0.bandwidth()]);
			y.domain([0, d3.max(data, function(d) { 
				return d3.max(keys, function(key) { return d[key]; }); 
			})]).nice();

			  g.append("g")
			    .selectAll("g")
			    .data(data)
			    .enter().append("g")
					.attr("transform", function(d) { return "translate(" + x0(d.label) + ",0)"; })
			    .selectAll("rect")
			    .data(function(d) { return keys.map(function(key) { 
					return {key: key, value: d[key]}; }); 
				})
			    .enter().append("rect")
			      .attr("x", function(d) { 
			      	return x1(d.key); 
			      })
			      .attr("y", function(d) { 
			      	return y(d.value); 
			      })
			      .attr("width", x1.bandwidth())
			      .attr("height", function(d) { 
			      	return height - y(d.value); 
			      })
			      .attr("fill", function(d) { 
			      	return z(d.key); 
			      });
			      /*
			      .on("mousemove", function(d){
			      	console.log('mousemove bar ', d);
			      });
			      */

			  g.append("g")
			      .attr("class", "axis")
			      .attr("transform", "translate(0," + height + ")")
			      .call(d3.axisBottom(x0));

			  g.append("g")
			      .attr("class", "axis")
			      .call(d3.axisLeft(y).ticks(null, "s"))
			    .append("text")
			      .attr("x", 2)
			      .attr("y", y(y.ticks().pop()) + 0.5)
			      .attr("dy", "0.32em")
			      .attr("fill", "#000");
			      /*
			      .attr("font-weight", "bold")
			      .attr("text-anchor", "start")
			      .text("Population");
					*/
			  var legend = g.append("g")
			      .attr("font-family", "sans-serif")
			      .attr("font-size", 10)
			      .attr("text-anchor", "end")
			    .selectAll("g")
			    .data(keys.slice().reverse())
			    .enter().append("g")
			      .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

			  legend.append("rect")
			      .attr("x", width - 19)
			      .attr("width", 19)
			      .attr("height", 19)
			      .attr("fill", z);

			  legend.append("text")
			      .attr("x", width - 24)
			      .attr("y", 9.5)
			      .attr("dy", "0.32em")
			      .text(function(d) { return d.replace('area_', ''); });
		},
		buildAreaBarChart_: function(data, divId){
			$(divId).empty();
			var svg = d3.select(divId).append("svg");
			var axisLayer = svg.append("g").classed("axisLayer", true);
			var chartLayer = svg.append("g").classed("chartLayer", true);
			var xScale = d3.scaleBand();
			var xInScale = d3.scaleBand();
			var yScale = d3.scaleLinear();
			var color = d3.scaleOrdinal()
				.range(["#98abc5", "#ff8c00"]);

			var nested = d3.nest().rollup(function(d) { console.log('rollup', d); delete d[0].label; return d[0];}).key(function(d) {return d.label; }).entries(data);
			nested.forEach(function(d){
				d.area = Object.keys(d.value).map(function(key){
					return {key:key, value:d.value[key]}
				})
			});
			
			var width = 290, 
				height = 250;
			var margin = {top:10, left:50, bottom:40, right:10 };
			var chartWidth = width - (margin.left+margin.right);
			var chartHeight = height - (margin.top+margin.bottom)
			
			svg.attr("width", width).attr("height", height)
			
			axisLayer.attr("width", width).attr("height", height)
			
			chartLayer
				.attr("width", chartWidth)
				.attr("height", chartHeight)
				.attr("transform", "translate("+[margin.left, margin.top]+")");
				
			xScale.domain(nested.map(function(d) { return d.key }))
				.range([0, chartWidth]).paddingInner(0.1)

			var ageNames = Object.keys(nested[0].value);
			xInScale.domain(ageNames).range([0, xScale.bandwidth()])
		
			var yMax = d3.max(nested.map(function(d){
				var values = Object.keys(d.value).map(function(key){
					return d.value[key]
				})
				return d3.max(values)
			}));

			yScale.domain([0, yMax]).range([chartHeight, 0]);

			var yAxis = d3.axisLeft(yScale)
				.tickSizeInner(-chartWidth)
		
			axisLayer.append("g")
				.attr("transform", "translate("+[margin.left, margin.top]+")")
				.attr("class", "axis y")
				.call(yAxis);
				
			var xAxis = d3.axisBottom(xScale)
		
			axisLayer.append("g")
				.attr("class", "axis x")
				.attr("transform", "translate("+[margin.left, chartHeight]+")")
				.call(xAxis);

			var t = d3.transition()
				.duration(1000)
				.ease(d3.easeLinear);
		
			var contry = chartLayer.selectAll(".contry")
				.data(nested);
				
			var newCountry = contry.enter().append("g").attr("class", "contry")
			

			contry.merge(newCountry)
				.attr("transform", function(d) { return "translate(" + [xScale(d.key), 0] + ")"; });

			
			var bar = newCountry.selectAll(".bar")
				.data(function(d){ return d.area })

			var newBar = bar.enter().append("rect").attr("class", "bar")

							
			bar.merge(newBar)
				.attr("width", xInScale.bandwidth())
				.attr("height", 0)
				.attr("fill", function(d) { return color(d.key); })
				.attr("transform", function(d) { return "translate(" + [xInScale(d.key), chartHeight] + ")" })
		   bar.merge(newBar).transition(t)
				.attr("height", function(d) { return chartHeight - yScale(d.value); })
				.attr("transform", function(d) { return "translate(" + [xInScale(d.key), yScale(d.value)] + ")" })
		  
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
	};
})();