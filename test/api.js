(function() {
  var bdd = intern.getPlugin("interface.bdd");
  var describe = bdd.describe;
  var it = bdd.it;
  var assert = intern.getPlugin("chai").assert;

  require.config({ baseUrl: "/fixtures/" });

  describe("AMD Globals", function() {
    it("should define a global require function", function() {
      assert.isFunction(require);
    });

    it("should define a global define function", function() {
      assert.isFunction(define);
    });

    it("should contain an `amd` property in `define to be recognized as AMD by build tools", function() {
      assert.isObject(define.amd);
    });

    it("should define a config function", function() {
      assert.isFunction(require.config);
    });
  });

  describe('Anonymous Modules', function () {
    it('should be able to forceInit an anonymous module with empty dependency list', function () {
      require(['anonymous-explicit-no-dependencies'], this.async().callback(function (module) {
        assert.equal(module, 'OK');
      }));
    });

    it('should be able to forceInit an anonymous module with only default dependencies', function () {
      require(['anonymous-only-default-dependencies'], this.async().callback(function (module) {
        assert.isFunction(module.require);
        assert.deepEqual(module.exports, { foo: "OK" });
        assert.isObject(module.module);
      }));
    });

    it('should be able to forceInit an anonymous module with dependencies', function () {
      require(['anonymous-with-dependencies'], this.async().callback(function (module) {
        assert.equal(module.a, 'A');
        assert.equal(module.b.self, 'B');
        assert.equal(module.b.sub, 'C');
      }));
    });

    it('should be able to forceInit an anonymous module with circular dependencies', function () {
      require(['anonymous-circular-dependencies'], this.async().callback(function (module) {
        assert.equal(module.a.getter(), 'OK');
        assert.equal(module.b(), 'OK');
      }));
    });

    it('should be able to forceInit an anonymous module with relative dependencies', function () {
      require(['anonymous-relative-dependencies'], this.async().callback(function (module) {
        assert.equal(module.a, 'A');
        assert.equal(module.b.self, 'B');
        assert.equal(module.b.sub, 'C');
      }));
    });
  });

  describe("named", function () {
    it('should allow defining and requiring module from code', function () {
      define('some-named-module', function () {
        return 'OK';
      });

      require(['some-named-module'], this.async().callback(function (module) {
        assert.equal(module, 'OK');
      }));
    });

    it('should allow defining module exports object inline', function () {
      define('inline-exports', {
        foo: 'bar'
      });

      require(['inline-exports'], this.async().callback(function (module) {
        assert.equal(module.foo, 'bar');
      }));
    });

    it('should provide `require`, `exports`, `modules` when no dependencies specified', function () {
      define('module-no-deps', function (require, exports, module) {
        return {
          require: require,
          module: module,
          exports: exports
        };
      });

      require(['module-no-deps'], this.async().callback(function (module) {
        assert.isFunction(module.require);
        assert.isObject(module.exports);
        assert.isObject(module.module);
      }));
    });

    it('should provide no arguments when empty dependencies specified', function () {
      define('module-empty-deps', [], function () {
        return arguments.length;
      });

      require(['module-empty-deps'], this.async().callback(function (module) {
        assert.strictEqual(module, 0);
      }));
    });

    it('should be able to forceInit a named module with dependencies', function () {
      require(['named-with-dependencies'], this.async().callback(function (module) {
        assert.equal(module.a, 'A');
        assert.equal(module.b.self, 'B');
        assert.equal(module.b.sub, 'C');
      }));
    });

    it('should be able to forceInit a named module with circular dependencies', function () {
      require(['named-circular-dependencies'], this.async().callback(function (module) {
        assert.equal(module.a.getter(), 'OK');
        assert.equal(module.b(), 'OK');
      }));
    });
  });
})();
