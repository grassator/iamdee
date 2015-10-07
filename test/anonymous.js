describe('iamdee', function () {
    var assert = referee.assert;

    it('should be able to load an anonymous module without dependencies', function (done) {
        require(['anonymous-no-dependencies'], function (module) {
            assert.equals(module, 'OK');
            done();
        });
    });

    it('should be able to load an anonymous module with dependencies', function (done) {
        require(['anonymous-with-dependencies'], function (module) {
            assert.equals(module.a, 'A');
            assert.equals(module.b.self, 'B');
            assert.equals(module.b.sub, 'C');
            done();
        });
    });

    it('should be able to load an anonymous module with circular dependencies', function (done) {
        require(['anonymous-circular-dependencies'], function (module) {
            assert.equals(module.a.getter(), 'OK');
            assert.equals(module.b(), 'OK');
            done();
        });
    });

    it('should be able to load an anonymous module with relative dependencies', function (done) {
        require(['anonymous-relative-dependencies'], function (module) {
            assert.equals(module.a, 'A');
            assert.equals(module.b.self, 'B');
            assert.equals(module.b.sub, 'C');
            done();
        });
    });

});
