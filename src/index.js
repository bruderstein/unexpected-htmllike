
import ArrayChanges from 'array-changes';
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

    return function (expectedAdapter, actual, expected, output, diffFn, inspect, equal, options) {

        const diffResult = diff.diffElements(actualAdapter, expectedAdapter, actual, expected, equal, options);

        const pen = output.clone();
        Painter(pen, diffResult.diff, inspect, diffFn);

        return {
            output: pen,
            diff: diffResult.diff,
            weight: diffResult.weight
        };
    };
}

function getContains(actualAdapter) {

    return function (expectedAdapter, actual, expected, output, diffFn, inspect, equal, options) {

        const result = Contains(actualAdapter, expectedAdapter, actual, expected, equal, options);

        if (result.bestMatch) {
            const pen = output.clone();
            Painter(pen, result.bestMatch.diff, inspect, diffFn);
            result.bestMatch.output = pen;
        }
        return result;
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