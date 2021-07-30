/* eslint-disable no-unused-vars */

var ICEpm = new (function () {
  'use strict';

  this.pluginDir = false;
  this.pluginUri = false;
  this.env = false;
  this.plugins = {};

  this.ebus = new (function () {
    this.events = {};
    this.subscribe = function (event, callback, target) {
      if (typeof this.events[event] === 'undefined') {
        this.events[event] = [];
      }
      if (typeof target === 'undefined') {
        target = false;
      }
      this.events[event].push({
        target: target,
        callback: callback,
      });
    };

    this.fire = function (event, args) {
      if (typeof this.events[event] !== 'undefined') {
        for (let i = this.events[event].length - 1, n = -1; i > n; i--) {
          if (this.events[event][i].target === false) {
            this.events[event][i].callback(args);
          } else {
            this.events[event][i].target[this.events[event][i].callback](args);
          }
        }
      }
    };

    this.version = function () {
      console.log('Icestudio event bus');
    };

    this.init = function () {
      this.version();
    };

    this.init();
  })();

  this.tpl = new (function () {
    this.render = function (template, view) {
      Mustache.parse(template);
      let r = Mustache.render(template, view);
      return r;
    };
  })();

  this.parametric = new (function () {
    'use strict';

    this.pair = function (A, B) {
      if (A.length !== B.length) {
        return false;
      }
      let paired = [];
      for (let i = 0; i < A.length; i++) {
        paired.push({
          source: {
            id: A[i].id,
            port: A[i].name,
          },
          target: {
            id: B[i].id,
            port: B[i].name,
          },
        });
      }
      return paired;
    };
    this.place = function (block, x, y, x0, y0, w, h, padw, padh) {
      if (typeof block.position === 'undefined') {
        block.position = {x: 0, y: 0};
      }
      w = w + padw;
      h = h + padh;
      block.position.x = x * w + x0;
      block.position.y = y * h + y0;

      return block;
    };
    this.newId = function (prefix) {
      const nodeSha1 = require('sha1');

      if (typeof prefix === 'undefined') {
        prefix = '';
      }
      return nodeSha1(
        prefix + new Date().getTime() + Math.floor(Math.random() * 1000)
      ).toString();
    };

    this.pins = function (n, prefix) {
      if (typeof prefix === 'undefined') {
        prefix = 'pin';
      }
      let group = [];
      for (let i = 0; i < n; i++) {
        group.push({
          id: this.newId(i),
          lastnode: false,
          index: i,
          name: prefix + i,
        });
      }
      if (group.length > 0) {
        group[group.length - 1].lastnode = true;
      }
      return group;
    };

    this.inout = function (n, direction, xi, yi) {
      if (typeof xi === 'undefined') {
        xi = 64;
      }
      if (typeof yi === 'undefined') {
        yi = 80;
      }
      if (typeof direction === 'undefined') {
        direction = 'in';
      }
      let diffy = 80;
      let diffx = 0;
      const nodeSha1 = require('sha1');
      let group = [];
      for (let i = 0; i < n; i++) {
        group.push({
          id: nodeSha1(
            i + new Date().getTime() + Math.floor(Math.random() * 1000)
          ).toString(),
          lastnode: false,
          index: i,
          name: direction,
          x: xi,

          y: yi,
        });
        xi += diffx;
        yi += diffy;
      }
      if (group.length > 0) {
        group[group.length - 1].lastnode = true;
      }
      return group;
    };
  })();

  this.toload = 0;
  this.onload = false;

  this.version = function () {
    console.log('Icestudio Plugin Manager v0.1');
  };

  this.setEnvironment = function (common) {
    this.env = common;
  };

  this.setPluginDir = function (dir, callback) {
    this.pluginDir = dir;
    this.pluginUri = dir.substr(dir.indexOf('.'));
    this.load(callback);
  };

  this.isFactory = function (name) {
    return (
      this.plugins[name] !== undefined &&
      this.plugins[name].manifest.type === 'factory'
    );
  };

  this.runFactory = function (name, str, params, callback) {
    let b = JSON.parse(this.plugins[name].factory(str, params));
    callback(b ? b : false);
  };

  this.promptFactory = function (name, str, callback) {
    //get the closable setting value.
    let _currentFactory = this.plugins[name];
    let excel = false;
    let _this = this;
    alertify
      .alert()
      .setting({
        label: 'Generate',
        modal: true,
        movable: true,
        maximizable: true,
        message:
          '<div class="icepm-params-desc" style="margin-bottom:20px;"><p>Configure your parametric block:</p></div><div id="icepm-params-table"></div>',
        onok: function () {
          let p = excel.getData();
          excel.destroy(true);
          _this.runFactory(name, str, p, callback);
          // alertify.success('Parametric block ready');
        },
        onshow: function () {
          $('#icepm-params-table').empty();
          excel = jexcel(
            document.getElementById('icepm-params-table'),
            _currentFactory.params
          );
        },
      })
      .show();
  };

  this.factory = function (name, str, callback) {
    if (!this.isFactory(name)) {
      callback(false);
      return;
    }
    if (this.plugins[name].factory === undefined) {
      const fs = require('fs');
      let contents = fs.readFileSync(
        this.pluginDir + '/' + name + '/main.js',
        'utf8'
      );
      /* function ab2str(buf) {
                  return String.fromCharCode.apply(null, new Uint16Array(buf));
              }*/
      //let code=ab2str(contents);
      eval(contents);
    }
    this.promptFactory(name, str, callback);
  };

  this.paramsFactory = function (name, paramsDef) {
    if (!this.isFactory(name)) {
      return false;
    }
    this.plugins[name].params = paramsDef;
  };

  this.registerFactory = function (name, callback) {
    if (!this.isFactory(name)) {
      return false;
    }
    this.plugins[name].factory = callback;
  };

  this.load = function (callback) {
    if (this.pluginDir === false) {
      return false;
    }

    this.onload = true;
    const fs = require('fs');

    fs.readdir(
      this.pluginDir,
      function (err, files) {
        this.toload = files.length;
        files.forEach(
          function (file) {
            fs.readFile(
              this.pluginDir + '/' + file + '/manifest.json',
              'utf8',
              function (err, contents) {
                let mf = JSON.parse(contents);
                if (mf !== false) {
                  this.plugins[file] = {
                    dir: file,
                    manifest: mf,
                  };
                }
                this.toload--;
                if (this.toload === 0) {
                  this.onload = false;
                  if (typeof callback !== 'undefined') {
                    callback();
                  }
                }
              }.bind(this)
            );
          }.bind(this)
        );
      }.bind(this)
    );
  };

  this.getAll = function () {
    return this.plugins;
  };
  this.getBaseUri = function () {
    return this.pluginUri;
  };

  this.getById = function (id) {
    if (typeof this.plugins[id] === 'undefined') {
      return false;
    }

    return this.plugins[id];
  };

  this.run = function (id) {
    let plug = this.getById(id);

    if (plug === false) {
      return false;
    }
    let _this = this;
    nw.Window.open(
      this.pluginUri + '/' + id + '/index.html',
      {},
      function (newWin) {
        if (typeof plug.manifest.width !== 'undefined') {
          newWin.width = plug.manifest.width;
        }
        if (typeof plug.manifest.height !== 'undefined') {
          newWin.height = plug.manifest.height;
        }
        newWin.focus();
        // Listen to main window's close event
        newWin.on('close', function () {
          if (typeof this.window.onClose !== 'undefined') {
            this.window.onClose();
          }

          this.close(true);
        });

        newWin.on('loaded', function () {
          let filter = [
            'WIN32',
            'LINUX',
            'DARWIN',
            'VERSION',
            'LOGFILE',
            'BUILD_DIR',
          ];
          let envFiltered = {};
          for (let prop in _this.env) {
            if (filter.indexOf(prop) > -1) {
              envFiltered[prop] = _this.env[prop];
            }
          }
          // this.window.postMessage({type:'ice-plugin-message', env:env_filtered});

          if (typeof this.window.onLoad !== 'undefined') {
            this.window.onLoad(envFiltered);
          }
        });
      }
    );
  };

  this.init = function () {
    this.version();
  };

  this.init();
})();
