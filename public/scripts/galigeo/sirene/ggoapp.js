(function() {
	'use strict';
	GGO.GGOApp = function(options) {
		this._options = options || {};
		this._searchTerm = null;
		this.init();
	};

	GGO.GGOApp.prototype = {
		init: function() {
			var modulesOptions = {
				app: this
			};
			this._uiManager = new GGO.UIManager(modulesOptions);
			this._mapManager = new GGO.MapManager(modulesOptions);
			this._sireneExplorer = new GGO.SireneExplorer(modulesOptions);
			this._posAnalyzer = new GGO.POSAnalyzer(modulesOptions);
		},
		setSearchResponse: function(response, searchTerm) {
			this._searchTerm = searchTerm;
			this._mapManager.setSearchResponse(response);
		},
		getSearchText: function() {
			return this._searchTerm;
		},
		getMap: function() {
			return this._mapManager.getMap();
		}
	};
})();
