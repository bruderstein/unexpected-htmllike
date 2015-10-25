import ArrayChanges from 'array-changes';
import ObjectAssign from 'object-assign';
import isNativeType from './isNativeType';
import convertToDiff from './convertToDiff';
import LineBreaker from './lineBreaker';
import Weights from './Weights';

// Weightings for diff heuristics

const DefaultWeights = {
    OK: 0,                  // Only here as a convenience for tests, WEIGHT_OK is used as the constant
    NATIVE_NONNATIVE_MISMATCH: 15,
    NAME_MISMATCH: 10,
    ATTRIBUTE_MISMATCH: 1,
    ATTRIBUTE_MISSING: 1,
    ATTRIBUTE_EXTRA: 1,     // Actual contains an attribute that is not expected
    STRING_CONTENT_MISMATCH: 3,
    CONTENT_TYPE_MISMATCH: 1,
    CHILD_MISSING: 2,
    CHILD_INSERTED: 2,
    WRAPPER_REMOVED: 3
};

const defaultOptions = {
    diffExtraAttributes: true,
    diffRemovedAttributes: true,
    diffExtraChildren: true,
    diffMissingChildren: true,
    diffWrappers: true
};

const WEIGHT_OK = 0;

const WRAP_WIDTH = 80;


function diffElements(actualAdapter, expectedAdapter, actual, expected, equal, options) {

    options = ObjectAssign({}, defaultOptions, options);
    options.weights = ObjectAssign({}, DefaultWeights, options.weights);

    const diffResult = diffElementOrWrapper(actualAdapter, expectedAdapter, actual, expected, equal, options);
    return {
        diff: diffResult.diff,
        weight: diffResult.weight.real
    };

}

function diffElementOrWrapper(actualAdapter, expectedAdapter, actual, expected, equal, options) {

    let diffResult = diffElement(actualAdapter, expectedAdapter, actual, expected, equal, options);

    if (diffResult.weight.real !== WEIGHT_OK &&
        !isNativeType(actual)) {

        const actualChildren = actualAdapter.getChildren(actual);

        if (actualChildren.length === 1) {
            // Try as wrapper
            const wrapperResult = diffElementOrWrapper(actualAdapter, expectedAdapter, actualChildren[0], expected, equal, options);
            const wrapperWeight = options.diffWrappers ? options.weights.WRAPPER_REMOVED : WEIGHT_OK;
            if ((wrapperWeight + wrapperResult.weight.real) < diffResult.weight.real) {
                // It is (better as) a wrapper.
                diffResult = {
                    diff: convertToDiff(actualAdapter, actual, { includeChildren: false }),
                    weight: wrapperResult.weight.addTotal(options.weights.WRAPPER_REMOVED)
                };
                if (options.diffWrappers) {
                    diffResult.diff.diff = {
                        type: 'wrapper'
                    };
                    diffResult.weight.addReal(options.weights.WRAPPER_REMOVED);
                } else {
                    diffResult.diff.type = 'WRAPPERELEMENT';
                }

                diffResult.diff.children = [wrapperResult.diff];

            }
        }
    }

    return diffResult;
}


