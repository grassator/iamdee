define('anonymous-circular-dependencies/b', ['anonymous-circular-dependencies/a'], function (b) {
    return function () {
        return require('anonymous-circular-dependencies/a').getter();
    };
});
