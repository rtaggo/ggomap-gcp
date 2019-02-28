(function() {
	'use strict';
	GGO.GGOApp = function(options) {
		this._options = options || {};
		this.init();
	};

	GGO.GGOApp.prototype = {
		init: function() {
			var modulesOptions = {
				app: this
			};
			this._uiManager = new GGO.UIManager(modulesOptions);
			this._geoserviceManager = new GGO.GeoServiceManager(modulesOptions);
			this._posAnalyzer = new GGO.PoSAnalyzer(modulesOptions);
			this._mapManager = new GGO.MapManager(modulesOptions);
		},
		fetchFeatures: function(params) {
			this._posAnalyzer.fetchFeatures(params);
		},
		setFeatures: function(response) {
			this._mapManager.setFeatures(response);
			this.displayNotifyer(response);
		},
		displayNotifyer: function(response) {
			let ctnr = $('#notifierContainer').empty();
			ctnr
				.append($('<div class="slds-notify slds-notify_toast slds-theme_success" role="status"></div>')
					.append($('<div class="slds-notify__content"></div>')
						.append($('<h2 class="slds-text-heading_small">Chargement de la couche ' + response.layername + ' terminée. ' + response.geojson.features.length + ' élément(s) récupéré(s).</h2>')))
				);
			ctnr.removeClass('slds-hide');
			setTimeout(function(){ 
				 $('#notifierContainer').empty().addClass('slds-hide');
			}, 4000);
		},
		getMap: function() {
			return this._mapManager.getMap();
		}
	};

	GGO.EVENTS = $.extend({
			MAPISLOADED: "mapisloaded"
		}, 
		GGO.EVENT); 
})();
