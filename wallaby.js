

var Babel = require('babel');

module.exports = function (wallaby) {

    return {
        files: [
            {
                pattern: 'src/tests/no-instrument/*.js',
                instrument: false
            },
            'src/**/*.js',
            {
                pattern: 'src/**/tests/*.spec.js',
                ignore: true
            },
            {
                pattern: 'src/react-devtools/**/*.js',
                instrument: false
            },
            {
                pattern: 'src/testHelpers/**/*',
                instrument: false
            },
            {
                pattern: 'src/react-devtools/frontend/**/*.js',
                ignore: true
            },
            {
                pattern: 'src/react-devtools/plugins/**/*.js',
                ignore: true
            }],

        tests: ['src/**/*.spec.js'],
        env: {
            type: 'node',
            runner: 'node'
        },

        compilers: {
            '**/*.js': wallaby.compilers.babel({
                babel: Babel
            }),
            '**/*.jsx': wallaby.compilers.babel({
                babel: Babel
            })
        },

        bootstrap: function () {
            // process.env.UNEXPECTED_DEPTH = '100';
        }
    };
};
