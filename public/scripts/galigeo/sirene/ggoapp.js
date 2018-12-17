(function() {
	'use strict';
	GGO.GGOApp = function(options) {
		this._options = options || {};
		this._options.searchsireneurl = '/sirene'
		this.init();
	};

	GGO.GGOApp.prototype = {
		init: function() {
			var modulesOptions = {
				app: this
			};
			this._mapManager = new GGO.MapManager(modulesOptions);
		},
	};
})();
