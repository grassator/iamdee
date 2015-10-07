describe('DAM:anonymous', function () {

    it('should be able to load an anonymous module without dependencies', function (done) {
        require(['anonymous-no-dependencies'], function (module) {
            assert.equal(module, 'OK');
            done();
        });
    });

    it('should be able to load an anonymous module with dependencies', function (done) {
        require(['anonymous-with-dependencies'], function (module) {
            assert.equal(module.a, 'A');
            assert.equal(module.b.self, 'B');
            assert.equal(module.b.sub, 'C');
            done();
        });
    });

    it('should be able to load an anonymous module with circular dependencies', function (done) {
        require(['anonymous-circular-dependencies'], function (module) {
            assert.equal(module.a.getter(), 'OK');
            assert.equal(module.b(), 'OK');
            done();
        });
    });

    it('should be able to load an anonymous module with relative dependencies', function (done) {
        require(['anonymous-relative-dependencies'], function (module) {
            assert.equal(module.a, 'A');
            assert.equal(module.b.self, 'B');
            assert.equal(module.b.sub, 'C');
            done();
        });
    });

});
