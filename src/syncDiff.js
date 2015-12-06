import ArrayChanges from 'array-changes';
import ObjectAssign from 'object-assign';
import isNativeType from './isNativeType';
import convertToDiff from './convertToDiff';
import LineBreaker from './lineBreaker';
import Weights from './Weights';
import DiffCommon from './diffCommon';
import RequiresAsyncError from './requiresAsyncError';


function diffElements(actualAdapter, expectedAdapter, actual, expected, expect, options) {

    options = ObjectAssign({}, DiffCommon.defaultOptions, options);
    options.weights = ObjectAssign({}, DiffCommon.DefaultWeights, options.weights);

    var diffResult = diffElementOrWrapper(actualAdapter, expectedAdapter, actual, expected, expect, options)
    return {
        diff: diffResult.diff,
        weight: diffResult.weight.real
    };
}

function diffElementOrWrapper(actualAdapter, expectedAdapter, actual, expected, expect, options) {

    let diffResult = diffElement(actualAdapter, expectedAdapter, actual, expected, expect, options);

    if (diffResult.weight.real !== DiffCommon.WEIGHT_OK && !isNativeType(actual)) {

        const actualChildren = actualAdapter.getChildren(actual);

        if (actualChildren.length === 1) {
            // Try as wrapper
            const wrapperResult = diffElementOrWrapper(actualAdapter, expectedAdapter, actualChildren[0], expected, expect, options)

            const wrapperWeight = options.diffWrappers ? options.weights.WRAPPER_REMOVED : DiffCommon.WEIGHT_OK;
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
            return diffResult;
        }

    }


    return diffResult;

}


function diffElement(actualAdapter, expectedAdapter, actual, expected, expect, options) {

    const weights = new Weights();
    let diffResult = {};

    const actualIsNative = isNativeType(actual);
    const expectedIsNative = isNativeType(expected);

    if (expectedIsNative && typeof expected === 'function' && expected._expectIt) {
        let expectItResult;
        try {
            expectItResult = expected(actual);
        } catch (e) {
            diffResult.type = 'CONTENT';
            diffResult.value = actual;
            diffResult.diff = {
                type: 'custom',
                assertion: expected,
                error: e
            };
            weights.add(options.weights.STRING_CONTENT_MISMATCH);
            return {
                diff: diffResult,
                weight: weights
            };
        }

        if (expectItResult && typeof expectItResult.then === 'function') {
            expectItResult.then(() => {}, () => {});
            throw new RequiresAsyncError();
        }

        diffResult.type = 'CONTENT';
        diffResult.value = actual;

        return {
            diff: diffResult,
            weight: weights
        };
    }

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

    const attributesResult = diffAttributes(actualAdapter.getAttributes(actual), expectedAdapter.getAttributes(expected), expect, options);
    diffResult.attributes = attributesResult.diff;
    weights.addWeight(attributesResult.weight);

    const contentResult = diffContent(actualAdapter, expectedAdapter, actualAdapter.getChildren(actual), expectedAdapter.getChildren(expected), expect, options);

    diffResult.children = contentResult.diff;
    weights.addWeight(contentResult.weight);

    return {
        diff: diffResult,
        weight: weights
    };

}

