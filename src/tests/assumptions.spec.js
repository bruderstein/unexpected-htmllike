
import ArrayChanges from 'array-changes';
import ArrayChangesAsync from 'array-changes-async';
import Unexpected from 'unexpected';

const expect = Unexpected.clone();

const ArrayChangesPromise = function (a, b, equal, similar) {
    return expect.promise((resolve, reject) => {
        ArrayChangesAsync(a, b, equal, similar, function (changes) {
            resolve(changes);
        });
    });
}

describe.skip('array-changes', () => {
    describe('async', () => {

    it('returns an insert and delete for non-similar entries', () => {
        return expect(ArrayChangesPromise([1, 2, 3], [100, 300, 500], (a, b, aIndex, bIndex, callback) => {
            callback(a * 100 === b);
        }, (a, b, aIndex, bIndex, callback) => callback(false)), 'when fulfilled', 'to satisfy', [

        ]);
    });
    });

    describe('sync', () => {

        it('returns an insert and delete for non-similar entries', () => {
            return expect(ArrayChanges([1, 2, 3], [100, 200, 500],
                (a, b, aIndex, bIndex, callback) => a * 100 === b,
                (a, b, aIndex, bIndex, callback) => false),
                'to satisfy', [

            ]);
        });
    });
})