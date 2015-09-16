define('named-circular-dependencies/a', ['named-circular-dependencies/b'], function () {
    return {
        payload: 'OK',
        getter: function () {
            return require('named-circular-dependencies/a').payload;
        }
    };
});