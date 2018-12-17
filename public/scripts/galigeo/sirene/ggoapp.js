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
			this._mapManager = new GGO.MapManager(modulesOptions);
			this._sireneExplorer = new GGO.SireneExplorer(modulesOptions);
		},
		setSearchResponse: function(response) {
			this._mapManager.setSearchResponse(response);
		}
	};
})();
