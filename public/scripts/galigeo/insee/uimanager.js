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
					//$('#search_btn').trigger('click');
				}
			});
			$('.ggo-vertical-tabs .slds-vertical-tabs__nav-item').click(function(e){
				var ariaCtrl = $(this).find('a').attr('aria-controls');
				var $contentToShow = $('#'+ariaCtrl);
					
				if ($(this).hasClass('slds-is-active')) {
					$(this).removeClass('slds-is-active');
					$(this).find('a').attr('aria-selected', false);
					$contentToShow.removeClass('slds-show');
					$contentToShow.addClass('slds-hide');
					//G4SFDC.EventBus.dispatch("leftPanelVisibilityChanged", {visible: false});
				} else {
					$(this).addClass('slds-is-active');
					$(this).find('a').attr('aria-selected', true);
					$contentToShow.removeClass('slds-hide');
					$contentToShow.addClass('slds-show');
					
					$(this).siblings().removeClass('slds-is-active');
					$(this).siblings().find('a').attr('aria-selected', false);
					$contentToShow.siblings('.slds-vertical-tabs__content').removeClass('slds-show');
					$contentToShow.siblings('.slds-vertical-tabs__content').addClass('slds-hide');
					//G4SFDC.EventBus.dispatch("leftPanelVisibilityChanged", {visible: true});
				}
			});

			$('.ggo-vertical-tabs .slds-vertical-tabs__content .slds-panel .slds-panel__close').click(function(e){
				var tabContent = $(this).parent().parent().parent();
				tabContent.removeClass('slds-show').addClass('slds-hide');
				var menuItem = $('#' + tabContent.attr('aria-labelledby'));
				menuItem.attr('aria-selected', false);
				menuItem.parent().removeClass('slds-is-active');
				//G4SFDC.EventBus.dispatch("leftPanelVisibilityChanged", {visible: false});
			});
			$('#analysis_panel .slds-panel__close').click(function(e){
				$('#analysis_panel').addClass('slds-hide');
			});
		}
	};
})();