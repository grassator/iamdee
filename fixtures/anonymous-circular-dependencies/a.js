define(['anonymous-circular-dependencies/b'], function () {
    return {
        payload: 'OK',
        getter: function () {
            return require('anonymous-circular-dependencies/a').payload;
        }
    };
});
