/* eslint-disable new-cap */

angular
  .module('icestudio')
  .controller(
    'MainCtrl',
    function ($scope, _package, gettextCatalog, common, gui, utils) {
      'use strict';

      $scope._package = _package;

      alertify.defaults.movable = false;
      alertify.defaults.closable = false;
      alertify.defaults.transition = 'fade';
      alertify.defaults.notifier.delay = 3;
      alertify.defaults.notifier.position = 'bottom-center';

      for (const item of ['alert', 'prompt', 'confirm']) {
        alertify.set(item, 'labels', {
          ok: gettextCatalog.getString('OK'),
          cancel: gettextCatalog.getString('Cancel'),
        });
      }

      if (_package.development) {
        gui.Window.get().showDevTools();
      }

      $(document).delegate(
        '.action-open-url-external-browser',
        'click',
        function (e) {
          e.preventDefault();
          utils.openUrlExternalBrowser($(this).prop('href'));
          return false;
        }
      );

      if (ICEpm) {
        ICEpm.setPluginDir(common.DEFAULT_PLUGIN_DIR, function () {});
      }

      console.log('ENV', common);
    }
  );
