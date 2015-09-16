define('named-circular-dependencies/b', ['named-circular-dependencies/a'], function (b) {
    return function () {
        return require('named-circular-dependencies/a').getter();
    };
});