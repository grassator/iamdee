define('anonymous-circular-dependencies', [
    'anonymous-circular-dependencies/a',
    'anonymous-circular-dependencies/b'
], function (a, b) {
    return { a: a, b: b };
});
