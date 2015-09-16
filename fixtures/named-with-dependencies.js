define('named-with-dependencies', [
    'named-with-dependencies/a',
    'named-with-dependencies/b'
], function (a, b) {
    return { a: a, b: b };
});