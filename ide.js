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
var termColors256 = [
    '#000000', '#cc0000', '#3e9a06', '#c4a000', '#3465a4', '#75507b', '#06989a', '#eeeeec', '#555753', '#ef2929', '#8ae234',
    '#fce94f', '#729fcf', '#ad7fa8', '#34e2e2', '#FFFFFF', '#000000', '#00005f', '#000087', '#0000af', '#0000d7', '#0000ff',
    '#005f00', '#005f5f', '#005f87', '#005faf', '#005fd7', '#005fff', '#008700', '#00875f', '#008787', '#0087af', '#0087d7',
    '#0087ff', '#00af00', '#00af5f', '#00af87', '#00afaf', '#00afd7', '#00afff', '#00d700', '#00d75f', '#00d787', '#00d7af',
    '#00d7d7', '#00d7ff', '#00ff00', '#00ff5f', '#00ff87', '#00ffaf', '#00ffd7', '#00ffff', '#5f0000', '#5f005f', '#5f0087',
    '#5f00af', '#5f00d7', '#5f00ff', '#5f5f00', '#5f5f5f', '#5f5f87', '#5f5faf', '#5f5fd7', '#5f5fff', '#5f8700', '#5f875f',
    '#5f8787', '#5f87af', '#5f87d7', '#5f87ff', '#5faf00', '#5faf5f', '#5faf87', '#5fafaf', '#5fafd7', '#5fafff', '#5fd700',
    '#5fd75f', '#5fd787', '#5fd7af', '#5fd7d7', '#5fd7ff', '#5fff00', '#5fff5f', '#5fff87', '#5fffaf', '#5fffd7', '#5fffff',
    '#870000', '#87005f', '#870087', '#8700af', '#8700d7', '#8700ff', '#875f00', '#875f5f', '#875f87', '#875faf', '#875fd7',
    '#875fff', '#878700', '#87875f', '#878787', '#8787af', '#8787d7', '#8787ff', '#87af00', '#87af5f', '#87af87', '#87afaf',
    '#87afd7', '#87afff', '#87d700', '#87d75f', '#87d787', '#87d7af', '#87d7d7', '#87d7ff', '#87ff00', '#87ff5f', '#87ff87',
    '#87ffaf', '#87ffd7', '#87ffff', '#af0000', '#af005f', '#af0087', '#af00af', '#af00d7', '#af00ff', '#af5f00', '#af5f5f',
    '#af5f87', '#af5faf', '#af5fd7', '#af5fff', '#af8700', '#af875f', '#af8787', '#af87af', '#af87d7', '#af87ff', '#afaf00',
    '#afaf5f', '#afaf87', '#afafaf', '#afafd7', '#afafff', '#afd700', '#afd75f', '#afd787', '#afd7af', '#afd7d7', '#afd7ff',
    '#afff00', '#afff5f', '#afff87', '#afffaf', '#afffd7', '#afffff', '#d70000', '#d7005f', '#d70087', '#d700af', '#d700d7',
    '#d700ff', '#d75f00', '#d75f5f', '#d75f87', '#d75faf', '#d75fd7', '#d75fff', '#d78700', '#d7875f', '#d78787', '#d787af',
    '#d787d7', '#d787ff', '#d7af00', '#d7af5f', '#d7af87', '#d7afaf', '#d7afd7', '#d7afff', '#d7d700', '#d7d75f', '#d7d787',
    '#d7d7af', '#d7d7d7', '#d7d7ff', '#d7ff00', '#d7ff5f', '#d7ff87', '#d7ffaf', '#d7ffd7', '#d7ffff', '#ff0000', '#ff005f',
    '#ff0087', '#ff00af', '#ff00d7', '#ff00ff', '#ff5f00', '#ff5f5f', '#ff5f87', '#ff5faf', '#ff5fd7', '#ff5fff', '#ff8700',
    '#ff875f', '#ff8787', '#ff87af', '#ff87d7', '#ff87ff', '#ffaf00', '#ffaf5f', '#ffaf87', '#ffafaf', '#ffafd7', '#ffafff',
    '#ffd700', '#ffd75f', '#ffd787', '#ffd7af', '#ffd7d7', '#ffd7ff', '#ffff00', '#ffff5f', '#ffff87', '#ffffaf', '#ffffd7',
    '#ffffff', '#080808', '#121212', '#1c1c1c', '#262626', '#303030', '#3a3a3a', '#444444', '#4e4e4e', '#585858', '#626262',
    '#6c6c6c', '#767676', '#808080', '#8a8a8a', '#949494', '#9e9e9e', '#a8a8a8', '#b2b2b2', '#bcbcbc', '#c6c6c6', '#d0d0d0',
    '#dadada', '#e4e4e4', '#eeeeee'
];
var scrollToBottom;

