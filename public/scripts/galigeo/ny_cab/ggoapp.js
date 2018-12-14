(function() {
	'use strict';
	GGO.GGOApp = function(options) {
		this._options = options || {};
		this._options.nyyellowcaburl = '/nyyellowcabs'
		this.init();
	};

	GGO.GGOApp.prototype = {
		init: function() {
			var modulesOptions = {
				app: this
			};
			this._mapManager = new GGO.MapManager(modulesOptions);
			this.fetchYellowCabStats();
		},
		fetchYellowCabStats : function(){
			var self = this;
			$.ajax({
				type: 'GET',
				url: self._options.nyyellowcaburl,
				success: function(data) {
					console.log(' Cab Zone Response : ', data);
					self.handleCabZonesResponse(data);

				},
				error:  function(jqXHR, textStatus, errorThrown) { 
					if (textStatus === 'abort') {
						console.warn('Cab Zone request aborted');
					} else {
						console.error('Error for Bike Stations request: ' + textStatus, errorThrown);
					}
				}
			});
		},
		handleCabZonesResponse: function(response) {
			this._mapManager.setCabZoneData(response);
		}
		/*
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
		*/
	};
})();
