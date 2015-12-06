'use strict';
import DiffCommon from './diffCommon';
import AsyncDiff from './asyncDiff';
import SyncDiff from './syncDiff';
import RequiresAsyncError from './requiresAsyncError';


function diffElements(actualAdapter, expectedAdapter, actual, expected, expect, options) {
    let result;
    try {
        return SyncDiff.diffElements(actualAdapter, expectedAdapter, actual, expected, expect, options);
    } catch (e) {
        if (e instanceof RequiresAsyncError) {
            const promiseResult = AsyncDiff.diffElements(actualAdapter, expectedAdapter, actual, expected, expect, options);

            return promiseResult.then(result => {
                return result;
            }).catch(e => {
                throw e;
            });
        }
        throw e;
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

}

export default {
    DefaultWeights: DiffCommon.DefaultWeights,
    diffElements: diffElements
};