function diffElement(actualAdapter, expectedAdapter, actual, expected, equal, options) {

    const weights = new Weights();
    let diffResult = {};

    const actualIsNative = isNativeType(actual);
    const expectedIsNative = isNativeType(expected);
    if (actualIsNative && expectedIsNative) {

        diffResult.type = 'CONTENT';
        diffResult.value = actual;

        if (actual !== expected) {
            diffResult.diff = {
                type: 'changed',
                expectedValue: expected
            };
            if ('' + actual !== '' + expected) {
                weights.add(options.weights.STRING_CONTENT_MISMATCH);
            } else {
                weights.add(options.weights.CONTENT_TYPE_MISMATCH);
            }
        }

        return {
            diff: diffResult,
            weight: weights
        };
    }

    if (actualIsNative && !expectedIsNative) {
        weights.add(options.weights.NATIVE_NONNATIVE_MISMATCH);
        diffResult.type = 'CONTENT';
        diffResult.value = actual;
        diffResult.diff = {
            type: 'contentElementMismatch',
            expected: convertToDiff(expectedAdapter, expected)
        };

        return {
            diff: diffResult,
            weight: weights
        };
    }

    if (!actualIsNative && expectedIsNative) {
        weights.add(options.weights.NATIVE_NONNATIVE_MISMATCH);
        diffResult = convertToDiff(actualAdapter, actual);
        diffResult.diff = {
            type: 'elementContentMismatch',
            expected: convertToDiff(expectedAdapter, expected)
        };

        return {
            diff: diffResult,
            weight: weights
        };
    }

    const actualName = actualAdapter.getName(actual);
    const expectedName = expectedAdapter.getName(expected);


    diffResult.type = 'ELEMENT';
    diffResult.name = actualName;

    if (actualName !== expectedName) {
        diffResult.diff = {
            type: 'differentElement',
            expectedName: expectedName
        };
        weights.add(options.weights.NAME_MISMATCH);
    }

    const attribResult = diffAttributes(actualAdapter.getAttributes(actual), expectedAdapter.getAttributes(expected), equal, options);
    diffResult.attributes = attribResult.diff;
    weights.addWeight(attribResult.weight);

    const contentResult = diffContent(actualAdapter, expectedAdapter, actualAdapter.getChildren(actual), expectedAdapter.getChildren(expected), equal, options);
    diffResult.children = contentResult.diff;
    weights.addWeight(contentResult.weight);

    return {
        diff: diffResult,
        weight: weights
    };

}

function diffAttributes(actualAttributes, expectedAttributes, equal, options) {

    let diffWeights = new Weights();
    const diffResult = [];


    Object.keys(actualAttributes).forEach(attrib => {

        const attribResult = { name: attrib, value: actualAttributes[attrib] };
        diffResult.push(attribResult);

        if (expectedAttributes.hasOwnProperty(attrib)) {
            if (!equal(actualAttributes[attrib], expectedAttributes[attrib])) {
                diffWeights.add(options.weights.ATTRIBUTE_MISMATCH);
                attribResult.diff = {
                    type: 'changed',
                    expectedValue: expectedAttributes[attrib]
                };
            }
        } else {
            if (options.diffExtraAttributes) {
                diffWeights.addReal(options.weights.ATTRIBUTE_EXTRA);
                attribResult.diff = {
                    type: 'extra'
                };
            }

            diffWeights.addTotal(options.weights.ATTRIBUTE_EXTRA);
        }
    });

    Object.keys(expectedAttributes).forEach(attrib => {

        if (!actualAttributes.hasOwnProperty(attrib)) {
            if (options.diffRemovedAttributes) {
                diffWeights.addReal(options.weights.ATTRIBUTE_MISSING);
                const attribResult = {
                    name: attrib,
                    diff: {
                        type: 'missing',
                        expectedValue: expectedAttributes[attrib]
                    }
                };
                diffResult.push(attribResult);
            }
            diffWeights.addTotal(options.weights.ATTRIBUTE_MISSING);
        }
    });

    return {
        diff: diffResult,
        weight: diffWeights
    };
}

