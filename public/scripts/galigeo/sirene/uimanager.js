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
				var searchInput = $('#search_term');
				var sTerm = searchInput.val().trim();
				if (sTerm === '') {
					searchInput.parent().parent().addClass('slds-has-error');
					searchInput.parent().parent().find('.slds-form-element__help').removeClass('slds-hide');
					return;
				} else {
					searchInput.parent().parent().removeClass('slds-has-error');
					searchInput.parent().parent().find('.slds-form-element__help').addClass('slds-hide');
				}
				console.log(`Do search for '${sTerm}' in class ${classeSirene}` );
				var data2Send = {
					searchTerm: sTerm
				};
				GGO.EventBus.dispatch(GGO.EVENTS.DOSIRENESEARCH, data2Send);
			});
			/*
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
			*/
			$('#minimizeExpandRecordsDockerBtn').click(function(e){
				var docker = $('#recordsDocker');
				var iconPath = '/styles/slds/assets/icons/utility-sprite/svg/symbols.svg#chevrondown';
				if (docker.hasClass('slds-is-open')) {
					docker.removeClass('slds-is-open');
					iconPath = '/styles/slds/assets/icons/utility-sprite/svg/symbols.svg#chevronup';
				} else {
					docker.addClass('slds-is-open');
				}
				$(this).find('use').attr('xlink:href', iconPath);
				var data2Send = {
					isExpanded: docker.hasClass('slds-is-open')
				};
				GGO.EventBus.dispatch('sirenedatapaneheightchanged', data2Send);
			});
		}
	};
})();