
import Diff from './diff';
import isNativeType from './isNativeType';

function contains(actualAdapter, expectedAdapter, actual, expected, equal, options) {

    const result = containsContent(actualAdapter, expectedAdapter, actual, expected, equal, options);

    // If result has WRAPPERELEMENTs around it, remove them
    if (!result.found) {
        stripWrapperElements(actualAdapter, result);
    }

    return result;
}

function stripWrapperElements(actualAdapter, containsResult) {

    if (containsResult.bestMatch && containsResult.bestMatch.diff.type === 'WRAPPERELEMENT') {
        // Unwrap the diff and the item
        containsResult.bestMatch.diff = containsResult.bestMatch.diff.children[0];
        containsResult.bestMatchItem = actualAdapter.getChildren(containsResult.bestMatchItem)[0];
        return stripWrapperElements(actualAdapter, containsResult);
    }
    return containsResult;
}


function containsContent(actualAdapter, expectedAdapter, actual, expected, equal, options) {

    let result = {
        found: false,
        bestMatch: null,
        bestMatchItem: null
    };

    let diffResult = Diff.diffElements(actualAdapter, expectedAdapter, actual, expected, equal, options);
    if (diffResult.weight === Diff.DefaultWeights.OK) {
        result.found = true;
        return result;
    }
    result.bestMatch = diffResult;
    result.bestMatchItem = actual;

    if (!isNativeType(actual)) {
        const children = actualAdapter.getChildren(actual);
        if (children) {
            for(let index = 0; index < children.length; ++index) {
                const child = children[index];
                const childResult = containsContent(actualAdapter, expectedAdapter, child, expected, equal, options);
                // If we've found it, return the result immediately
                if (childResult.found) {
                    result.found = true;
                    result.bestMatch = null;
                    return result;
                }

                if (!result.bestMatch || childResult.bestMatch.weight < result.bestMatch.weight) {
                    result.bestMatch = childResult.bestMatch;
                    result.bestMatchItem = childResult.bestMatchItem;
                }
            }
        }
    }

    return result;

}

export default contains;