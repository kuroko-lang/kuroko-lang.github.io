define("ace/theme/sunsmoke",["require","exports","module","ace/lib/dom"],function(e,t,n){
    t.isDark = true,
    t.cssClass = "ace-sunsmoke",
    t.cssText = `
        .ace-sunsmoke.ace_editor { color: #e6e6e6; background-color: #1f1f1f; }
        .ace-sunsmoke.ace_editor .ace_marker-layer .ace_bracket { display: none }
        .ace-sunsmoke.ace_editor .ace_active-line { background-color: #333; }
        .ace-sunsmoke.ace_editor .ace_gutter  { color: #968b39; background-color: #000000; }
        .ace-sunsmoke.ace_editor .ace_gutter-active-line { background-color: #968b39; color: #000; }
        .ace-sunsmoke.ace_editor .ace_selection { background-color: #666; }
        .ace-sunsmoke.ace_editor .ace_print-margin { background-color: #282828; }
        .ace-sunsmoke.ace_editor .ace_keyword { color: #33a2e6; }
        .ace-sunsmoke.ace_editor .ace_string  { color: #48b048; }
        .ace-sunsmoke.ace_editor .ace_comment { color: #9e9981; font-style: oblique; }
        .ace-sunsmoke.ace_editor .ace_numeric { color: #e62b7f; }
        .ace-sunsmoke.ace_editor .ace_escape  { color: #71cbad; }
        .ace-sunsmoke.ace_editor .ace_constant.ace_language.ace_escape  { color: #71cbad; }
        .ace-sunsmoke.ace_editor .ace_storage { color: #e6ce6e; }
        .ace-sunsmoke.ace_editor .ace_support.ace_function { color: #e6ce6e; }
        .ace-sunsmoke.ace_editor .ace_constant.ace_language { color: #e62b7f; }
        .ace-sunsmoke.ace_editor .ace_heading { font-weight: bold; }
        .ace-sunsmoke.ace_editor .ace_indent-guide { border-right: 1px solid #555; margin-right: -1px; }
        .ace-sunsmoke.ace_editor.ace_autocomplete .ace_marker-layer .ace_active-line { background-color: #555; }
        .ace-sunsmoke.ace_editor.ace_autocomplete .ace_completion-highlight { color: #33a2e6; }
        .ace-sunsmoke.ace_editor .ace_gutter-cell.ace_error { background-color: red; color: white; }
        .ace-sunsmoke.ace_editor .ace_gutter-cell.ace_warning { background-color: orange; color: black; }
        .ace-sunsmoke.ace_editor .ace_gutter-cell.ace_info { background-color: #33a2e6; color: white; }
    `;
    var r=e("../lib/dom");
    r.importCssString(t.cssText,t.cssClass)
});

(function() {
    window.require(["ace/theme/sunsmoke"], function(m) {
        if (typeof module == "object" && typeof exports == "object" && module) {
            module.exports = m;
        }
    });
})();
