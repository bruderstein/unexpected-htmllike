
import Unexpected from 'unexpected';

import Weights from '../Weights';

const expect = Unexpected.clone();

describe('Weights', () => {

    let weights;

    beforeEach(() => {
        weights = new Weights();
    });

    it('initialises to 0', () => {

        expect(weights, 'to satisfy', {
            real: 0,
            total: 0
        });
    });

    describe('add', () => {
        it('adds a weight to both', () => {

            weights.add(10);
            expect(weights, 'to satisfy', {
                real: 10,
                total: 10
            });
        });
    });

    describe('addReal', () => {

        it('adds a weight to the real weight, not the all weight', () => {

            weights.addReal(10);
            expect(weights, 'to satisfy', {
                real: 10,
                total: 0
            });
        });
    });

    describe('addTotal', () => {

        it('adds a weight to the total weight, not the real weight', () => {

            weights.addTotal(10);
            expect(weights, 'to satisfy', {
                real: 0,
                total: 10
            });
        });
    });

    describe('addWeight', () => {

        it('adds a second weight to the initial weight', () => {
            weights.addReal(4);
            weights.addTotal(8);
            weights.addWeight(new Weights().addReal(16).addTotal(32));
            expect(weights, 'to satisfy', {
                real: 20,
                total: 40
            });
        });
    });

    describe('creating children', () => {
        it('sets thisWeight is only the current child', () => {
            weights.addReal(4);
            const child = weights.createChild();
            child.addReal(10);
            expect(child.results(), 'to satisfy', {
                thisWeight: 10
            });
        });

        it('sets subtreeWeight to include the child', () => {
          weights.addReal(4);
          const child = weights.createChild();
          child.addReal(10);
           expect(weights.results(), 'to satisfy', {
               thisWeight: 4,
               subtreeWeight: 10
           });
        });

        it('includes subtrees from grandchildren', () => {
          weights.addReal(4);
          const child = weights.createChild();
          child.addReal(10);
          const grandchild = child.createChild();
          grandchild.addReal(7);
          expect(weights.results(), 'to satisfy', {
              thisWeight: 4,
              subtreeWeight: 17
          });
        });

        it('includes subtrees from multiple children', () => {
          weights.addReal(4);
          const child = weights.createChild();
          child.addReal(10);
          const child2 = weights.createChild();
          child2.addReal(7);
          expect(weights.results(), 'to satisfy', {
            thisWeight: 4,
            subtreeWeight: 17
          });
        });

        it('does not include current in subtree in a child', () => {
          weights.addReal(4);
          const child = weights.createChild();
          child.addReal(10);
          expect(child.results(), 'to satisfy', {
            subtreeWeight: 0
          });
        });
    });
});
