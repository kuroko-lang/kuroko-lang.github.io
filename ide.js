var krk_call;
var extraEditor;
var consoleEnabled = false;
var lastMode = {};
var codeSamples = {
  helloworld: "print('Hello, world!')",
  variables: "let a, b, c = 1, 2.0, 'three'\nprint(a,b,c)",
  classes: "class Foo(object):\n  def __init__(self):\n    self.bar = 'baz'\n  def frob(self):\n    print(self.bar)\n\nlet foo = Foo()\nfoo.frob()",
  comprehensions: "let lst = [x * 5 for x in range(10)]\nlet dct = {str(x): x for x in lst}\nprint(lst)\nprint(dct)",
  tutorialsource: "import js; js.exec(\"fetch('/res/web.krk').then(r=>{return r.text();}).then(t=>{currentEditor().setValue(t,1);});\")",
  loadgist: "import js; js.exec(\"fetch('https://gist.githubusercontent.com/klange/396982d00e8fbff80fe6529d47e31e35/raw/').then(r=>{return r.text();}).then(t=>{currentEditor().setValue(t,1);});\")",
  clear: "import js; js.exec('document.getElementById(\"container\").innerHTML = \"\";')"
};
var termColors = ['#000000','#CC0000','#4E9A06','#C4A000','#3465A4','#75507B','#06989A','#D3D7CF'];
var termColorsBright = ['#555753','#EF2929','#8AE234','#FCE94F','#729FCF','#AD7FA8','#34E2E2','#EEEEEC'];

