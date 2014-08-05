# hogan-i18n

Provides a new compile option that translates templates **prior** to rendering.
While [lambda functions can be used](http://stackoverflow.com/questions/9211217/how-is-internationalization-configured-for-hogan-js)
to support i18n in mustache templates,
[Hogan.js](https://github.com/twitter/hogan.js) does not support lambda
functions in pre-compiled templates. Pre-compiling templates offers both
bandwidth and start-up performance benefits, which hogan-i18n enables users to
take advantage of while still supporting i18n. Developers can use
`hogan-i18n.compile(text, options, gettext)` as part of their toolchain when
building client-side assets.

## Usage example

```javascript

var hogan = require('hogan-i18n'),
    Gettext = require("node-gettext"),
    gt = new Gettext(),
    gettext = function(str) { return gt.gettext(str) },
    fileContents = fs.readFileSync("es.po");

gt.addTextdomain("es", fileContents);

var text =  [
  "<em>",
    "{{_i}}", // notice the opening and closing i18n tags
      "My name is {{name}}.",
    "{{/i}}",
  "</em>"
].join('');

// Only change needed is to call compile with a gettext function that
// will translate the given string.
var content = hogan.compile(text, {asString: true}, gettext);

// then whatever you need to do to incorporate in your build...

template.render({name: "Chad"});
// Mi nombre es Chad.

```

## getstrings

getstrings is cli tool to extract all strings from your mustache templates
and put them into a .po file for translation.

```bash

bin/getstrings templates/

# You can also specify an extension to use other than the default .mustache
# Here specifying .html

bin/getstrings templates/ html

```

## Limitations

hogan-i18n doesn't support options like pluralization, just simple
string-for-string lookup. The mustache templating syntax just isn't expressive
enough for these tasks. If you'd like to control pluralization, I suggest the
following convention.

```mustache

{{#plural}}
{{_i}}She has {{num}} votes.{{/i}}
{{/plural}}

<!-- Ella tiene 3 votos. -->

{{^plural}}
{{_i}}She has one vote.{{/i}}
{{/plural}}

<!-- Ella tiene un voto. -->

```

## How does it work?

The nice folks maintaining hogan provide a scan and parse function that exposes
an AST. hogan-i18n walks that tree to find {{_i}}{{/i}} nodes and translates
any strings before creating the final template. It will remove {{_i}}{{/i}} tags
and just keep the translated content within them.