function diffAttributes(actualAttributes, expectedAttributes, expect, options) {

    let diffWeights = new Weights();
    const diffResult = [];

    Object.keys(actualAttributes).forEach(attrib => {

        const attribResult = { name: attrib, value: actualAttributes[attrib] };
        diffResult.push(attribResult);

        if (expectedAttributes.hasOwnProperty(attrib)) {
            const expectedAttrib = expectedAttributes[attrib];
            if (typeof expectedAttrib === 'function' && expectedAttrib._expectIt) {
                // This is an assertion in the form of expect.it(...)

                let expectItResult;
                try {
                    expectItResult = expectedAttrib(actualAttributes[attrib]);
                } catch (e) {

                    attribResult.diff = {
                        type: 'custom',
                        assertion: expectedAttrib,
                        error: e
                    };

                    diffWeights.add(options.weights.ATTRIBUTE_MISMATCH);
                }

                if (expectItResult && typeof expectItResult.then === 'function') {
                    expectItResult.then(() => {}, () => {});
                    throw new RequiresAsyncError();
                }

            } else if (!expect.equal(actualAttributes[attrib], expectedAttributes[attrib])) {
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

function getClassDiff(actualClasses, expectedClasses, diffResult, weights, options) {

    expectedClasses = (expectedClasses || '')
        .split(' ')
        .filter(c => c)
        .reduce((classes, c) => {
            classes[c] = true;
            return classes;
        }, {});

    actualClasses = (actualClasses || '')
        .split(' ')
        .filter(c => c)
        .reduce((classes, c) => {
            classes[c] = true;
            return classes;
        }, {});


    let attributeDiff;
    if (options.diffMissingClasses) {
        const missingClasses = Object.keys(expectedClasses).filter(c => !actualClasses[c]);
        if (missingClasses.length) {
            attributeDiff = {};
            attributeDiff.missing = missingClasses.join(' ');
        }
    }

    if (options.diffExtraClasses) {
        const extraClasses = Object.keys(actualClasses).filter(c => !expectedClasses[c]);

        if (extraClasses.length) {
            attributeDiff = attributeDiff || {};
            attributeDiff.extra = extraClasses.join(' ');
        }
    }

    if (attributeDiff) {
        attributeDiff.type = 'class';
        diffResult.diff = attributeDiff;
        // Not sure what the best to do with the weights is
        // - we might need to have some different weights for class mismatches
        // Only real-world examples will help show what needs to be done here
        weights.add(options.weights.ATTRIBUTE_MISMATCH);
    }
}


function diffContent(actualAdapter, expectedAdapter, actual, expected, expect, options) {

    let bestWeight = null;
    let bestDiff = null;

    // Optimize the common case of being exactly one child, ie. an element wrapping something
    // Removed for now, to make this function slightly easier to convert to promises!
    //if (actual.length === 1 && expected.length === 1) {
    //    // It's a single element, then just directly compare the elements
    //    previousStepPromise = diffElement(actualAdapter, expectedAdapter, actual[0], expected[0], expect, options)
    //    .then(singleElementDiff => {
    //        bestDiff = [singleElementDiff.diff];
    //        bestWeight = singleElementDiff.weight;
    //    });
    //}

    const childrenResult = diffChildren(actualAdapter, expectedAdapter, actual, expected, expect, options);

    if (!bestWeight || childrenResult.weight.real < bestWeight.real) {
        bestDiff = childrenResult.diff;
        bestWeight = childrenResult.weight;
    }


    let wrapperResult;
    if ((!bestWeight || bestWeight.real !== DiffCommon.WEIGHT_OK) &&
        actual.length === 1 &&
        expected.length !== 0 && !isNativeType(actual[0])) {
        // Try it as a wrapper, and see if it's better
        // Also covered here is a wrapper around several children

        const actualChildren = actualAdapter.getChildren(actual[0]);
        wrapperResult = diffContent(actualAdapter, expectedAdapter, actualChildren, expected, expect, options);
    }

    if (wrapperResult) {
        const wrapperWeight = options.diffWrappers ? options.weights.WRAPPER_REMOVED : DiffCommon.WEIGHT_OK;

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



function diffChildren(actualAdapter, expectedAdapter, actualChildren, expectedChildren, expect, options) {


    let onlyExact = true;
    let bestDiffResult = null;


    const exactDiffResult = tryDiffChildren(actualAdapter, expectedAdapter, actualChildren, expectedChildren, expect, options, onlyExact)

    bestDiffResult = exactDiffResult;

    // If it wasn't a perfect match, and there were both inserts and removals, we can try allowing the children that
    // don't match to be "similar".
    let changesDiffResult;
    if (exactDiffResult.weight.real !== 0 && exactDiffResult.insertCount && exactDiffResult.removeCount) {
        onlyExact = false;
        changesDiffResult = tryDiffChildren(actualAdapter, expectedAdapter, actualChildren, expectedChildren, expect, options, onlyExact);
    }


    if (changesDiffResult && changesDiffResult.weight.real < bestDiffResult.weight.real) {
        bestDiffResult = changesDiffResult;
    }
    return bestDiffResult;
}


function tryDiffChildren(actualAdapter, expectedAdapter, actualChildren, expectedChildren, expect, options, onlyExactMatches) {

    let diffWeights = new Weights();
    const diffResult = [];

    let insertCount = 0;
    let removeCount = 0;
    let changeCount = 0;

    const changes = ArrayChanges(actualChildren, expectedChildren,
        function (a, b, aIndex, bIndex) {
            const elementDiff = diffElementOrWrapper(actualAdapter, expectedAdapter, a, b, expect, options);
            return elementDiff.weight.total === DiffCommon.WEIGHT_OK;
        },

        function (a, b, aIndex, bIndex) {

            if (onlyExactMatches) {
                return false;
            }
            var aIsNativeType = isNativeType(a);
            var bIsNativeType = isNativeType(b);

            // If they're native types, assume they're similar
            if (aIsNativeType && bIsNativeType) {
                return true;
            }

            // If one is an element, then don't count them as "similar"
            if (aIsNativeType !== bIsNativeType) {
                return false;
            }

            // Here we could diff and get a weight, but the weight as to what is similar is dependant on
            // what the other "similar" elements got, so we'll just take a simplistic view -
            // elements with the same name are similar, otherwise they're not
            return actualAdapter.getName(a) === expectedAdapter.getName(b);
        });


    changes.forEach(diffItem => {

        let itemResult;

        switch (diffItem.type) {
            case 'insert':
                insertCount++;
                let actualIndex = null;
                if (typeof diffItem.actualIndex === 'number') {
                    itemResult = convertToDiff(actualAdapter, diffItem.value);
                    actualIndex = diffItem.actualIndex;
                } else {
                    itemResult = convertToDiff(expectedAdapter, diffItem.value);
                }
                if (options.diffMissingChildren) {
                    diffWeights.add(options.weights.CHILD_MISSING);
                    itemResult.diff = {
                        type: 'missing'
                    };
                    if (actualIndex !== null) {
                        itemResult.diff.actualIndex = actualIndex;
                    }
                    diffResult.push(itemResult);
                }
                break;

            case 'remove':
                removeCount++;
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

            case 'similar':
                changeCount++;
            // fallthrough
            // (equal needs to be diffed, because it may contain wrappers, hence we need to work that out.. again)
            // It would be good to cache that, from the diff above.

            case 'equal': //eslint-disable-line no-fallthrough
            default:
                const result = diffElementOrWrapper(actualAdapter, expectedAdapter, diffItem.value, diffItem.expected, expect, options);
                diffResult.push(result.diff);
                diffWeights.addWeight(result.weight);
                break;
        }

    });


    if (actualChildren.length === 0 && expectedChildren.length !== 0 && options.diffMissingChildren) {
        diffWeights.add(options.weights.ALL_CHILDREN_MISSING);
    }

    return {
        weight: diffWeights,
        diff: diffResult,
        insertCount,
        removeCount,
        changeCount
    };
}

export default {
    diffElements
}