function diffContent(actualAdapter, expectedAdapter, actual, expected, equal, options) {

    let bestWeight = null;
    let bestDiff = null;

    // Optimize the common case of being exactly one child, ie. an element wrapping something
    if (actual.length === 1 && expected.length === 1) {

        // It's a single element, then just directly compare the elements
        const singleElementDiff = diffElement(actualAdapter, expectedAdapter, actual[0], expected[0], equal, options);
        bestDiff = [singleElementDiff.diff];
        bestWeight = singleElementDiff.weight;
    }

    if (!bestWeight || bestWeight.real !== WEIGHT_OK) {
        const childrenResult = diffChildren(actualAdapter, expectedAdapter, actual, expected, equal, options);

        if (!bestWeight || childrenResult.weight.real < bestWeight.real) {
            bestDiff = childrenResult.diff;
            bestWeight = childrenResult.weight;
        }
    }

    if ((!bestWeight || bestWeight.real !== WEIGHT_OK) &&
        actual.length === 1 &&
        !isNativeType(actual[0])) {
        // Try it as a wrapper, and see if it's better
        // Also covered here is a wrapper around several children

        const actualChildren = actualAdapter.getChildren(actual[0]);
        const wrapperResult = diffContent(actualAdapter, expectedAdapter, actualChildren, expected, equal, options);
        const wrapperWeight = options.diffWrappers ? options.weights.WRAPPER_REMOVED : WEIGHT_OK;

        if (!bestWeight || (wrapperWeight + wrapperResult.weight.real) < bestWeight.real) {
            // It could be a wrapper
            bestWeight = wrapperResult.weight;
            bestWeight.addTotal(options.weights.WRAPPER_REMOVED);
            const actualDiff = convertToDiff(actualAdapter, actual[0], { includeChildren: false });
            actualDiff.children = wrapperResult.diff;
            if (options.diffWrappers) {
                actualDiff.diff = {
                    type: 'wrapper'
                };
                bestWeight.addReal(options.weights.WRAPPER_REMOVED);
            } else {
                actualDiff.type = 'WRAPPERELEMENT';
            }
            bestDiff = [actualDiff];
        }
    }

    return {
        diff: bestDiff,
        weight: bestWeight
    };
}



function diffChildren(actualAdapter, expectedAdapter, actualChildren, expectedChildren, equal, options) {

    let diffWeights = new Weights();
    const diffResult = [];

    var changes = ArrayChanges(actualChildren, expectedChildren,
        function (a, b) {
            const elementDiff = diffElementOrWrapper(actualAdapter, expectedAdapter, a, b, equal, options);
            return elementDiff.weight.total === WEIGHT_OK;
        },

        function (a, b) {
            // Figure out whether a and b are the same element so they can be diffed inline.
            var aIsNativeType = isNativeType(a);
            var bIsNativeType = isNativeType(b);
            if (aIsNativeType && bIsNativeType) {
                return true;
            }

            if (aIsNativeType !== bIsNativeType) {
                return false;
            }
            // Any element that is not identical, is not similar.
            // We could call diffElementOrWrapper again, and compare the weight to some arbitrary amount,
            // But the amount is dependant on the other items. What is right for one case, will almost certainly be wrong for another

            return false;
        } );

    changes.forEach(diffItem => {

        let itemResult;

        switch(diffItem.type) {
            case 'insert':
                itemResult = convertToDiff(expectedAdapter, diffItem.value);
                if (options.diffMissingChildren) {
                    diffWeights.add(options.weights.CHILD_MISSING);
                    itemResult.diff = {
                        type: 'missing'
                    };
                    diffResult.push(itemResult);
                }
                break;

            case 'remove':
                itemResult = convertToDiff(actualAdapter, diffItem.value);

                if (options.diffExtraChildren) {
                    itemResult.diff = {
                        type: 'extra'
                    };
                    diffWeights.addReal(options.weights.CHILD_INSERTED);
                }
                diffWeights.addTotal(options.weights.CHILD_INSERTED);
                diffResult.push(itemResult);
                break;

            case 'equal':
            default:
                const result = diffElementOrWrapper(actualAdapter, expectedAdapter, diffItem.value, diffItem.expected, equal, options);
                itemResult = result.diff;
                diffWeights.addWeight(result.weight);
                diffResult.push(itemResult);

                break;
        }

    });

    return {
        weight: diffWeights,
        diff: diffResult
    };
}

export default {
    DefaultWeights,
    diffElements
};