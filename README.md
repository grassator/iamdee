# iamdee

[![NPM version](https://badge.fury.io/js/iamdee.svg)](https://npmjs.org/package/iamdee)
[![Build Status][travis-image]][travis-url]

[project-url]: https://github.com/grassator/iamdee
[travis-url]: https://travis-ci.org/grassator/iamdee
[travis-image]: https://travis-ci.org/grassator/iamdee.svg?branch=master


Small AMD loader designed for inlining into the page – just ~1.1Kb (~640 bytes gzipped). It has original `require.js`-compatible API and should be a stand-in replacement if you don't require advanced features like plugins, paths or shims. 

## Usage

Add inline script from the minified file from the `dist` folder into your page. Then in your code you can use regular `require` / `define` functions:

```js
require(['your-dependency'], function (yourDependency) {
    // your code
});
```

or

```js
define(['your-dependency'], function (yourDependency) {
    // your code
});
```

## Supported Features

* Named modules
* Anonymous modules
* `baseUrl` config

## Browser Support

* Evergreen (Chrome, Firefox, Opera, Safari, Edge)
* IE9+

## Error Codes

To save bytes iamdee does not include moduleError message strings and
instead uses moduleError codes. Meaning of each code is presented below:

1. define() call without id only works when script is loaded via require().
2. require()'d module must not have id in its define() statement or match
the one specified in the requesting require() statement.
3. Synchronous require of the form `const foo = require("foo")` is only allowed for already loaded modules.
4. Module loading failed because its dependency failed to load. The name of the failed dependency is written after the error code.
5. Failed to load the script. Usually this indicates a network or a security policy error. 

## License

The MIT License (MIT)

Copyright (c) 2018 Dmitriy Kubyshkin

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
