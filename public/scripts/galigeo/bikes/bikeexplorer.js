(function() {
	'use strict';
	GGO.BikeExplorer = function(options){
		this._options = options || {};
		this._options.bikestationsurl = '/bikestations';
		this._setupListeners();
	};

	GGO.BikeExplorer.prototype = {
		_setupListeners: function(){
			var self = this;
			GGO.EventBus.addEventListener(GGO.EVENTS.APPISREDAY, function(e) {
				console.log('Bike Explorer recevied GGO.EVENTS.APPISREDAY event');
				self.fetchBikeStations();
			});
		},
		fetchBikeStations: function(){
			var self = this;
			$.ajax({
				type: 'GET',
				url: self._options.bikestationsurl,
				success: function(data) {
					console.log(' Bike Stations Response : ', data);
					self._options.app.setBikeStation(data);

				},
				error:  function(jqXHR, textStatus, errorThrown) { 
					if (textStatus === 'abort') {
						console.warn('Bike Stations request aborted');
					} else {
						console.error('Error for Bike Stations request: ' + textStatus, errorThrown);
					}
				}
			});
		},
		fetchStationOutgoing: function(stationId){
			var self = this;
			$.ajax({
				type: 'GET',
				url: self._options.bikestationsurl+'/tripsout/'+stationId,
				success: function(data) {
					console.log('Outgoing Stations Response : ', data);
					self._options.app.setOutGoingData(data);

				},
				error:  function(jqXHR, textStatus, errorThrown) { 
					if (textStatus === 'abort') {
						console.warn('Bike Stations request aborted');
					} else {
						console.error('Error for Bike Stations request: ' + textStatus, errorThrown);
					}
				}
			});
		},
		fetchStationIncoming: function(stationId){
			var self = this;
			$.ajax({
				type: 'GET',
				url: self._options.bikestationsurl+'/tripsin/'+stationId,
				success: function(data) {
					console.log('Incoming Stations Response : ', data);
					self._options.app.setIncomingData(data);

				},
				error:  function(jqXHR, textStatus, errorThrown) { 
					if (textStatus === 'abort') {
						console.warn('Bike Stations request aborted');
					} else {
						console.error('Error for Bike Stations request: ' + textStatus, errorThrown);
					}
				}
			});
		}

	};
})();