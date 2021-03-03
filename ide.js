var aceTheme = 'ace/theme/sunsmoke';
var krk_call;
var extraEditor;
var consoleEnabled = false;
var consoleState = {};
var debugState = {};
var ideConfig;
var codeSamples = {
  helloworld: ['helloworld.krk', "print('Hello, world!')"],
  variables:  ['vars.krk', "let a, b, c = 1, 2.0, 'three'\nprint(a,b,c)"],
  classes:    ['classes.krk', "class Foo(object):\n  def __init__(self):\n    self.bar = 'baz'\n  def frob(self):\n    print(self.bar)\n\nlet foo = Foo()\nfoo.frob()"],
  comprehensions: ['comprehensions.krk', "let lst = [x * 5 for x in range(10)]\nlet dct = {str(x): x for x in lst}\nprint(lst)\nprint(dct)"],
};
var termColors = ['#000000','#CC0000','#4E9A06','#C4A000','#3465A4','#75507B','#06989A','#D3D7CF'];
var termColorsBright = ['#555753','#EF2929','#8AE234','#FCE94F','#729FCF','#AD7FA8','#34E2E2','#EEEEEC'];

function runInternal(path) {
  showSpinner();
  window.setTimeout(function() {
    result = krk_call('emscripten.executeFile("' + path + '")');
  }, 50);
}

function stopWorker() {
  stopAutostep();
  krk_call('emscripten.stopWorker()');
}

document.getElementById("output-container").innerText = "";
function runCode(editor) {
  runInternal(editor._filepath);
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
  document.getElementById('nav-run').classList.remove('debugging');
  document.getElementById('nav-stop').classList.remove('debugging');
  document.getElementById('nav-continue').classList.remove('debugging');
  document.getElementById('nav-step').classList.remove('debugging');
  document.getElementById('nav-autostep').classList.remove('debugging');

  document.getElementById('run-button').classList.add('run-pulse');
  document.getElementById('stop-button').classList.add('running');
}

function dismissSpinner() {
  document.getElementById('nav-run').classList.remove('debugging');
  document.getElementById('nav-stop').classList.remove('debugging');
  document.getElementById('nav-continue').classList.remove('debugging');
  document.getElementById('nav-step').classList.remove('debugging');
  document.getElementById('nav-autostep').classList.remove('debugging');

  document.getElementById('run-button').classList.remove('run-pulse');
  document.getElementById('stop-button').classList.remove('running');
}

function showDebugger() {
  document.getElementById('nav-run').classList.add('debugging');
  document.getElementById('nav-stop').classList.add('debugging');
  document.getElementById('nav-continue').classList.add('debugging');
  document.getElementById('nav-step').classList.add('debugging');
  document.getElementById('nav-autostep').classList.add('debugging');
}

var autoStepping = false;
var autoStepCallback = null;

function doAutostep() {
  if (!document.getElementById('nav-autostep').classList.contains('debugging')) {
    stopAutostep();
    return;
  }
  stepDebugger();
  autoStepCallback = window.setTimeout(doAutostep,
    document.getElementById('debugger-quickauto').checked ? 100 : 500
  );
}

function stopAutostep() {
    autoStepping = false;
    document.getElementById('nav-autostep').classList.remove('autostepping');
    if (autoStepCallback) {
      window.clearTimeout(autoStepCallback);
      autoStepCallback = null;
    }
}

function autostepDebugger() {
  if (autoStepping) {
    stopAutostep();
  } else {
    document.getElementById('nav-autostep').classList.add('autostepping');
    autoStepping = true;
    doAutostep();
  }
}

function stepDebugger() {
  krk_call('emscripten.postDebuggerMessage("step")');
}

function continueDebugger() {
  krk_call('emscripten.postDebuggerMessage("continue")');
}

document.getElementById('debugger-single-step').checked = false;
document.getElementById('debugger-gotoline').checked = false;
document.getElementById('debugger-quickauto').checked = true;
function debuggerSettings() {
  let settings = [];
  if (document.getElementById('debugger-single-step').checked) settings.push('single=True');
  if (document.getElementById('debugger-gotoline').checked) settings.push('gotoline=True');
  krk_call('emscripten.updateDebuggerSettings(' + settings + ')');
}

function openFile(fromInput) {
  window.setTimeout(function() {
    var file = fromInput.files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
      /* Need to make a tab */
      FS.writeFile('/scratch/' + file.name, reader.result);
      FS.syncfs(function(err){});
      openEmscriptenFile('/scratch/' + file.name);
    };
    reader.readAsText(file);
  }, 100);
}

