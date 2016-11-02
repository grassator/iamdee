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

## License

Copyright 2015 Dmitriy Kubyshkin

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
