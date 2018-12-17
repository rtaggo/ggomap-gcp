(function() {
	'use strict';
	GGO.UIManager = function(options){
		this._options = options || {};
		this.init();
	};

	GGO.UIManager.prototype = {
		init:function() {
			this.setupListeners();
		}, 
		setupListeners: function() {
			$('#search_btn').click(function(){
				console.log('Clicked on search button');
				var classeSirene = $('#sirene-class-select').val();
				var sTerm = $('#search_term').val();
				console.log(`Do search for '${sTerm}' in class ${classeSirene}` );
				var data2Send = {
					searchTerm: sTerm
				};
				GGO.EventBus.dispatch(GGO.EVENTS.DOSIRENESEARCH, data2Send);
			});
		}
	};
})();