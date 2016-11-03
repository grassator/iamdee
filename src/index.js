/**
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
 */

/**
 * Before reading the source it's important to understand that it
 * deliberately doesn't most follow good practices for writing
 * JavaScript code to save precious bytes.
 *
 * I tried to comment most strange places, but still be warned:
 *      here be dragons...
 */
(function (window, undefined) {
    var doc = document;
    var loading = {};
    var defined = {};
    var loaded = {};
    var baseUrl = './';
    var onNodeCreated;
    var toString = loaded.toString;
    var temp;


    // This will be inlined by closure compiler
    var RJS_PROPERTY = 'rjs';
    var ARRAY_TYPE = 'A';
    var STRING_TYPE = 'S';
    var OBJECT_TYPE = 'O';

    /**
     * This is basically a `typeof` operator wrapped in a function.
     * The only difference is that since all basic types:
     *   object, boolean, function, string, number and undefined
     * start with a different letter, this letter is used for
     * comparison instead of the whole type name.
     * @param {*} something
     * @param {string} firstLetterOfClassName
     * @returns {boolean}
     */
    function isType(something, firstLetterOfClassName) {
        // The way this works is that:
        // ({}).toString.call('foo') === '[object String]'
        // and so if we look at this -------------^ letter
        // it's going an 8th letter and it's different for
        // all basic types in JavaScript and for Array.
        return toString.call(something)[8] == firstLetterOfClassName;
    }

    function loadModule(id, src, el) {
        // need to add new script to the browser
        el = doc.createElement('script');

        // saving the id of the module to a property of the element so that we can
        // later read it inside of the anonymous `define` call
        el[RJS_PROPERTY] = id;

        el.src = src;
        // Allow node to be modified before it is added to the DOM
        if (onNodeCreated) {
            onNodeCreated(el);
        }
        doc.head.appendChild(el);
    }

    function req(dependencyNames, callback, ctx, basePath) {
        // synchronous require statement
        if (isType(dependencyNames, STRING_TYPE)) {
            return loaded[dependencyNames]['exports'];
        }

        // Require statement should not fail if callback is not provided.
        // We use isType here because it's minimal pure function that just
        // so happens to accept any arguments and not fail.
        callback = callback || isType;
        basePath = basePath || '';
        ctx = ctx || {};
        ctx['require'] = req;

        var dependencyCount = dependencyNames.length;
        var remainingLoadCount = dependencyCount;
        var i;
        var src;
        var id;

        function loadHandler() {
            if (--remainingLoadCount <= 0) {
                temp = [];
                i = dependencyCount;
                while (i--) {
                    temp[i] = ctx[dependencyNames[i]] || loaded[dependencyNames[i]]['exports'];
                }
                callback.apply(undefined, temp);
            }
        }

        // checking how many we need to load
        i = dependencyCount;
        while (i--) {
            id = src = dependencyNames[i];
            if (!/^\/|^\w+:|\.js$/.test(id)) {
                if (id[0] == '.') {
                    id = basePath['replace'](/[^/]+$/, '') + id;
                    while(id != dependencyNames[i]) {
                        dependencyNames[i] = id;
                        id = id['replace'](/\/\.?\//, '/')['replace'](/[^\/]+\/\.\.\//, '');
                    }
                }
                src = baseUrl + id + '.js';
            }
            if ((id in loaded) || (id in ctx)) {
                --remainingLoadCount;
            } else if (loading[id]) {
                loading[id].push(loadHandler);
            } else {
                loading[id] = [loadHandler];
                // if script was already loaded but not initialized (e.g. as a part of the bundle)
                if (defined[id]) {
                    defined[id]();
                } else {
                    loadModule(id, src);
                }
            }
        }

        remainingLoadCount || setTimeout(loadHandler);
    }

    (window['requirejs'] = window['require'] = req)['config'] = function (conf) {
        baseUrl = conf['baseUrl'] || baseUrl;
        onNodeCreated = conf['onNodeCreated'];
    };

    function def(id, dependencies, factory) {
        var ctx;
        var module;
        var result;

        // Adjust arguments for anonymous modules by extracting id from the element
        if (!isType(id, STRING_TYPE)) {
            factory = dependencies;
            dependencies = id;
            id = doc['currentScript'][RJS_PROPERTY];
        }

        // If module doesn't specify array of dependencies with assume default ones
        if (!isType(dependencies, ARRAY_TYPE)) {
            factory = dependencies;
            dependencies = ['require', 'exports', 'module'];
        }

        if (defined[id]) {
            return;
        }
        (defined[id] = function () {
            if (!loading[id]) {
                return;
            }
            ctx = {};
            module = ctx['module'] = loaded[id] = {};
            ctx['exports'] = module['exports'] = {};
            module.id = id;
            req(dependencies, function () {
                result = isType(factory, OBJECT_TYPE) ? factory : (factory || isType).apply(undefined, arguments);
                if (result !== undefined) {
                    module['exports'] = result;
                }
                while ((temp = loading[id].shift())) {
                    temp();
                }
                loading[id] = undefined;
            }, ctx, id);
        })();
    }

    def['amd'] = loaded;
    window['define'] = def;
}(this));
