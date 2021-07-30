/* eslint-disable new-cap */

angular
  .module('icestudio')
  .controller(
    'MainCtrl',
    function ($scope, gettextCatalog, common, utils, _package) {
      'use strict';

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

      $scope.version_str = `${_package.version}-g${_package.sha}`;
      $scope.version_url = `https://github.com/juanmard/icestudio${
        _package.sha != '00000000' ? '/commit/' + _package.sha : ''
      }`;

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

      console.log('[common]', common);
    }
  );
