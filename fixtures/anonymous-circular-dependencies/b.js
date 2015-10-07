define(['anonymous-circular-dependencies/a'], function () {
    return function () {
        return require('anonymous-circular-dependencies/a').getter();
    };
});
