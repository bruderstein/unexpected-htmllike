'use strict';
import { DefaultWeights } from './diffCommon';
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

}

export default {
    DefaultWeights: DefaultWeights,
    diffElements: diffElements
};