function addTab(tabHtml, bodyHtml) {
  let newDiv = document.createElement("div");
  newDiv.innerHTML = tabHtml.trim();
  newDiv.firstChild.addEventListener('shown.bs.tab', function (e) {
    window.setTimeout(function() {
      window.document.title = e.target.querySelector('.tab-title').innerText + " | Kuroko IDE";
      krk_call('emscripten.reportShown("' + e.target.id + '")')
    }, 200);
  });
  let tabbar = document.getElementById("left-pane-tab");
  let sentinel = tabbar.querySelector(".tab-add")
  tabbar.insertBefore(newDiv.firstChild, sentinel);

  newDiv.innerHTML = bodyHtml.trim();
  document.getElementById("left-pane-tabContent").appendChild(newDiv.firstChild);
}

function createEditor(containerId="editor",filePath=null) {
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
  editor.setTheme(aceTheme);
  /* You may want to disable this? */
  editor.setBehavioursEnabled(false);
  editor.setOption('enableBasicAutocompletion', true);
  if (filePath) {
    if (filePath.endsWith('.krk')) {
      editor.session.setMode("ace/mode/kuroko");
    } else if (filePath.endsWith('.md')) {
      editor.session.setMode("ace/mode/markdown");
    }
  }
  editor.commands.bindKey("Shift-Return", function (editor) { runCode(editor); });
  editor.commands.bindKey("Ctrl-S", function (editor) { saveEditor(editor); });
  editor.commands.bindKey("Ctrl-W", function (editor) { });
  editor.getSelection().on('changeCursor', function () {
    let position = editor.getCursorPosition();
    document.getElementById(containerId).parentNode.querySelector('.status-line').innerText = position.row + 1;
    document.getElementById(containerId).parentNode.querySelector('.status-column').innerText = position.column + 1;
  });
  editor.session.getDocument().on("change", function() {
    krk_call('emscripten.reportChange("' + containerId + '")');
  });
  document.getElementById(containerId)._aceInstance = editor;
  editor._filepath = filePath;
  if (filePath != null) {
    window.setTimeout(function() {
      editor.setValue(FS.readFile(filePath,{ encoding: 'utf8' }), 1);
    }, 100);
  }

  const ro = new ResizeObserver(entries => {
    console.log("editor div is resizing!");
    editor.resize(true);
  });
  ro.observe(document.getElementById(containerId));

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
  editor.setTheme(aceTheme);
  editor.setBehavioursEnabled(false);
  //editor.session.setMode("ace/mode/kuroko");
  editor.commands.bindKey("Return", enterCallback);
  editor.commands.bindKey("Up", historyBackIfOneLine);
  editor.commands.bindKey("Down", historyForwardIfOneLine);
  return editor;
}

function saveEditor(editor) {
  let editorId = editor.renderer.getContainerElement().parentNode.id;
  FS.writeFile(editor._filepath, editor.getValue());
  FS.syncfs(function(err){});
  krk_call('emscripten.reportSaved("' + editorId + '")');
}

