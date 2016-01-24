export default function(file, api) {
    const j = api.jscodeshift;
    const {expression, statement, statements} = j.template;

    return j(file.source)
        .find(j.CallExpression, { callee: { name: 'expect' }, arguments: [
            { type: 'ObjectExpression' },
            { type: 'Literal', value: 'when diffed against' },
            { type: 'ObjectExpression' }
        ]})
        .replaceWith(
            p => {
                var remainingArgs = Array.prototype.slice.call(p.value.arguments, 3);
                var newArgs = [];
                newArgs.push(j.callExpression(j.identifier('createActual'), [p.value.arguments[0]]));
                newArgs.push(p.value.arguments[1]);
                newArgs.push(j.callExpression(j.identifier('createExpected'), [p.value.arguments[2]]));

                newArgs = newArgs.concat(remainingArgs);
                return j.callExpression(j.identifier('expect'),  newArgs);

            }
        )
        .toSource();
};
