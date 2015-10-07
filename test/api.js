describe('iamdee API', function () {
    var assert = referee.assert;

    it('should define a global require function', function () {
        assert.isFunction(require);
    });

    it('should define a global define function', function () {
        assert.isFunction(define);
    });

    it('should contain an `amd` property in `define to be recognized as AMD by build tools', function () {
        assert.isObject(define.amd);
    });

    it('should define a config function', function () {
        assert.isFunction(require.config);
    });

});