function addText(stateVar, mode, text, divId) {
  let newOutput = document.createElement("pre");
  newOutput.className = mode;

  let currentText = '';
  function addSpan() {
    let subSpan = document.createElement("span");
    let cssText = '';
    for (const prop in stateVar) {
      cssText += prop + ': ' + stateVar[prop] + ';\n';
    }
    if (cssText) subSpan.style.cssText = cssText;
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
              for (const prop in stateVar) {
                delete stateVar[prop];
              }
            } else if (arg == '1') {
              stateVar['font-weight'] = 'bold';
            } else if (arg == '22') {
              if ('font-weight' in stateVar) {
                delete stateVar['font-weight'];
              }
            } else if (parseInt(arg) >= 30 && parseInt(arg) <= 37) {
              stateVar['color'] = termColors[parseInt(arg)-30];
            } else if (parseInt(arg) >= 90 && parseInt(arg) <= 97) {
              stateVar['color'] = termColorsBright[parseInt(arg)-90];
            } else if (parseInt(arg) >= 40 && parseInt(arg) <= 47) {
              stateVar['background-color'] = termColors[parseInt(arg)-40];
            } else if (parseInt(arg) >= 100 && parseInt(arg) <= 107) {
              stateVar['background-color'] = termColorsBright[parseInt(arg)-100];
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
  let container = document.getElementById(divId);
  container.appendChild(newOutput);
  container.parentNode.querySelector('.marker').scrollIntoView(false);
}

function insertCode(obj, runIt=true) {
  let name = obj[0];
  let code = obj[1];
  window.setTimeout(function() {
    FS.writeFile('/scratch/' + name, code);
    FS.syncfs(function(err){});
    openEmscriptenFile('/scratch/' + name);
    if (runIt) {
      window.setTimeout(function() { runCode(currentEditor()); }, 100);
    }
  }, 100);
  return false;
}

function closeTab(tabId) {
  let tabContents = document.getElementById(tabId);
  let tabHeader   = document.getElementById(tabId + '-tab');

  if (krk_call('emscripten.tabClosed("' + tabId + '")') == 'False') {
    if (!confirm("File is modified, close anyway? (Unsaved changes will be lost.)")) return;
    krk_call('emscripten.tabClosed("' + tabId + '", True)');
  }

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
  krk_call('emscripten.openFile("' + path + '")')
}

function ideDebug(s) {
  addText(debugState, 'printed', s, 'ide-debug');
}

function hideContextMenu(e) {
  window.removeEventListener("click", hideContextMenu);
  let dropdown = document.getElementById('file-context-menu');
  dropdown.classList.remove('show');
}

var contextMenuPath = null;
function showContextMenu(path) {
  krk_call('emscripten.setupContextMenu("' + path + '")');
  contextMenuPath = path;
  let e = window.event;
  let dropdown = document.getElementById('file-context-menu');
  dropdown.classList.add('show');
  dropdown.style.position = 'absolute';
  dropdown.style.left = e.pageX + 'px';
  dropdown.style.top = e.pageY + 'px';

  window.addEventListener("click", hideContextMenu);

  e.preventDefault();
  return false;
}

function runFromContextMenu() {
  runInternal(contextMenuPath);
}

function createProject() {
  /* Get project name from form */
  let projectName = document.getElementById("project-name").value;
  /* TODO validate */
  if (projectName.length < 1 ||
      projectName.includes('/') ||
      projectName.includes('"') ||
      projectName.includes("'") ||
      projectName.includes(' ') ||
      projectName.includes('.') ||
      projectName.includes('`')) {
    alert("Sorry, that project name may cause problems.");
    return;
  }
  /* Clear form */
  document.getElementById("project-name").value = "";
  /* Create directory */
  let path = '/home/web_user/' + projectName;
  try {
    FS.mkdir(path);
  } catch (error) {
    alert("It looks like you already have a project with that name?");
    return;
  }
  FS.writeFile(path + '/main.krk','# main.krk\n');
  FS.syncfs(function (err) {});
  krk_call('emscripten.syncProjectList()')
  openEmscriptenFile(path + '/main.krk');
}

function makeFolder(elem) {
  let dirName = elem.parentNode.querySelector('input').value;
  let source = elem.parentNode.parentNode.parentNode.querySelector('a').getAttribute('em-path');
  FS.mkdir(source + '/' + dirName);
  FS.syncfs(function (err) {});
  krk_call('emscripten.syncProjectList()')
}

function makeFile(elem) {
  let pathName = elem.parentNode.querySelector('input').value;
  let source = elem.parentNode.parentNode.parentNode.querySelector('a').getAttribute('em-path');
  FS.writeFile(source + '/' + pathName, '');
  FS.syncfs(function (err) {});
  krk_call('emscripten.syncProjectList()')
}

function newFolder(rootPath=null) {
  if (!rootPath) rootPath = contextMenuPath;
  let panelElem = document.getElementById('panel-files').querySelector('[em-path="' + rootPath + '"]');
  let ul = panelElem.parentNode.querySelector('ul');
  let newLi = document.createElement('li');
  /* This is temporary, so we don't need to strictly file the same layout, but the svg element would be nice... */
  newLi.innerHTML = `
    <form onsubmit="makeFolder(this)" class="file-item">
      <svg class="icon-sm" viewBox="0 0 24 24" style="color: #e6ce6e"><use href="#icon-folder"></use></svg>
      <input></input>
      <svg class="icon-sm" viewBox="0 0 24 24" onclick="makeFolder(this.parentNode)"><use href="#icon-check"></use></svg>
      <svg class="icon-sm" viewBox="0 0 24 24" onclick="krk_call('emscripten.syncProjectList()');"><use href="#icon-x"></use></svg>
    </form>
  `;
  ul.appendChild(newLi);
}

function newFile(rootPath=null) {
  if (!rootPath) rootPath = contextMenuPath;
  let panelElem = document.getElementById('panel-files').querySelector('[em-path="' + rootPath + '"]');
  let ul = panelElem.parentNode.querySelector('ul');
  let newLi = document.createElement('li');
  /* This is temporary, so we don't need to strictly file the same layout, but the svg element would be nice... */
  newLi.innerHTML = `
    <form onsubmit="makeFile(this)" class="file-item">
      <svg class="icon-sm" viewBox="0 0 24 24" style="color: red;"><use href="#icon-code"></use></svg>
      <input ></input>
      <svg class="icon-sm" viewBox="0 0 24 24" onclick="makeFile(this.parentNode)"><use href="#icon-check"></use></svg>
      <svg class="icon-sm" viewBox="0 0 24 24" onclick="krk_call('emscripten.syncProjectList()');"><use href="#icon-x"></use></svg>
    </form>
  `;
  ul.appendChild(newLi);
}

function dragSplitter(e) {
  let pane = document.querySelector("div.left-pane");
  pane.style.height = e.clientY - pane.getBoundingClientRect().top + 'px';
}
function startDraggingSplitter(element) {
  window.addEventListener("mousemove", dragSplitter);
  window.addEventListener("mouseup", function(e) {
    window.removeEventListener("mousemove", dragSplitter);
  }, {once: true});
}

function dragLeftSplitter(e) {
  let pane = document.querySelector("div.file-browser");
  pane.style.width = e.clientX + 'px';
}
function startDraggingLeftSplitter(element) {
  window.addEventListener("mousemove", dragLeftSplitter);
  window.addEventListener("mouseup", function(e) {
    window.removeEventListener("mousemove", dragLeftSplitter);
  }, {once: true});
}

function dragRightSplitter(e) {
  let pane = document.querySelector("div.debugger");
  pane.style.width =  pane.getBoundingClientRect().right - e.clientX + 'px';
}
function startDraggingRightSplitter(element) {
  window.addEventListener("mousemove", dragRightSplitter);
  window.addEventListener("mouseup", function(e) {
    window.removeEventListener("mousemove", dragRightSplitter);
  }, {once: true});
}

function setTheme() {
  if (document.getElementById("theme-dark").checked) {
    document.getElementById("css-theme-dark").rel = 'stylesheet';
    document.getElementById("css-theme-light").rel = 'alternate stylesheet';
    localStorage.setItem("idetheme","dark");
    aceTheme = 'ace/theme/sunsmoke';
  } else if (document.getElementById("theme-light").checked) {
    document.getElementById("css-theme-dark").rel = 'alternate stylesheet';
    document.getElementById("css-theme-light").rel = 'stylesheet';
    localStorage.setItem("idetheme","light");
    aceTheme = 'ace/theme/tomorrow';
  }
  extraEditor.setTheme(aceTheme);
  window.setTimeout(function () {
    document.getElementById('right-pane-tabContent').className = 'tab-content under-tabbar ace_editor ' + extraEditor.renderer.theme.cssClass;
    document.getElementById('debugger-disassembly').className = 'ace_editor ' + extraEditor.renderer.theme.cssClass;
  }, 100);
  document.querySelectorAll('.tab-pane .terminal-container').forEach(function (element) {
    element._aceInstance.setTheme(aceTheme);
  });
}
let idetheme = localStorage.getItem("idetheme");
if (idetheme) {
  if (idetheme == 'dark') document.getElementById("theme-dark").checked = true;
  if (idetheme == 'light') document.getElementById("theme-light").checked = true;
}


window.addEventListener("beforeunload", function(e) {
  /* Ask if there are any unsaved files */
  if (krk_call('emscripten.hasUnsaved()') == 'True') {
    if (!confirm('Some files are not saved. Are you sure you want to close the editor?')) {
      e.preventDefault();
    }
  }
});

if (! /iPhone|Android/i.test(navigator.userAgent)) {
  document.getElementById('main-container').className = 'layout-normal';
}

var Module = {
  preRun: [function() {
    /* Make the homedir persistent */
    FS.mount(IDBFS, {}, '/home/web_user');
    FS.mkdir('/scratch');
    FS.mount(IDBFS, {}, '/scratch');
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
      "    __builtins__.emscripten = emscripten\n" +
      "    emscripten.__main__()\n");

    ideConfig = localStorage.getItem("ideconfig");

    FS.syncfs(true, function (err) {
      if (!err) {
        krk_call("emscripten.filesystemReady()");
      } else {
        console.log(err);
      }
    });

    /* Start up Ace instance for terminal */
    extraEditor = createTerminalPrompt();
    setTheme();
  }],

  print: function(text) {
    if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
    if (consoleEnabled) console.log(text);
    addText(consoleState, 'printed', text, 'output-container');
  },
  printErr: function(text) {
    if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
    if (consoleEnabled) console.error(text);
    addText(consoleState, 'error', text, 'output-container');
  }
}