function runInternal(path) {
  showSpinner();
  window.setTimeout(function() {
    result = emscripten.executeFile(path)
  }, 50);
}

function stopWorker() {
  stopAutostep();
  emscripten.stopWorker();
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
  emscripten.postDebuggerMessage('step');
}

function continueDebugger() {
  emscripten.postDebuggerMessage('continue');
}

document.getElementById('debugger-single-step').checked = false;
document.getElementById('debugger-gotoline').checked = false;
document.getElementById('debugger-quickauto').checked = true;
function debuggerSettings() {
  const single = document.getElementById('debugger-single-step').checked;
  const gotoline = document.getElementById('debugger-gotoline').checked;
  emscripten.updateDebuggerSettings(single, gotoline);
}

function openFile(fromInput) {
  window.setTimeout(function() {
    var file = fromInput.files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
      /* Need to make a tab */
      FS.writeFile('/scratch/' + file.name, reader.result);
      FS.syncfs(function(err){});
      emscripten.openFile('/scratch/' + file.name);
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
      emscripten.reportShown(e.target.id);
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
    emscripten.reportChange(containerId);
  });
  document.getElementById(containerId)._aceInstance = editor;
  editor._filepath = filePath;
  if (filePath != null) {
    window.setTimeout(function() {
      editor.setValue(FS.readFile(filePath,{ encoding: 'utf8' }), 1);
    }, 100);
  }

  const ro = new ResizeObserver(entries => {
    editor.resize(true);
  });
  ro.observe(document.getElementById(containerId));

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
  if (!codeHistory.length || codeHistory[codeHistory.length-1] != value) {
    codeHistory.push(value);
  }
  historySpot = codeHistory.length;
  // Freeze the editor.
  editor.renderer.off("afterRender", scrollToBottom);
  editor.setReadOnly(true);
  editor.renderer.$cursorLayer.element.style.display = "none";

  // Clone the read-only editor
  const outText = editor.container.cloneNode(true);
  editor.setValue('',1);
  const frozen = document.createElement("div");
  frozen.className = 'prompt-frozen';
  const prompt = document.getElementById("shell-prompt").cloneNode(true);
  prompt.removeAttribute('id');
  prompt.className = 'prompt-string';
  frozen.appendChild(prompt);
  const inner = document.createElement('div');
  const lines = outText.getElementsByClassName("ace_line");
  const len = lines.length;
  for (var i = 0; i < len; i = i + 1) {
    inner.appendChild(lines[0]);
  }
  frozen.appendChild(inner);
  document.getElementById('output-container').appendChild(frozen);

  // Restore the editor and clear it.
  editor.renderer.$cursorLayer.element.style.display = "unset";
  editor.setReadOnly(false);
  editor.renderer.on('afterRender',scrollToBottom);
  editor.container.parentElement.classList.add('hidden-prompt');

  // Call shell in async
  window.setTimeout(function() {
    emscripten.em_shell(value);
    editor.container.parentElement.classList.remove('hidden-prompt');
  }, 50);
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
function clearOutput(editor) {
  document.getElementById('output-container').innerText = '';
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
  editor.commands.bindKey("Ctrl-L", clearOutput);
  scrollToBottom = editor.renderer.on('afterRender', function() {
    newDiv.scrollIntoView();
  });
  return editor;
}

function saveEditor(editor) {
  let editorId = editor.renderer.getContainerElement().parentNode.id;
  FS.writeFile(editor._filepath, editor.getValue());
  FS.syncfs(function(err){});
  emscripten.reportSaved(editorId)
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
          const args = buf.split(';');
          for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg == '0' || arg == '00') {
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
            } else if (parseInt(arg) == 38) {
              if (parseInt(args[i+1]) == 5) {
                stateVar['color'] = termColors256[parseInt(args[i+2])];
                i = i + 2;
              }
            } else if (parseInt(arg) == 39) {
              delete stateVar['color'];
            } else if (parseInt(arg) >= 90 && parseInt(arg) <= 97) {
              stateVar['color'] = termColorsBright[parseInt(arg)-90];
            } else if (parseInt(arg) >= 40 && parseInt(arg) <= 47) {
              stateVar['background-color'] = termColors[parseInt(arg)-40];
            } else if (parseInt(arg) == 48) {
              if (parseInt(args[i+1]) == 5) {
                stateVar['background-color'] = termColors256[parseInt(args[i+2])];
                i = i + 2;
              }
            } else if (parseInt(arg) == 49) {
              delete stateVar['background-color'];
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
    emscripten.openFile('/scratch/' + name);
    if (runIt) {
      window.setTimeout(function() { runCode(currentEditor()); }, 100);
    }
  }, 100);
  return false;
}

