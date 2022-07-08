var krk_call;
var Module = {
  preRun: [function() {
    const fs = { usr: { local: { lib: { kuroko: {
      syntax: {
        '__init__.krk': 1,
        'highlighter.krk': 1,
      },
      foo: {
        bar: {
          '__init__.krk': 1,
          'baz.krk': 1,
        },
        '__init__.krk': 1,
      },
      'help.krk': 1,
      'collections.krk': 1,
      'json.krk': 1,
      'string.krk': 1,
      'web.krk': 1,
      'dummy.krk': 1,
      'emscripten.krk': 1,
    }}}}};

    function processFiles(node, parent) {
      for (const [key, value] of Object.entries(node)) {
        if (value === 1) {
          FS.createPreloadedFile(parent, key, '/res/' + key, 1, 0);
        } else {
          const path = parent + '/' + key;
          FS.mkdir(path);
          processFiles(value, path);
        }
      }
    }
    processFiles(fs, '/');
  }],
  postRun: [function() {
    /* Bind krk_call */
    krk_call = Module.cwrap('krk_call', 'string', ['string']);
    krk_call('from js import document, window');
    const scripts = document.querySelectorAll('script[type="text/kuroko"]');
    scripts.forEach(node => {
      krk_call(node.textContent);
    });
  }],

  print: function(text) {
    if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
    console.log(text);
  },
  printErr: function(text) {
    if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
    console.error(text);
  }
}


