var hogan = require('hogan.js'),
    Gettext = require("node-gettext"),
    walk = require('walkdir'),
    fs = require('fs'),
    path = require('path');

function extractStrings (nodes, originalText, filename, strings) {
  filename = filename || "";
  strings = strings || [];
  if (typeof currentString !== 'string') {
    currentString = "";
  }
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    // look for _i tag
    if (node.tag === '#' || node.tag === "^" || node.tag === '$' || node.tag === '<') {
      if (node.n === '_i') {
        var string = extractString(node, originalText, filename);
        strings.push(string);
      } else {
        extractStrings(node.nodes, originalText, filename, strings);
      }
    }
  }
  return strings;
}

function replaceStrings (nodes, gettext, originalText, filename, options) {
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    // look for _i tag
    if (node.tag === '#' || node.tag === "^" || node.tag === '$' || node.tag === '<') {
      if (node.n === '_i') {
        var string = extractString(node, originalText, filename).trimmed;
        var translated = gettext(string);
        var replacement = hogan.parse(
          hogan.scan(translated, options.delimiters), translated, options);
        Array.prototype.splice.apply(nodes, [i, 1].concat(replacement));
      } else {
        replaceStrings(node.nodes, gettext, originalText, filename, options);
      }
    }
  }
}

function extractString (parent, originalText, filename) {
  var nodes = parent.nodes;
  var string = {original: ""}
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    if (node.tag === '#' && node.n === '_i') {
        throw new Error('Nested {{_i}} tags not allowed!');
    } else {
      // if text, add to string
      switch (node.tag) {
        case '_t':
          for (var key in node.text) {
            if (node.text.hasOwnProperty(key)) {
              string.original += node.text[key];
            }
          }
          break;
        case '#':
        case '^':
          string.original += node.otag + node.tag + node.n + node.ctag;
          string.original += extractString(node, originalText, filename).original;
          string.original += node.otag + "/" + node.n + node.ctag;
          break;
        case '\n':
          string.original += '\n';
          break;
        case '{':
          string.original += "{" + node.otag + node.n + node.ctag + "}";
          break;
        case '>':
          string.original += node.otag + "> " + node.n + node.ctag;
          break;
        case '&':
          string.original += node.otag + "& " + node.n + node.ctag;
          break;
        case '$':
          string.original += node.otag + "$ " + node.n + node.ctag;
          break;
        case '<':
          string.original += node.otag + "< " + node.n + node.ctag;
          break;
        default:
          string.original += node.otag + node.n + node.ctag;
      }
    }
  }
  string.trimmed = string.original.trim().replace('\n', '');
  var index = originalText.indexOf(string.original);
  string.line = originalText.slice(0, parent.i).split('\n').length
  if (filename.length) {
    string.file = filename;
  }
  return string;
}

module.exports = {
  compile: function(text, options, gettext) {
    if (typeof options === 'function') {
      gettext = options;
      options = {};
    }
    if (!gettext) {
      throw new Error("Must provide a gettext function for translation");
    }
    options.sectionTags = options.sectionTags || [];
    options.sectionTags.push({o: "_i", c: "i"});
    var tree = hogan.parse(hogan.scan(text, options.delimiters), text, options);
    replaceStrings(tree, gettext, text, '', options);
    return hogan.generate(tree, text, options);
  },

  extractStrings: function (text, options, filename) {
    if (typeof options === 'string') {
      filename = options;
      options = null;
    }
    options = options || {};
    options.sectionTags = options.sectionTags || [];
    options.sectionTags.push({o: "_i", c: "i"});
    var tree = hogan.parse(hogan.scan(text, options.delimiters), text, options);
    return extractStrings(tree, text, filename, []);
  },

  extractStringsFromDir: function (dir, options, extension) {
    extension = extension || "mustache";
    var test = new RegExp(extension + "$");
    var paths = walk.sync(dir).filter(function(filename){
      return test.test(filename);
    });
    if (paths.length === 0) {
      throw new Error('Could not find any matching files');
    }
    var self = this;
    var strings = [];
    paths.forEach(function(file){
      var shortPath = path.relative(dir, file);
      var text = fs.readFileSync(file).toString();
      strings = strings.concat(self.extractStrings(text, options, shortPath));
    });
    return strings;
  },

  createPOFromStrings: function (strings) {
    var gt = new Gettext();
    gt.addTextdomain("et")
    for (var i = 0; i < strings.length; i++) {
      var s = strings[i];
      gt.setTranslation('', false, s.trimmed, '');
      gt.setComment('', false, s.trimmed, {code: s.file + ':' + s.line});
    }
    return gt.compilePO("");
  }
}
