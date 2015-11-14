import ArrayChangesAsync from 'array-changes-async';
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
    ATTRIBUTE_MISMATCH: 2,
    ATTRIBUTE_MISSING: 2,
    ATTRIBUTE_EXTRA: 1,     // Actual contains an attribute that is not expected
    STRING_CONTENT_MISMATCH: 3,
    CONTENT_TYPE_MISMATCH: 1,
    CHILD_MISSING: 2,
    CHILD_INSERTED: 2,
    WRAPPER_REMOVED: 3,
    ALL_CHILDREN_MISSING: 8  // When the expected has children, and actual has no children
                             // This + CHILD_MISSING should be equal or greater than NAME_MISMATCH
                             // to avoid a name-changed child causing the actual rendered child to
                             // be identified as a wrapper, and the actual child as a missing child
                             // of the wrapper (see the test
                             // "doesn't wrap an element when it means there are missing children"
                             // for an example)
};

const defaultOptions = {
    diffExtraAttributes: true,
    diffRemovedAttributes: true,
    diffExtraChildren: true,
    diffMissingChildren: true,
    diffWrappers: true
};

const WEIGHT_OK = 0;

function diffElements(actualAdapter, expectedAdapter, actual, expected, expect, options) {

    options = ObjectAssign({}, defaultOptions, options);
    options.weights = ObjectAssign({}, DefaultWeights, options.weights);

    return diffElementOrWrapper(actualAdapter, expectedAdapter, actual, expected, expect, options)
        .then(diffResult => {
            return {
                diff: diffResult.diff,
                weight: diffResult.weight.real
            };
        });
}

function diffElementOrWrapper(actualAdapter, expectedAdapter, actual, expected, expect, options) {

    const elementResult = diffElement(actualAdapter, expectedAdapter, actual, expected, expect, options);

    return elementResult
        .then(diffResult => {

            if (diffResult.weight.real !== WEIGHT_OK && !isNativeType(actual)) {

                const actualChildren = actualAdapter.getChildren(actual);

                if (actualChildren.length === 1) {
                    // Try as wrapper
                    return diffElementOrWrapper(actualAdapter, expectedAdapter, actualChildren[0], expected, expect, options)
                        .then(wrapperResult => {

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
                            return diffResult;
                        });
                }

            }


            return diffResult;
    });

}


