import { DefaultWeights, Options } from './diffCommon';
import * as AsyncDiff from './asyncDiff';
import * as SyncDiff from './syncDiff';
import RequiresAsyncError from './requiresAsyncError';
import { Adapter, Expect } from "./types";


function diffElements<A,E>(actualAdapter: Adapter<A>, expectedAdapter: Adapter<E>, actual: A, expected: E, expect: Expect, options: Options) {
    
    try {
        return SyncDiff.diffElements(actualAdapter, expectedAdapter, actual, expected, expect, options);
    } catch (e) {
        if (e instanceof RequiresAsyncError) {
            return AsyncDiff.diffElements(actualAdapter, expectedAdapter, actual, expected, expect, options);
        }
        throw e;
    }

}

export default {
    DefaultWeights: DefaultWeights,
    diffElements: diffElements
};
