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
(function (undefined) {
    var REQUIRE_KEY = 'require';
    var EXPORTS_KEY = 'exports';
    var MODULE_KEY = 'module';
    var REPLACE_KEY = 'replace';

    var doc = document;
    var loading = {};
    var defined = {};
    var loaded = {};
    var baseUrl = './';
    var currentlyDefinedDependencies;
    var currentlyDefinedFactory;
    var currentlyDefinedModule;
    var el;
    var tmp1;

    /**
     * This is basically a `typeof` operator wrapped in a function.
     * The only difference is that since all basic types:
     *   object, boolean, function, string, number and undefined
     * start with a different letter, this letter is used for
     * comparison instead of the whole type name.
     * @param {*} something
     * @param firstLetterOfTypeName
     * @returns {boolean}
     */
    function isType(something, firstLetterOfTypeName) {
        return (typeof something)[0] == firstLetterOfTypeName;
    }

    function req(dependencyNames, callback, ctx, basePath) {
        // synchronous require statement
        if (isType(dependencyNames, 's')) {
            return loaded[dependencyNames][EXPORTS_KEY];
        }

        // Require statement should not fail if callback is not provided.
        // We use isType here because it's minimal pure function that just
        // so happens to accept any arguments and not fail.
        callback = callback || isType;
        basePath = basePath || '';
        ctx = ctx || {};
        ctx[REQUIRE_KEY] = req;

        var dependencyCount = dependencyNames.length;
        var remainingLoadCount = dependencyCount;
        var i;
        var src;
        var id;

        function loadHandler() {
            if (--remainingLoadCount <= 0) {
                tmp1 = [];
                i = dependencyCount;
                while (i--) {
                    tmp1[i] = ctx[dependencyNames[i]] || loaded[dependencyNames[i]][EXPORTS_KEY];
                }
                callback.apply(undefined, tmp1);
            }
        }

        // checking how many we need to load
        i = dependencyCount;
        while (i--) {
            id = src = dependencyNames[i];
            if (!/^\/|^\w+:|\.js$/.test(id)) {
                if (id[0] == '.') {
                    id = basePath[REPLACE_KEY](/[^/]+$/, '') + id;
                    while(id != dependencyNames[i]) {
                        dependencyNames[i] = id;
                        id = id[REPLACE_KEY](/\/\.?\//, '/')[REPLACE_KEY](/[^\/]+\/\.\.\//, '');
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
                    // need to add new script to the browser
                    el = doc.createElement('script');
                    el.onload = doDefine.bind(undefined, id);
                    el.src = src;
                    doc.head.appendChild(el);
                }
            }
        }

        remainingLoadCount || setTimeout(loadHandler);
    }

    (requirejs = require = req).config = function (conf) { // eslint-disable-line
        baseUrl = conf.baseUrl || baseUrl;
    };

    function doDefine(id) {
        var dependencies = currentlyDefinedDependencies;
        var factory = currentlyDefinedFactory;
        var ctx;
        var module;
        var result;
        if (defined[id] || (currentlyDefinedModule && currentlyDefinedModule !== id)) {
            return;
        }
        (defined[id] = function () {
            if (!loading[id]) {
                return;
            }
            ctx = {};
            module = ctx[MODULE_KEY] = loaded[id] = {};
            ctx[EXPORTS_KEY] = module[EXPORTS_KEY] = {};
            module.id = id;
            req(dependencies, function () {
                result = isType(factory, 'o') ? factory : factory.apply(undefined, arguments);
                if (result !== undefined) {
                    module[EXPORTS_KEY] = result;
                }
                while ((tmp1 = loading[id].shift())) {
                    tmp1();
                }
                loading[id] = undefined;
            }, ctx, id);
        })();
    }

    function def(id, dependencies, factory) {

        // Adjust arguments for anonymous modules
        if (!isType(id, 's')) {
            factory = dependencies;
            dependencies = id;
            id = undefined;
        }

        // If module doesn't specify array of dependencies with assume default ones
        if (!Array.isArray(dependencies)) {
            factory = dependencies;
            dependencies = [REQUIRE_KEY, EXPORTS_KEY, MODULE_KEY];
        }

        // We have to reassign to captured variables to support anonymous modules
        currentlyDefinedDependencies = dependencies;
        currentlyDefinedFactory = factory;
        currentlyDefinedModule = id;

        // if this is a named module we can define it right away,
        // which doesn't work for anonymous where we have to wait
        // for script onload callback to know the id of the module
        if (id) {
            doDefine(id);
        }
    }

    def.amd = loaded;
    define = def; // eslint-disable-line
}());
