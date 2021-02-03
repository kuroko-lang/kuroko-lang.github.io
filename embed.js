async function callScripts(tags) {
  for (var i = 0; i < tags.length; i++) {
    if (tags[i].src) {
      await fetch(tags[i].src)
        .then(r=>r.blob())
        .then(r=>r.text())
        .then(r=>krk_call(r));
    } else {
      await krk_call(tags[i].innerText);
    }
  }
}

var Module = {
  preRun: [function() {
    FS.mkdir('/usr');
    FS.mkdir('/usr/local');
    FS.mkdir('/usr/local/lib');
    FS.mkdir('/usr/local/lib/kuroko');
    FS.mkdir('/usr/local/lib/kuroko/syntax');
    const modules = ["help.krk","collections.krk","json.krk","string.krk","web.krk"];
    for (const i in modules) {
      FS.createPreloadedFile('/usr/local/lib/kuroko', modules[i], "res/" + modules[i], 1, 0)
    }
    FS.createPreloadedFile('/usr/local/lib/kuroko/syntax', '__init__.krk', 'res/init.krk', 1, 0);
    FS.createPreloadedFile('/usr/local/lib/kuroko/syntax', 'highlighter.krk', 'res/highlighter.krk', 1, 0);
  }],
  postRun: [function() {
    krk_call = Module.cwrap('krk_call', 'string', ['string']);
    krk_call('from js import JSObject, exec');
    krk_call('let console, window, document = JSObject("console"), JSObject("window"), JSObject("document")');
    callScripts(document.querySelectorAll("script[type='text/x-kuroko']"));
  }]
}


