/*
 * Copyright 2014 The Polymer Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */
(function(scope) {

var STYLE_SELECTOR = 'style';
var STYLE_LOADABLE_MATCH = '@import';

var loader = {
  loadStyles: function(root, callback) {
    var styles = this.findLoadableStyles(root);
    if (styles.length) {
      if (window.ShadowDOMPolyfill) {
        this.polyfillLoadStyles(styles, callback);
      } else {
        this.platformLoadStyles(styles, callback);
      }
    } else if (callback) {
      callback();
    }
  },
  findLoadableStyles: function(root) {
    var loadables = [];
    if (root) {
      var s$ = root.querySelectorAll(STYLE_SELECTOR);
      for (var i=0, l=s$.length, s; (i<l) && (s=s$[i]); i++) {
        if (s.textContent.match(STYLE_LOADABLE_MATCH)) {
          loadables.push(s);
        }
      }
    }
    return loadables;
  },
  platformLoadStyles: function(styles, callback) {
    var css = [];
    for (var i=0, l=styles.length, s; (i<l) && (s=styles[i]); i++) {
      css.push(s.textContent);
    }
    loadCssText(css.join('\n'), callback);
  },
  polyfillLoadStyles: function(styles, callback) {
    var loaded=0, l = styles.length;
    // called in the context of the style
    function loadedStyle(style) {
      //console.log(style.textContent);
      loaded++;
      if (loaded === l && callback) {
        callback();
      }
    }
    for (var i=0, s; (i<l) && (s=styles[i]); i++) {
      polyfillLoadStyle(s, loadedStyle);
    }
  }
};

// use the platform to preload styles
var preloadElement = document.createElement('preloader');
preloadElement.style.display = 'none';
var preloadRoot = preloadElement.createShadowRoot();
document.head.appendChild(preloadElement);

function loadCssText(cssText, callback) {
  var style = createStyleElement(cssText);
  if (callback) {
    style.addEventListener('load', callback);
    style.addEventListener('error', callback);
  }
  preloadRoot.appendChild(style);
}

function createStyleElement(cssText, scope) {
  scope = scope || document;
  scope = scope.createElement ? scope : scope.ownerDocument;
  var style = scope.createElement('style');
  style.textContent = cssText;
  return style;
}

// TODO(sorvell): integrate a real URL polyfill, this is cribbed from
// https://github.com/arv/DOM-URL-Polyfill/blob/master/src/url.js.
// NOTE: URL seems difficult to polyfill since chrome and safari implement
// it but only chrome's appears to work.
function getUrl(base, url) {
  url = url || '';
  var doc = document.implementation.createHTMLDocument('');
  if (base) {
    var baseElement = doc.createElement('base');
    baseElement.href = base;
    doc.head.appendChild(baseElement);
  }
  var anchorElement = doc.createElement('a');
  anchorElement.href = url;
  doc.body.appendChild(anchorElement);
  return anchorElement;
}

// TODO(sorvell): factor path fixup for easier reuse; parts are currently
// needed by HTMLImports and ShadowDOM style shimming.
function resolveUrlsInCssText(cssText, url) {
  return HTMLImports.path.resolveUrlsInCssText(cssText,
      getUrl(url));
}

function resolveUrlsInStyle(style) {
  return HTMLImports.path.resolveUrlsInStyle(style);
}

// TODO(sorvell): use a common loader shared with HTMLImports polyfill
// currently, this just loads the first @import per style element 
// and does not recurse into loaded elements; we'll address this with a 
// generalized loader that's built out of the one in the HTMLImports polyfill.
// polyfill the loading of a style element's @import via xhr
function polyfillLoadStyle(style, callback) {
  HTMLImports.xhr.load(atImportUrlFromStyle(style), function (err, resource,
      url) {
    replaceAtImportWithCssText(this, url, resource);
    this.textContent = resolveUrlsInCssText(this.textContent, url);
    callback && callback(this);
  }, style);
}

var atImportRe = /@import\s[(]?['"]?([^\s'";)]*)/;

// get the first @import rule from a style
function atImportUrlFromStyle(style) {
  var matches = style.textContent.match(atImportRe);
  return matches && matches[1];
}

function replaceAtImportWithCssText(style, url, cssText) {
  var re = new RegExp('@import[^;]*' + url + '[^;]*;', 'i');
  style.textContent = style.textContent.replace(re, cssText);
}

// exports
loader.resolveUrlsInCssText = resolveUrlsInCssText;
loader.resolveUrlsInStyle = resolveUrlsInStyle;
scope.loader = loader;

})(window.Platform);
