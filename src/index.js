
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

        const result = diff.diffElements(actualAdapter, expectedAdapter, actual, expected, expect, options);

        const outputResult = function (diffResult, expect) {

            const pen = output.clone();
            Painter(pen, diffResult.diff, expect.inspect.bind(expect), expect.diff.bind(expect));

            return {
                output: pen,
                diff: diffResult.diff,
                weight: diffResult.weight
            };
        };

        if (result && typeof result.then === 'function') {
            // Result was a promise, must have been async

            return result.then(diffResult => {
                const paintedOutput = outputResult(diffResult, expect);
                return paintedOutput;
            });
        }

        // Returned result directly, hence everything was doable sync
        return outputResult(result, expect);
    };
}

function getContains(actualAdapter) {

    return function (expectedAdapter, actual, expected, output, expect, options) {

        const result = Contains(actualAdapter, expectedAdapter, actual, expected, expect, options);

        const convertOutput = containsResult => {
            if (containsResult.bestMatch) {
                const pen = output.clone();
                Painter(pen, containsResult.bestMatch.diff, expect.inspect.bind(expect), expect.diff.bind(expect));
                containsResult.bestMatch.output = pen;
            }
            return containsResult;
        };
        if (result && typeof result.then === 'function') {
            return result.then(containsResult => convertOutput(containsResult));
        }
        return convertOutput(result);
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