function diffElement(actualAdapter, expectedAdapter, actual, expected, expect, options) {

    const weights = new Weights();
    let diffResult = {};

    const actualIsNative = isNativeType(actual);
    const expectedIsNative = isNativeType(expected);

    const promises = [];

    if (expectedIsNative && typeof expected === 'function' && expected._expectIt) {
        const withErrorResult = expect.withError(() => expected(actual), e => {

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
        }).then(() => {

            diffResult.type = 'CONTENT';
            diffResult.value = actual;
            // Assertion passed
            return {
                diff: diffResult,
                weight: weights
            };
        });

        if (withErrorResult) {
            return withErrorResult;
        }

        return expect.promise.resolve({ diffResult, weights });

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

        return expect.promise.resolve({
            diff: diffResult,
            weight: weights
        });
    }

    if (actualIsNative && !expectedIsNative) {
        weights.add(options.weights.NATIVE_NONNATIVE_MISMATCH);
        diffResult.type = 'CONTENT';
        diffResult.value = actual;
        diffResult.diff = {
            type: 'contentElementMismatch',
            expected: convertToDiff(expectedAdapter, expected)
        };

        return expect.promise.resolve({
            diff: diffResult,
            weight: weights
        });
    }

    if (!actualIsNative && expectedIsNative) {
        weights.add(options.weights.NATIVE_NONNATIVE_MISMATCH);
        diffResult = convertToDiff(actualAdapter, actual);
        diffResult.diff = {
            type: 'elementContentMismatch',
            expected: convertToDiff(expectedAdapter, expected)
        };

        return expect.promise.resolve({
            diff: diffResult,
            weight: weights
        });
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

    const attributesResultPromise = diffAttributes(actualAdapter.getAttributes(actual), expectedAdapter.getAttributes(expected), expect, options)
            .then(attribResult => {
                diffResult.attributes = attribResult.diff;
                weights.addWeight(attribResult.weight);
            });

    promises.push(attributesResultPromise);


    const contentResultPromise = diffContent(actualAdapter, expectedAdapter, actualAdapter.getChildren(actual), expectedAdapter.getChildren(expected), expect, options)
        .then(contentResult => {

            diffResult.children = contentResult.diff;
            weights.addWeight(contentResult.weight);
        });

    promises.push(contentResultPromise);


    return expect.promise.all(promises).then(() => {

        return {
            diff: diffResult,
            weight: weights
        };
    });


}

function diffAttributes(actualAttributes, expectedAttributes, expect, options) {

    let diffWeights = new Weights();
    const diffResult = [];



    const promises = [];

    Object.keys(actualAttributes).forEach(attrib => {

        const attribResult = { name: attrib, value: actualAttributes[attrib] };
        diffResult.push(attribResult);

        if (expectedAttributes.hasOwnProperty(attrib)) {
            const expectedAttrib = expectedAttributes[attrib];
            if (typeof expectedAttrib === 'function' && expectedAttrib._expectIt) {
                // This is an assertion in the form of expect.it(...)
                const withErrorResult = expect.withError(() => expectedAttrib(actualAttributes[attrib]), e => {

                    attribResult.diff = {
                        type: 'custom',
                        assertion: expectedAttrib,
                        error: e
                    };

                    diffWeights.add(options.weights.ATTRIBUTE_MISMATCH);
                });

                promises.push(withErrorResult);

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

    if (promises.length) {
        return expect.promise.all(promises)
            .then(() => {
                return {
                    diff: diffResult,
                    weight: diffWeights
                };
            });
    } else {
        return expect.promise((resolve, reject) => {
            return resolve({
                diff: diffResult,
                weight: diffWeights
            });
        });
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

    return diffChildren(actualAdapter, expectedAdapter, actual, expected, expect, options).then(childrenResult => {

        if (!bestWeight || childrenResult.weight.real < bestWeight.real) {
            bestDiff = childrenResult.diff;
            bestWeight = childrenResult.weight;
        }
    }).then(() => {


        if ((!bestWeight || bestWeight.real !== WEIGHT_OK) &&
            actual.length === 1 &&
            expected.length !== 0 && !isNativeType(actual[0])) {
            // Try it as a wrapper, and see if it's better
            // Also covered here is a wrapper around several children

            const actualChildren = actualAdapter.getChildren(actual[0]);
            return diffContent(actualAdapter, expectedAdapter, actualChildren, expected, expect, options);
        }

        return null;

    }).then(wrapperResult => {

        if (wrapperResult) {
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
    }).then(() => {
        return {
            diff: bestDiff,
            weight: bestWeight
        };
    });

}



function diffChildren(actualAdapter, expectedAdapter, actualChildren, expectedChildren, expect, options) {


    let onlyExact = true;
    let bestDiffResult = null;


    return tryDiffChildren(actualAdapter, expectedAdapter, actualChildren, expectedChildren, expect, options, onlyExact)
        .then(exactDiffResult => {

            bestDiffResult = exactDiffResult;

            // If it wasn't a perfect match, and there were both inserts and removals, we can try allowing the children that
            // don't match to be "similar".
            if (exactDiffResult.weight.real !== 0 && exactDiffResult.insertCount && exactDiffResult.removeCount) {
                onlyExact = false;
                return tryDiffChildren(actualAdapter, expectedAdapter, actualChildren, expectedChildren, expect, options, onlyExact);
            }
            return null;

        })
        .then(changesDiffResult => {

            if (changesDiffResult && changesDiffResult.weight.real < bestDiffResult.weight.real) {
                bestDiffResult = changesDiffResult;
            }
            return bestDiffResult;
        });
}

function tryDiffChildren(actualAdapter, expectedAdapter, actualChildren, expectedChildren, expect, options, onlyExactMatches) {

    let diffWeights = new Weights();
    const diffResult = [];

    let insertCount = 0;
    let removeCount = 0;
    let changeCount = 0;
    const promises = [];

    return expect.promise((resolve, reject) => {
        ArrayChangesAsync(actualChildren, expectedChildren,
            function (a, b, aIndex, bIndex, callback) {
                diffElementOrWrapper(actualAdapter, expectedAdapter, a, b, expect, options).then(elementDiff => {
                    return callback(elementDiff.weight.total === WEIGHT_OK);
                });
            },

            function (a, b, aIndex, bIndex, callback) {

                if (onlyExactMatches) {
                    return callback(false);
                }
                var aIsNativeType = isNativeType(a);
                var bIsNativeType = isNativeType(b);

                // If they're native types, assume they're similar
                if (aIsNativeType && bIsNativeType) {
                    return callback(true);
                }

                // If one is an element, then don't count them as "similar"
                if (aIsNativeType !== bIsNativeType) {
                    return callback(false);
                }

                // Here we could diff and get a weight, but the weight as to what is similar is dependant on
                // what the other "similar" elements got, so we'll just take a simplistic view -
                // elements with the same name are similar, otherwise they're not
                return callback(actualAdapter.getName(a) === expectedAdapter.getName(b));
            }, function (changes) {

                changes.forEach(diffItem => {

                    let itemResult;

                    switch(diffItem.type) {
                        case 'insert':
                            insertCount++;
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
                            const index = diffResult.length;

                            diffResult.push({}); // Push a placeholder, we'll replace when the promise resolves
                            const promise = diffElementOrWrapper(actualAdapter, expectedAdapter, diffItem.value, diffItem.expected, expect, options)
                                .then(result => {
                                    diffResult[index] = result.diff;
                                    diffWeights.addWeight(result.weight);
                                });
                            promises.push(promise);

                            break;
                    }

                });

                if (promises.length) {
                    return expect.promise.all(promises).then(() => {
                        resolve();
                    });
                }
                return resolve();
            });

    }).then(() => {

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
    });
}

export default {
    DefaultWeights,
    diffElements
};
