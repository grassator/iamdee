describe('iamdee', function () {
    var assert = referee.assert;

    it('should allow defining and requiring module from code', function (done) {
        define('some-named-module', function () {
            return 'OK';
        });

        require(['some-named-module'], function (module) {
            assert.equals(module, 'OK');
            done();
        });
    });

    it('should allow defining module exports object inline', function (done) {
        define('inline-exports', {
            foo: 'bar'
        });

        require(['inline-exports'], function (module) {
            assert.equals(module.foo, 'bar');
            done();
        });
    });

    it('should provide `require`, `exports`, `modules` when no dependencies specified', function (done) {
        define('module-no-deps', function (require, module, exports) {
            return {
                require: require,
                module: module,
                exports: exports
            };
        });

        require(['module-no-deps'], function (module) {
            assert.isFunction(module.require);
            assert.isObject(module.exports);
            assert.isObject(module.module);
            done();
        });
    });

    it('should provide no arguments when empty dependencies specified', function (done) {
        define('module-empty-deps', [], function () {
            return arguments.length;
        });

        require(['module-empty-deps'], function (module) {
            assert.same(module, 0);
            done();
        });
    });

    it('should be able to load a named module without dependencies', function (done) {
        require(['named-no-dependencies'], function (module) {
            assert.equals(module, 'OK');
            done();
        });
    });

    it('should be able to load a named module with dependencies', function (done) {
        require(['named-with-dependencies'], function (module) {
            assert.equals(module.a, 'A');
            assert.equals(module.b.self, 'B');
            assert.equals(module.b.sub, 'C');
            done();
        });
    });

    it('should be able to load a named module with circular dependencies', function (done) {
        require(['named-circular-dependencies'], function (module) {
            assert.equals(module.a.getter(), 'OK');
            assert.equals(module.b(), 'OK');
            done();
        });
    });

});