function closeTab(tabId) {
  let tabContents = document.getElementById(tabId);
  let tabHeader   = document.getElementById(tabId + '-tab');

  if (emscripten.tabClosed(tabId) === false) {
    if (!confirm("File is modified, close anyway? (Unsaved changes will be lost.)")) return;
    emscripten.tabClosed(tabId,true)
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

function hideContextMenu(e) {
  window.removeEventListener("click", hideContextMenu);
  let dropdown = document.getElementById('file-context-menu');
  dropdown.classList.remove('show');
}

var contextMenuPath = null;
function showContextMenu(path) {
  emscripten.setupContextMenu(path)
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
  emscripten.syncProjectList()
  emscripten.openFile(path + '/main.krk');
}

function makeFolder(elem) {
  let dirName = elem.parentNode.querySelector('input').value;
  let source = elem.parentNode.parentNode.parentNode.querySelector('a').getAttribute('em-path');
  FS.mkdir(source + '/' + dirName);
  FS.syncfs(function (err) {});
  emscripten.syncProjectList()
}

function makeFile(elem) {
  let pathName = elem.parentNode.querySelector('input').value;
  let source = elem.parentNode.parentNode.parentNode.querySelector('a').getAttribute('em-path');
  FS.writeFile(source + '/' + pathName, '');
  FS.syncfs(function (err) {});
  emscripten.syncProjectList();
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
      <svg class="icon-sm" viewBox="0 0 24 24" onclick="emscripten.syncProjectList();"><use href="#icon-x"></use></svg>
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
      <svg class="icon-sm" viewBox="0 0 24 24" onclick="emscripten.syncProjectList();"><use href="#icon-x"></use></svg>
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
  } else {
    document.getElementById("css-theme-dark").rel = 'alternate stylesheet';
    document.getElementById("css-theme-light").rel = 'stylesheet';
    localStorage.setItem("idetheme","light");
    aceTheme = 'ace/theme/tomorrow';
  }
  extraEditor.setTheme(aceTheme);
  document.getElementById('right-pane-tabContent').className = 'tab-content under-tabbar ace_editor ' + aceTheme.replace('ace/theme/','ace-');
  document.getElementById('debugger-disassembly').className = 'ace_editor ' + aceTheme.replace('ace/theme/','ace-');
  document.querySelectorAll('.tab-pane .terminal-container').forEach(function (element) {
    element._aceInstance.setTheme(aceTheme);
  });
}
let idetheme = localStorage.getItem("idetheme");
if (idetheme) {
  if (idetheme == 'dark') document.getElementById("theme-dark").checked = (idetheme == 'dark');
}

function onHashChange() {
  if (window.location.hash.startsWith('#gist/')) {
    let hashElements = window.location.hash.split('/');
    fetch('https://gist.githubusercontent.com/' + hashElements.slice(1).join('/') + '/raw/').then(r => {
        return r.text();
      }).then(t => {
        FS.writeFile('/scratch/' + hashElements.slice(1).join('_') + '.krk', t);
        FS.syncfs(function (err) {});
        emscripten.openFile('/scratch/' + hashElements.slice(1).join('_') + '.krk');
      });
  }
}

window.addEventListener("beforeunload", function(e) {
  /* Ask if there are any unsaved files */
  if (emscripten.hasUnsaved()) {
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

    const fs = {
      usr: {
        local: {
          lib: {
            kuroko: {
              syntax: {
                '__init__.krk': true,
                'highlighter.krk': true,
              },
              foo: {
                bar: {
                  '__init__.krk': true,
                  'baz.krk': true,
                },
                '__init__.krk': true,
              },
              'help.krk': true,
              'collections.krk': true,
              'json.krk': true,
              'string.krk': true,
              'web.krk': true,
              'dummy.krk': true,
              'emscripten.krk': true,
            }
          }
        }
      }
    };

    function processFiles(node, parent) {
      for (const [key, value] of Object.entries(node)) {
        if (typeof value === 'boolean') {
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

    /* Print some startup text. */
    krk_call(
      "if True:\n" +
      "    import emscripten\n" +
      "    __builtins__.emscripten = emscripten\n" +
      "    emscripten.__main__()\n");

    ideConfig = localStorage.getItem("ideconfig");

    FS.syncfs(true, function (err) {
      if (!err) {
        emscripten.filesystemReady()
      } else {
        console.log(err);
      }
    });

    /* Start up Ace instance for terminal */
    extraEditor = createTerminalPrompt();
    setTheme();

    onHashChange();
    window.addEventListener('hashchange', onHashChange, false);
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

