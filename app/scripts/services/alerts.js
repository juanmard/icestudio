angular.module('icestudio').service('alerts', function ($log, gettextCatalog) {
  'use strict';

  const _tcStr = function (str, args) {
    return gettextCatalog.getString(str, args);
  };

  this.alert = function (opts) {
    /* Options
        body             string or DOM element
        closable         boolean
        closableByDimmer boolean
        icon             string
        invokeOnCloseOff boolean
        label            string
        onok             function
        title            string
      */

    $log.debug('[srv.alerts.alert] opts:', opts);
    if (!opts.title) {
      opts.title = 'Empty title!';
    }
    if (!opts.icon) {
      opts.icon = 'warning';
    }
    if (!opts.body) {
      opts.body = '<b><i>Empty body</i></b>';
    }
    if (!opts.onok) {
      opts.onok = function () {};
    }
    if (!opts.label) {
      opts.label = _tcStr('Close');
    }
    if (opts.closable === undefined) {
      opts.closable = true;
    }
    if (opts.closableByDimmer === undefined) {
      opts.closableByDimmer = true;
    }
    if (opts.invokeOnCloseOff === undefined) {
      opts.invokeOnCloseOff = true;
    }
    alertify
      .alert(
        `<i class="fa fa-fw fa-${opts.icon}" aria-hidden="true"></i> ` +
          opts.title,
        opts.body,
        opts.onok
      )
      .setting({
        autoReset: true,
        basic: false,
        closable: opts.closable,
        closableByDimmer: opts.closableByDimmer,
        frameless: false,
        // For some reason, the logic of invokeOnCloseOff seems to be inverted, compared to 'confirm'.
        invokeOnCloseOff: !opts.invokeOnCloseOff,
        label: opts.label,
        maximizable: false,
        modal: true,
        movable: false,
        padding: false,
        pinnable: false,
        resizable: false,
        startMaximized: false,
      });
  };

  this.confirm = function (opts) {
    /* Options
          body             string or DOM element
          closable         boolean
          closableByDimmer boolean
          icon             string
          invokeOnCloseOff boolean
          labels           object
          oncancel         function
          onok             function
          title            string
        */

    $log.debug('[srv.alerts.confirm] opts:', opts);
    if (!opts.title) {
      opts.title = 'Empty title!';
    }
    if (!opts.icon) {
      opts.icon = 'warning';
    }
    if (!opts.body) {
      opts.body = '<b><i>Empty body</i></b>';
    }
    if (!opts.onok) {
      opts.onok = function () {};
    }
    if (!opts.oncancel) {
      opts.oncancel = function () {};
    }
    if (!opts.labels) {
      opts.labels = {
        ok: _tcStr('Ok'),
        cancel: _tcStr('Cancel'),
      };
    }
    if (opts.closable === undefined) {
      opts.closable = true;
    }
    if (opts.closableByDimmer === undefined) {
      opts.closableByDimmer = true;
    }
    if (opts.invokeOnCloseOff === undefined) {
      opts.invokeOnCloseOff = false;
    }
    alertify
      .confirm(
        `<i class="fa fa-fw fa-${opts.icon}" aria-hidden="true"></i> ${opts.title}`,
        opts.body,
        opts.onok,
        opts.oncancel
      )
      .setting({
        autoReset: true,
        basic: false,
        closable: opts.closable,
        closableByDimmer: opts.closableByDimmer,
        frameless: false,
        invokeOnCloseOff: opts.invokeOnCloseOff,
        labels: opts.labels,
        maximizable: false,
        modal: true,
        movable: false,
        padding: false,
        pinnable: false,
        resizable: false,
        startMaximized: false,
      });
  };
});
