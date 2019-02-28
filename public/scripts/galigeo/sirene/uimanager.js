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
			$(document).keypress(function(e) {
				if(e.which == 13) {
					$('#search_btn').trigger('click');
				}
			});
			$('#search_btn').click(function(){
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
				$('#search-infos').addClass('slds-hide');
				$('#search-spinner').removeClass('slds-hide');
				GGO.EventBus.dispatch(GGO.EVENTS.DOSIRENESEARCH, data2Send);
			});
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
			GGO.EventBus.addEventListener(GGO.EVENTS.SIRENESEARCHCOMPLETED, function(e) {
				$('#search-spinner').addClass('slds-hide');
				$('#search-infos').removeClass('slds-hide');
			});

			$('#left-panel-div__body .slds-tabs_default__item').click(function(e){
				var ariaCtrl = $(this).find('a').attr('aria-controls');
				var $contentToShow = $('#'+ariaCtrl);

				$(this).addClass('slds-is-active');
				$(this).find('a').attr('aria-selected', true);
				$contentToShow.removeClass('slds-hide');
				$contentToShow.addClass('slds-show');
				
				$(this).siblings().removeClass('slds-is-active');
				$(this).siblings().find('a').attr('aria-selected', false);
				$contentToShow.siblings('.slds-tabs_default__content').removeClass('slds-show');
				$contentToShow.siblings('.slds-tabs_default__content').addClass('slds-hide');
			});
		}
	};
})();