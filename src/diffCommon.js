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
    diffWrappers: true,
    diffExactClasses: true,
    diffExtraClasses: true,
    diffMissingClasses: true
};

const WEIGHT_OK = 0;

export default {
    defaultOptions,
    DefaultWeights,
    WEIGHT_OK
};
