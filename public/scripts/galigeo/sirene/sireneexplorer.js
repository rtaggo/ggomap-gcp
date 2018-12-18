(function() {
	'use strict';
	GGO.SireneExplorer = function(options){
		this._options = options || {};
		this._options.searchsireneurl = '/sirene/search'
		this.init();
	};

	GGO.SireneExplorer.prototype = {
		init:function() {
			this.setupListeners();
		}, 
		setupListeners: function() {
			var self = this;
			GGO.EventBus.addEventListener(GGO.EVENTS.DOSIRENESEARCH, function(e) {
				var data = e.target;
				console.log('Sirene Explorer recevied GGO.EVENTS.DOSIRENESEARCH event', data);
				self._doSearch(data.searchTerm);
			});
		},
		_doSearch: function(searchTerm) {
			var self = this;
			var sUrl = self._options.searchsireneurl + '?searchTerm='+searchTerm;			
			$.ajax({
				type: 'GET',
				url: sUrl,
				success: function(data) {
					console.log('SIRENE Search Response : ', data);
					self._options.app.setSearchResponse(data);
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