
function shortFunc(a, b) { return a + b; }

function longFunc(a, b) {
    console.log('This ia long func', a + b);
    console.log('With multiple lines');
}

function longFunc2(a, b) {
    console.log('This ia long func', a + b);
    console.log('With multiple lines that are different');
}

function shortMultiLine(a, b) {
    return a + b;
}

function longSingleLine(a, b) { console.log('this is a long function that is only on one line'); console.log('All javascript functions should be written like this'); }

module.exports = { shortFunc, longFunc, longFunc2, shortMultiLine, longSingleLine };
