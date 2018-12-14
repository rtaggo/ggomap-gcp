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
			this._mapManager = new GGO.MapManager(modulesOptions);
			this._bikeExplorer = new GGO.BikeExplorer(modulesOptions);
			this._bikeExplorer.fetchBikeStations();
		},
		setBikeStation: function(data){
			this._mapManager.setBikeStation(data);
		},
		fetchStationOutgoing: function(stationId){
			this._bikeExplorer.fetchStationOutgoing(stationId);
		},
		fetchStationIncoming: function(stationId){
			this._bikeExplorer.fetchStationIncoming(stationId);
		},
		setOutGoingData: function(data) {
			this._mapManager.setOutGoingData(data);
		},
		setIncomingData: function(data) {
			this._mapManager.setIncomingData(data);
		}
	};
})();
