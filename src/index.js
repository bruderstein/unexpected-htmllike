
import isNativeType from './isNativeType';
import diff from './diff';
import Painter from './painter';
import Contains from './contains';
import convertToDiff from './convertToDiff';

function inspect(adapter, value, depth, output, externalInspector) {

    const diffDescription = convertToDiff(adapter, value);
    Painter(output, diffDescription, externalInspector, null /* no diff function required */);
    return output;
}

function getDiff(actualAdapter) {

    return function (expectedAdapter, actual, expected, output, expect, options) {

        return diff.diffElements(actualAdapter, expectedAdapter, actual, expected, expect, options).then(diffResult => {

            const pen = output.clone();
            Painter(pen, diffResult.diff, expect.inspect.bind(expect), expect.diff.bind(expect));

            return {
                output: pen,
                diff: diffResult.diff,
                weight: diffResult.weight
            };

        });

    };
}

function getContains(actualAdapter) {

    return function (expectedAdapter, actual, expected, output, expect, options) {

        return Contains(actualAdapter, expectedAdapter, actual, expected, expect, options).then(result => {

            if (result.bestMatch) {
                const pen = output.clone();
                Painter(pen, result.bestMatch.diff, expect.inspect.bind(expect), expect.diff.bind(expect));
                result.bestMatch.output = pen;
            }
            return result;
        });

    };
}


function HtmlLikeUnexpected(adapter) {

    return {
        inspect: inspect.bind(null, adapter),
        diff: getDiff(adapter),
        contains: getContains(adapter)
    };
}

HtmlLikeUnexpected.DefaultWeights = diff.DefaultWeights;

export default HtmlLikeUnexpected;