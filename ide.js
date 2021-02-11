var krk_call;
var currentEditor;
var extraEditor;
var consoleEnabled = false;
var codeSamples = {
  helloworld: "print('Hello, world!')",
  variables: "let a, b, c = 1, 2.0, 'three'\nprint(a,b,c)",
  classes: "class Foo(object):\n  def __init__(self):\n    self.bar = 'baz'\n  def frob(self):\n    print(self.bar)\n\nlet foo = Foo()\nfoo.frob()",
  comprehensions: "let lst = [x * 5 for x in range(10)]\nlet dct = {str(x): x for x in lst}\nprint(lst)\nprint(dct)",
  tutorialsource: "import js; js.exec(\"fetch('/res/web.krk').then(r=>{return r.text();}).then(t=>{currentEditor.setValue(t,1);});\")",
  loadgist: "import js; js.exec(\"fetch('https://gist.githubusercontent.com/klange/396982d00e8fbff80fe6529d47e31e35/raw/').then(r=>{return r.text();}).then(t=>{currentEditor.setValue(t,1);});\")",
  clear: "import js; js.exec('document.getElementById(\"container\").innerHTML = \"\";')"
};
document.getElementById("container").innerText = "";
function runCode(editor) {
  var value = editor.getValue();
  window.setTimeout(function() {
    result = krk_call(value);
    if (result != "") {
      /* If krk_call gave us a result that wasn't empty, add new repl output node. */
      let newOutput = document.createElement("pre");
      newOutput.className = "repl";
      newOutput.appendChild(document.createTextNode(' => ' + result));
      document.getElementById("container").appendChild(newOutput);
      document.getElementById("extra-editor").scrollIntoView(false);
    }
  }, 50);
}

function saveFile(editor) {
  var link = document.createElement('a');
  link.setAttribute('href', 'data:application/x-kuroko;charset=utf-8,' + encodeURIComponent(editor.getValue()));
  link.setAttribute('download', 'source.krk');
  link.click();
}

function openFile(fromInput) {
  var file = fromInput.files[0];
  var reader = new FileReader();
  reader.onload = function(e) {
    currentEditor.setValue(reader.result,1);
  };
  reader.readAsText(file);
}

function createEditor() {
  let newDiv = document.createElement("div");
  newDiv.className = "editor";
  document.getElementById("editor").appendChild(newDiv);
  const editor = ace.edit(newDiv, {
    useSoftTabs: true,
    wrap: true,
    maxLines: Infinity
  });
  editor.setTheme("ace/theme/sunsmoke");
  editor.setBehavioursEnabled(false);
  editor.session.setMode("ace/mode/kuroko");
  editor.commands.bindKey("Shift-Return", function (editor) { runCode(editor); });
  return editor;
}

var codeHistory = [];
var historySpot = 0;
function enterCallback(editor) {
  var value = editor.getValue();
  if ((value.endsWith(":") || value.endsWith("\\")) || (value.split("\n").length > 1 && value.replace(/.*\n */g,"").length > 0)) {
    editor.insert("\n");
    return;
  }
  var value = editor.getValue();
  if (!codeHistory.length || codeHistory[codeHistory.length-1] != value) {
    codeHistory.push(value);
  }
  historySpot = codeHistory.length;
  runCode(editor);
  editor.setValue('',1);
}
function historyBackIfOneLine(editor) {
  var value = editor.getValue();
  if (value.split("\n").length == 1 && codeHistory.length > 0) {
    editor.setValue(codeHistory[historySpot-1],1);
    historySpot--;
    if (historySpot == 0) historySpot = 1;
  } else {
    var current = editor.getCursorPosition();
    editor.moveCursorTo(current.row - 1, current.column, true);
  }
}

