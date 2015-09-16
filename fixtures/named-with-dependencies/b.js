define('named-with-dependencies/b', ['named-with-dependencies/sub/c'], function (c) {
    return {
        self: 'B',
        sub: c
    };
});