document.getElementById("container").innerText = "";
function runCode(editor) {
  document.getElementById('run-button').classList.add('run-pulse');
  var value = editor.getValue();
  window.setTimeout(function() {
    result = krk_call(value);
    document.getElementById('run-button').classList.remove('run-pulse');
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

function currentEditor() {
  return document.querySelector('#left-pane-tabContent > .tab-pane.active > .terminal-container')._aceInstance;
}

function saveFile(editor) {
  /* Figure out the name of the file */
  let tab = document.getElementById(editor.renderer.getContainerElement().parentNode.parentNode.id + '-tab');
  let fileName = tab.querySelector('.tab-title').innerText;
  var link = document.createElement('a');
  link.setAttribute('href', 'data:application/x-kuroko;charset=utf-8,' + encodeURIComponent(editor.getValue()));
  link.setAttribute('download', fileName);
  link.click();
}

function showSpinner() {
  document.getElementById('spinnyboi').classList.add('show-spinner');
}
function dismissSpinner() {
  document.getElementById('spinnyboi').classList.remove('show-spinner');
}

function openFile(fromInput) {
  showSpinner();
  window.setTimeout(function() {
    var file = fromInput.files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
      /* Need to make a tab */
      krk_call('emscripten.newEditorTab("' + file.name + '")');
      currentEditor().setValue(reader.result,1);
      dismissSpinner();
    };
    reader.readAsText(file);
  }, 100);
}

function addTab(tabHtml, bodyHtml) {
  let newDiv = document.createElement("div");
  newDiv.innerHTML = tabHtml.trim();
  let tabbar = document.getElementById("left-pane-tab");
  let sentinel = tabbar.querySelector(".tab-add")
  tabbar.insertBefore(newDiv.firstChild, sentinel);

  newDiv.innerHTML = bodyHtml.trim();
  document.getElementById("left-pane-tabContent").appendChild(newDiv.firstChild);
}

function createEditor(containerId="editor") {
  let newDiv = document.createElement("div");
  newDiv.className = "editor";
  document.getElementById(containerId).appendChild(newDiv);
  ace.require("ace/ext/language_tools");
  const editor = ace.edit(newDiv, {
    highlightActiveLine: true,
    tabSize: 4,
    useSoftTabs: true,
    wrap: true,
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true
  });
  editor.setTheme("ace/theme/sunsmoke");
  /* You may want to disable this? */
  editor.setBehavioursEnabled(false);
  editor.setOption('enableBasicAutocompletion', true);
  editor.session.setMode("ace/mode/kuroko");
  editor.commands.bindKey("Shift-Return", function (editor) { runCode(editor); });
  editor.getSelection().on('changeCursor', function () {
    let position = editor.getCursorPosition();
    document.getElementById(containerId).parentNode.querySelector('.status-line').innerText = position.row + 1;
    document.getElementById(containerId).parentNode.querySelector('.status-column').innerText = position.column + 1;
  });
  document.getElementById(containerId)._aceInstance = editor;
  return editor;
}

var codeHistory = [];
var historySpot = 0;
function enterCallback(editor) {
  var value = editor.getValue();
  // if ((value.endsWith(":") || value.endsWith("\\")) || (value.split("\n").length > 1 && value.replace(/.*\n */g,"").length > 0)) {
  //   editor.insert("\n");
  //   return;
  // }
  var value = editor.getValue();
  if (!codeHistory.length || codeHistory[codeHistory.length-1] != value) {
    codeHistory.push(value);
  }
  historySpot = codeHistory.length;
  window.setTimeout(function() {
    krk_call('emscripten.em_shell("""' + value + '""")');
  }, 50);
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
function createTerminalPrompt() {
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
  //editor.session.setMode("ace/mode/kuroko");
  editor.commands.bindKey("Return", enterCallback);
  editor.commands.bindKey("Up", historyBackIfOneLine);
  editor.commands.bindKey("Down", historyForwardIfOneLine);
  return editor;
}

function addText(mode, text) {
  let newOutput = document.createElement("pre");
  newOutput.className = mode;

  let currentText = '';
  function addSpan() {
    let subSpan = document.createElement("span");
    let cssText = '';
    for (const prop in lastMode) {
      cssText += prop + ': ' + lastMode[prop] + ';\n';
    }
    subSpan.style.cssText = cssText;
    subSpan.appendChild(document.createTextNode(currentText));
    newOutput.appendChild(subSpan);
    currentText = '';
  }

  let state = 0;
  let buf = '';
  for (const c of text) {
    if (state == 0) {
      if (c == '\x1b') {
        state = 1;
      } else {
        currentText += c;
      }
    } else if (state == 1) {
      if (c == '[') {
        if (currentText) addSpan();
        state = 2;
        buf = '';
      } else {
        currentText += '\x1b' + c;
        state = 0;
      }
    } else if (state == 2) {
      if (c.match(/[a-zA-Z]/i)) {
        /* Check the type */
        if (c == 'm') {
          for (const arg of buf.split(';')) {
            if (arg == '0') {
              lastMode = {};
            } else if (arg == '1') {
              lastMode['font-weight'] = 'bold';
            } else if (arg == '22') {
              if ('font-weight' in lastMode) {
                delete lastMode['font-weight'];
              }
            } else if (parseInt(arg) >= 30 && parseInt(arg) <= 37) {
              lastMode['color'] = termColors[parseInt(arg)-30];
            } else if (parseInt(arg) >= 90 && parseInt(arg) <= 97) {
              lastMode['color'] = termColorsBright[parseInt(arg)-90];
            } else if (parseInt(arg) >= 40 && parseInt(arg) <= 47) {
              lastMode['background-color'] = termColors[parseInt(arg)-40];
            } else if (parseInt(arg) >= 100 && parseInt(arg) <= 107) {
              lastMode['background-color'] = termColorsBright[parseInt(arg)-100];
            }
          }
        }
        state = 0;
        buf = '';
      } else {
        buf += c;
      }
    }
  }
  if (currentText) addSpan();

  if (!text.length) newOutput.appendChild(document.createElement("wbr"));
  document.getElementById("container").appendChild(newOutput);
  document.getElementById("extra-editor").scrollIntoView(false);
}

function insertCode(code, runIt=true) {
  currentEditor().setValue(code,1);
  if (runIt) {
    window.setTimeout(function() { runCode(currentEditor()); }, 100);
  }
  return false;
}

function closeTab(tabId) {
  let tabContents = document.getElementById(tabId);
  let tabHeader   = document.getElementById(tabId + '-tab');

  krk_call('emscripten.tabClosed("' + tabId + '")')

  tabContents.remove();
  if (tabHeader.classList.contains('active')) {
    let sib = tabHeader.nextSibling;
    while (sib instanceof Text) {
      sib = sib.nextSibling;
    }
    if (!sib || !('getAttribute' in sib) || sib.getAttribute('role') != 'tab') {
      sib = tabHeader.previousSibling;
      while (sib instanceof Text) {
        sib = sib.previousSibling;
      }
    }
    if (sib && 'getAttribute' in sib && sib.getAttribute('role') == 'tab') {
      sib.click();
    }
  }
  tabHeader.remove();
}

function toggleDirectory(element) {
  let li = element.parentNode;
  if (li.classList.contains('collapsed')) {
    li.classList.remove('collapsed');
  } else {
    li.classList.add('collapsed');
  }
}

function openEmscriptenFile(path) {
  showSpinner();
  window.setTimeout(function() {
    krk_call('emscripten.openFile("' + path + '")')
    dismissSpinner();
  }, 100);
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
    const modules = ["help.krk","collections.krk","json.krk","string.krk","web.krk","dummy.krk","emscripten.krk"];
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
    krk_call(
      "if True:\n" +
      "    import emscripten\n" +
      "    __builtins__.emscripten = emscripten\n");

    /* Start up Ace instances */
    //createEditor();
    //createEditor('editor-1');
    extraEditor = createTerminalPrompt();
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

