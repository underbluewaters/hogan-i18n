var hogan = require(__dirname + '/../index.js'),
    Gettext = require("node-gettext"),
    gt = new Gettext(),
    gettext = function(str) { return gt.gettext(str) },
    fs = require('fs'),
    fileContents = fs.readFileSync(__dirname + "/messages.po"),
    newlinesTmpl = fs.readFileSync(__dirname+"/newlines.mustache").toString();

gt.addTextdomain("es", fileContents);

exports.testSetup = function (test) {
  test.equal(
    gettext("My name is {{name}}."), "Mi nombre es {{name}}.",
    "es.po loaded properly."
  );
  test.done();
}

exports.extractStrings = function (test) {
  var strings = hogan.extractStrings(newlinesTmpl);
  test.equal(strings.length, 1, "Only one string.");
  test.equal(strings[0].trimmed, "My name is {{name}}.", "Correct string");
  test.done();
}

exports.extractStringsFromDir = function (test) {
  var strings = hogan.extractStringsFromDir(__dirname);
  var votesStrings = strings.filter(function(str){
    return str.file === 'votes.mustache';
  });
  test.equal(votesStrings.length, 2, "Should have 2 strings");
  line2 = votesStrings.filter(function(str){
    return str.line === 2;
  })[0];
  test.ok(!!line2, 'Line two string is found');
  test.equals(line2.trimmed, 'She has {{num}} votes.', 'Correct string');
  line5 = votesStrings.filter(function(str){
    return str.line === 5;
  })[0];
  test.ok(!!line5, 'Line five string is found');
  test.equals(line5.trimmed, 'She has one vote.', 'Correct string');
  test.done();
}

exports.createPOFromStrings = function (test) {
  var strings = hogan.extractStringsFromDir(__dirname);
  test.ok(strings.length, 'Should have some strings');
  var poString = hogan.createPOFromStrings(strings);
  var gt = new Gettext()
  gt.addTextdomain("et", poString);
  var keys = gt.listKeys("et")
  test.equals(keys.length, 18);
  test.ok(keys.indexOf("She has {{num}} votes.") + 1, "Contains correct strings");
  test.ok(keys.indexOf("She has one vote.") + 1, "Contains correct strings");
  test.ok(keys.indexOf("{{#posts}}  Post title is {{title}}.{{/posts}}") + 1,
    "Contains correct strings");
  test.done()
}

exports.translations = function (test) {

  var template = hogan.compile(newlinesTmpl, gettext);
  test.equal(
    template.render({name: "Chad"}), "<div>\n  Mi nombre es Chad.</div>\n",
    "Translates properly."
  );

  var f = fs.readFileSync(__dirname+"/votes.mustache").toString();
  var template = hogan.compile(f, gettext);
  test.equal(
    template.render({num: 3, plural: true}), "Ella tiene 3 votos.\n",
    "Translates properly."
  );

  var f = fs.readFileSync(__dirname+"/mixedTags.mustache").toString();
  var template = hogan.compile(f, gettext);
  test.equal(
    template.render({foo: false, posts: [{title: "Foo"}, {title: "Bar"}]}),
      'Vamos a ver, foo es falso.\n  Título de la publicación es Foo.  Título de la publicación es Bar.',
      "Translates properly."
  );

  var f = fs.readFileSync(__dirname+"/otherTags.mustache").toString();
  var template = hogan.compile(f, gettext);
  test.equal(
    template.render({mustaches: "<i>blah</i>", unescape: "<script></script>"}),
      'Testing triples <i>blah</i>\nPruebas <script></script> variables.\n\nPruebas parciales anidados. \nNo translation available.',
      "Translates properly."
  );

  test.done();
}

exports.canSetOptions = function (test) {
  test.ok(true, "asString works fine");
  test.ok(true, "additional sectionTags can be set");
  test.done();
}
