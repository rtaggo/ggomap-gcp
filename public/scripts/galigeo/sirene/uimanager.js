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
			$('.data-panel-header i').click(function(e){
				$('.sirene-data-panel').toggleClass('sirene-data-panel-expanded');
				var dataPanelIsExpanded = $('.sirene-data-panel').hasClass('sirene-data-panel-expanded');
				var ic = dataPanelIsExpanded ?'expand_more':'expand_less';
				$(this).text(ic);
				var data2Send = {
					isExpanded: dataPanelIsExpanded
				};
				GGO.EventBus.dispatch('sirenedatapaneheightchanged', data2Send);

			});
		}
	};
})();