function historyForwardIfOneLine(editor) {
  var value = editor.getValue();
  if (value.split("\n").length == 1 && codeHistory.length > 0) {
    if (historySpot == codeHistory.length) {
      editor.setValue('',1);
    } else {
      editor.setValue(codeHistory[historySpot],1);
      historySpot++;
    }
  } else {
    var current = editor.getCursorPosition();
    editor.moveCursorTo(current.row + 1, current.column, true);
  }
}
function createExtraEditor() {
  let newDiv = document.createElement("div");
  newDiv.className = "editor";
  document.getElementById("extra-editor").appendChild(newDiv);
  const editor = ace.edit(newDiv, {
    minLines: 1,
    maxLines: 1000,
    highlightActiveLine: false,
    showPrintMargin: false,
    useSoftTabs: true,
    indentedSoftWrap: false,
    showGutter: false,
    wrap: true
  });
  editor.setTheme("ace/theme/sunsmoke");
  editor.setBehavioursEnabled(false);
  editor.session.setMode("ace/mode/kuroko");
  editor.commands.bindKey("Return", enterCallback);
  editor.commands.bindKey("Up", historyBackIfOneLine);
  editor.commands.bindKey("Down", historyForwardIfOneLine);
  return editor;
}

function addText(mode, text) {
  let newOutput = document.createElement("pre");
  newOutput.className = mode;
  newOutput.appendChild(document.createTextNode(text));
  if (!text.length) newOutput.appendChild(document.createElement("wbr"));
  document.getElementById("container").appendChild(newOutput);
  document.getElementById("extra-editor").scrollIntoView(false);
}

function insertCode(code, runIt=true) {
  currentEditor.setValue(code,1);
  if (runIt) {
    window.setTimeout(function() { runCode(currentEditor); }, 100);
  }
  return false;
}

var Module = {
  preRun: [function() {
    FS.mkdir('/usr');
    FS.mkdir('/usr/local');
    FS.mkdir('/usr/local/lib');
    FS.mkdir('/usr/local/lib/kuroko');
    FS.mkdir('/usr/local/lib/kuroko/syntax');
    FS.mkdir('/usr/local/lib/kuroko/foo');
    FS.mkdir('/usr/local/lib/kuroko/foo/bar');

    /* Load source modules from web server */
    const modules = ["help.krk","collections.krk","json.krk","string.krk","web.krk","dummy.krk"];
    for (const i in modules) {
      FS.createPreloadedFile('/usr/local/lib/kuroko', modules[i], "/res/" + modules[i], 1, 0)
    }
    FS.createPreloadedFile('/usr/local/lib/kuroko/syntax', '__init__.krk', '/res/init.krk', 1, 0)
    FS.createPreloadedFile('/usr/local/lib/kuroko/syntax', 'highlighter.krk', '/res/highlighter.krk', 1, 0)
    FS.createPreloadedFile('/usr/local/lib/kuroko/foo', '__init__.krk', '/res/init.krk', 1, 0)
    FS.createPreloadedFile('/usr/local/lib/kuroko/foo/bar', '__init__.krk', '/res/init.krk', 1, 0)
    FS.createPreloadedFile('/usr/local/lib/kuroko/foo/bar', 'baz.krk', '/res/baz.krk', 1, 0)
  }],
  postRun: [function() {
    /* Bind krk_call */
    krk_call = Module.cwrap('krk_call', 'string', ['string']);

    /* Print some startup text. */
    krk_call("import kuroko\nprint('Kuroko',kuroko.version,kuroko.builddate,'(wasm)')\nkuroko.set_clean_output(True)\n");

    /* Start the first repl line editor */
    currentEditor = createEditor();
    extraEditor = createExtraEditor();

    var pathElements = window.location.pathname.split('/');
    if (pathElements.length > 1) {
      var finalUrl = null;
      if (pathElements[1] == 'gist') {
        /* Try to load from gist */
        var rest = pathElements.slice(2);
        var finalUrl = 'https://gist.githubusercontent.com/'
        if (rest.length == 2) finalUrl += rest.join('/') + '/raw/';
        else finalUrl += rest.join('/');
      } else if (pathElements[1] == 'github' || pathElements[1] == 'gh') {
        var rest = pathElements.slice(2);
        if (rest[2] == 'blob') rest.splice(2,1);
        finalUrl = 'https://raw.githubusercontent.com/' + rest.join('/');
      }
      if (finalUrl) {
        fetch(finalUrl).then(r => {
          return r.text();
        }).then(t => {
          currentEditor.setValue(t,1);
        });
      }
    }
  }],

  print: function(text) {
    if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
    if (consoleEnabled) console.log(text);
    addText('printed', text);
  },
  printErr: function(text) {
    if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
    if (consoleEnabled) console.error(text);
    addText('error', text);
  }
}

