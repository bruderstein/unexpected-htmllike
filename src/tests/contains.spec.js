import Unexpected from 'unexpected';

import Contains from '../contains';
import Diff from '../diff';

const expect = Unexpected.clone();

const TestAdapter = {
    getName(comp) { return comp.name; },

    getAttributes(comp) { return comp.attribs; },

    getChildren(comp) {
        return (comp.children && [].concat([], comp.children)) || [];
    }
};

function getContains(actual, expected, options) {
    return Contains(TestAdapter, TestAdapter, actual, expected, expect, options);
}


describe('contains', () => {

    it('finds an exact match', () => {

        const containsResult = getContains(
            { name: 'span', attribs: { className: 'foo' }, children: [ 'some content'] },
            { name: 'span', attribs: { className: 'foo' }, children: [ 'some content'] }
        );

        expect(containsResult, 'to satisfy', { found: true });
    });

    it('reports the inspection of the found item', () => {

        const containsResult = getContains(
            { name: 'span', attribs: { className: 'foo' }, children: [ 'some content'] },
            { name: 'span', attribs: { className: 'foo' }, children: [ 'some content'] }
        );

        expect(containsResult, 'to satisfy', {
            found: true,
            bestMatch: {
                diff: {
                    type: 'ELEMENT',
                    name: 'span',
                    attributes: [ { name: 'className', value: 'foo' } ]
                }
            }
        });
    });

    it('reports not found when no exact match exists', () => {

        const containsResult = getContains(
            { name: 'span', attribs: { className: 'foo' }, children: [ 'some content'] },
            { name: 'span', attribs: { className: 'foo' }, children: [ 'some other content'] }
        );

        expect(containsResult, 'to satisfy', { found: false });
    });

    it('finds an element nested one deep', () => {

        const containsResult = getContains(
            { name: 'div', attribs: {}, children: [
                { name: 'span', attribs: { className: 'foo' }, children: [ 'some content'] }
            ]
            },
            { name: 'span', attribs: { className: 'foo' }, children: [ 'some content'] }
        );

        expect(containsResult, 'to satisfy', { found: true });
    });

    it('finds a deep nested element', () => {

        const containsResult = getContains(
            { name: 'div', attribs: {}, children: [
                { name: 'span', attribs: { className: 'foo' }, children: [ 'blah'] },
                { name: 'span', attribs: { className: 'foo' }, children: [
                    { name: 'span', attribs: { className: 'foo' }, children: [ 'some content' ] }
                ] },
                { name: 'span', attribs: { className: 'foo' }, children: [ 'blubs'] }
            ]
            },
            { name: 'span', attribs: { className: 'foo' }, children: [ 'some content'] }
        );

        expect(containsResult, 'to satisfy', { found: true, bestMatch: {
            diff: {
                type: 'ELEMENT',
                name: 'span',
                attributes: [ { name: 'className', value: 'foo' } ]
            }
        } });
    });

    it('finds a best match when the content is different', () => {

        const containsResult = getContains(
            { name: 'div', attribs: {}, children: [
                { name: 'span', attribs: { className: 'foo' }, children: [ 'some different content' ] }
            ]
            },
            { name: 'span', attribs: { className: 'foo' }, children: [ 'some content'] }
        );

        expect(containsResult, 'to satisfy', { found: false, bestMatchItem: {
            name: 'span', attribs: { className: 'foo'}, children: [ 'some different content' ]
        } });
    });

    it('finds a best match in an array of children with an extra attribute', () => {

        const containsResult = getContains(
            { name: 'div', attribs: {}, children: [
                { name: 'span', attribs: { className: 'foo' }, children: [ 'some content' ] },
                { name: 'span', attribs: { className: 'bar' }, children: [ 'some content' ] },
                { name: 'span', attribs: { className: 'candidate', id: 'abc' }, children: [ 'some content' ] }
            ]
            },
            { name: 'span', attribs: { className: 'candidate' }, children: [ 'some content'] }
        );

        expect(containsResult, 'to satisfy', { found: false, bestMatchItem: {
            name: 'span', attribs: { className: 'candidate', id: 'abc' }, children: [ 'some content' ]
        } });
    })

    it('returns a diff when the content is different', () => {

        const containsResult = getContains(
            { name: 'div', attribs: {}, children: [
                { name: 'span', attribs: { className: 'foo' }, children: [ 'some different content' ] }
            ]
            },
            { name: 'span', attribs: { className: 'foo' }, children: [ 'some content'] }
        );

        expect(containsResult, 'to satisfy', {
            found: false,
            bestMatch: {
                diff: {
                    type: 'ELEMENT',
                    name: 'span',
                    attributes: [{ name: 'className', value: 'foo' }],
                    children: [ {
                        type: 'CONTENT',
                        value: 'some different content',
                        diff: {
                            type: 'changed',
                            expectedValue: 'some content'
                        }
                    } ]
                },
                weight: Diff.DefaultWeights.STRING_CONTENT_MISMATCH
            }
        });
    });

    it('doesn\'t include wrappers in the bestMatchItem around the item that is found', () => {

        const searchItem = {
                    name: 'div', attribs: {}, children: [
                    {
                        name: 'wrapper', attribs: { className: 'the-wrapper' },
                        children: [
                            { name: 'span', attribs: { className: 'foo' }, children: ['some different content'] }
                        ]

                    }
                ]
                };
        const containsResult = getContains(
            {
                name: 'body', attribs: {}, children: [ searchItem ]
            },
            {
                name: 'div', attribs: {}, children: [
                { name: 'span', attribs: { className: 'foo' }, children: ['some content'] }
            ]
            },
            { diffWrappers: false });

        expect(containsResult, 'to satisfy', {
            found: false,
            bestMatchItem: searchItem
        });
    });

    it('doesn\'t include wrappers in the bestMatch around the item that is found', () => {

        const containsResult = getContains(
            {
                name: 'body', attribs: {}, children: [ {
                name: 'div', attribs: {}, children: [
                    {
                        name: 'wrapper', attribs: { className: 'the-wrapper' },
                        children: [
                            { name: 'span', attribs: { className: 'foo' }, children: ['some different content'] }
                        ]

                    }
                ]
            } ]
            },
            {
                name: 'div', attribs: {}, children: [
                { name: 'span', attribs: { className: 'foo' }, children: ['some content'] }
            ]
            },
            { diffWrappers: false });

        expect(containsResult, 'to satisfy', {
            found: false,
            bestMatch: {
                diff: {
                    type: 'ELEMENT',
                    name: 'div',      // Top level in the diff is the div, not the body
                    children: [ {
                        type: 'WRAPPERELEMENT',
                        name: 'wrapper'
                    }]
                }
            }
        });
    });

    it('doesn\'t include wrappers in the bestMatch around an item that is found to match', () => {

        const containsResult = getContains(
            {
                name: 'body', attribs: {}, children: [{
                name: 'div', attribs: {}, children: [
                    {
                        name: 'wrapper', attribs: { className: 'the-wrapper' },
                        children: [
                            { name: 'span', attribs: { className: 'foo' }, children: ['some content'] }
                        ]

                    }
                ]
            }]
            },
            {
                name: 'div', attribs: {}, children: [
                { name: 'span', attribs: { className: 'foo' }, children: ['some content'] }
            ]
            },
            { diffWrappers: false });

        expect(containsResult, 'to satisfy', {
            found: true,
            bestMatch: {
                diff: {
                    type: 'ELEMENT',
                    name: 'div',      // Top level in the diff is the div, not the body
                    children: [{
                        type: 'WRAPPERELEMENT',
                        name: 'wrapper'
                    }]
                }
            }
        });
    });
});
