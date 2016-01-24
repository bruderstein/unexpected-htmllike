export default function(file, api) {
    const j = api.jscodeshift;
    const {expression, statement, statements} = j.template;

    return j(file.source)
        .find(j.CallExpression, { callee: { name: 'expect' }, arguments: [
            { type: 'ObjectExpression' },
            { type: 'Literal', value: 'to inspect as' },
            { type: 'Literal' }
        ]})
        .replaceWith(
            p => {
                var remainingArgs = Array.prototype.slice.call(p.value.arguments, 1);
                var newArgs = [];
                newArgs.push(j.callExpression(j.identifier('createActual'), [p.value.arguments[0]]));

                newArgs = newArgs.concat(remainingArgs);
                return j.callExpression(j.identifier('expect'),  newArgs);

            }
        )
        .toSource();
};
