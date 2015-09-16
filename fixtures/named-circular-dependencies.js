define('named-circular-dependencies', [
    'named-circular-dependencies/a',
    'named-circular-dependencies/b'
], function (a, b) {
    return { a: a, b: b };
});