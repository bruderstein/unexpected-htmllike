import Unexpected from 'unexpected';

import Diff from '../diff';

const expect = Unexpected.clone();

const TestAdapter = {
    getName(comp) { return comp.name; },

    getAttributes(comp) { return comp.attribs; },

    getChildren(comp) {
        return (comp.children && [].concat([], comp.children)) || [];
    }
};

function getDiff(actual, expected, options) {
    return Diff.diffElements(TestAdapter, TestAdapter, actual, expected, expect.equal, options);
}

describe('diff', () => {

    it('returns no differences for an identical element', () => {
        const result = getDiff( { name: 'span', attribs: { className: 'foo' }, children: ['some text'] },
            { name: 'span', attribs: { className: 'foo' }, children: ['some text'] });

        expect(result, 'to satisfy', {
            diff: {
                type: 'ELEMENT',
                name: 'span',
                attributes: [{ name: 'className', value: 'foo' }],
                children: [
                    { type: 'CONTENT', value: 'some text' }
                ]
            },
            weight: 0
        });
    });

    it('diffs a changed attribute', () => {

        const result = getDiff( { name: 'span', attribs: { className: 'foo' }, children: ['some text'] },
            { name: 'span', attribs: { className: 'bar' }, children: ['some text'] });

        expect(result, 'to satisfy', {
            diff: {
                attributes: [
                    {
                        name: 'className',
                        value: 'foo',
                        diff: {
                            type: 'changed',
                            expectedValue: 'bar'
                        }
                    }
                ]
            },
            weight: Diff.DefaultWeights.ATTRIBUTE_MISMATCH
        });
    });

    it('diffs an extra attribute', () => {

        const result = getDiff( { name: 'span', attribs: { className: 'foo' }, children: ['some text'] },
            { name: 'span', attribs: {}, children: ['some text'] });

        expect(result, 'to satisfy', {
            diff: {
                attributes: [
                    {
                        name: 'className',
                        value: 'foo',
                        diff: {
                            type: 'extra'
                        }
                    }
                ]
            },
            weight: Diff.DefaultWeights.ATTRIBUTE_EXTRA
        });
    });

    it('diffs an extra attribute and a changed attribute', () => {

        const result = getDiff( { name: 'span', attribs: { id: 'abc', className: 'foo' }, children: ['some text'] },
            { name: 'span', attribs: { id: 'abcd' }, children: ['some text'] });

        expect(result, 'to satisfy', {
            diff: {
                attributes: [
                    {
                        name: 'id',
                        value: 'abc',
                        diff: {
                            type: 'changed',
                            expectedValue: 'abcd'
                        }
                    },
                    {
                        name: 'className',
                        value: 'foo',
                        diff: {
                            type: 'extra'
                        }
                    }
                ]
            },
            weight: Diff.DefaultWeights.ATTRIBUTE_EXTRA + Diff.DefaultWeights.ATTRIBUTE_MISMATCH
        });
    });

    it('diffs a removed attribute', () => {

        const result = getDiff( { name: 'span', attribs: {}, children: ['some text'] },
            { name: 'span', attribs: { className: 'foo' }, children: ['some text'] });

        expect(result, 'to satisfy', {
            diff: {
                attributes: [
                    {
                        name: 'className',
                        diff: {
                            type: 'missing',
                            expectedValue: 'foo'
                        }
                    }
                ]
            },
            weight: Diff.DefaultWeights.ATTRIBUTE_MISSING
        });
    });

    it('diffs changed content', () => {

        const result = getDiff( { name: 'span', attribs: {}, children: ['some text'] },
            { name: 'span', attribs: {}, children: ['some changed text'] });

        expect(result, 'to satisfy', {
            diff: {
                children: [
                    {
                        type: 'CONTENT',
                        value: 'some text',
                        diff: {
                            type: 'changed',
                            expectedValue: 'some changed text'
                        }
                    }
                ]
            },
            weight: Diff.DefaultWeights.STRING_CONTENT_MISMATCH
        });
    });

    it('diffs a removed last child', () => {

        const result = getDiff( { name: 'span', attribs: {}, children: [
                { name: 'child', attribs: {}, children: ['child1'] },
                { name: 'child', attribs: {}, children: ['child2'] }
            ] },
            { name: 'span', attribs: {}, children: [
                { name: 'child', attribs: {}, children: ['child1'] },
                { name: 'child', attribs: {}, children: ['child2'] },
                { name: 'child', attribs: {}, children: ['child3'] }
            ] });

        expect(result, 'to satisfy', {
            diff: {
                children: [
                    {
                        type: 'ELEMENT',
                        name: 'child',
                        children: [{
                            type: 'CONTENT',
                            value: 'child1'
                        }]
                    },
                    {
                        type: 'ELEMENT',
                        name: 'child',
                        children: [{
                            type: 'CONTENT',
                            value: 'child2'
                        }]
                    },
                    {
                        type: 'ELEMENT',
                        name: 'child',
                        diff: {
                            type: 'missing'
                        },
                        children: [{
                            type: 'CONTENT',
                            value: 'child3'
                        }]
                    }
                ]
            },
            weight: Diff.DefaultWeights.CHILD_MISSING
        });
    });

    it('diffs a removed middle child', () => {

        const result = getDiff({
                name: 'span', attribs: {}, children: [
                    { name: 'child', attribs: {}, children: ['child1'] },
                    { name: 'child', attribs: {}, children: ['child3'] }
                ]
            },
            {
                name: 'span', attribs: {}, children: [
                { name: 'child', attribs: {}, children: ['child1'] },
                { name: 'child', attribs: {}, children: ['child2'] },
                { name: 'child', attribs: {}, children: ['child3'] }
            ]
            });

        expect(result, 'to satisfy', {
            diff: {
                children: [
                    {
                        type: 'ELEMENT',
                        name: 'child',
                        children: [{
                            type: 'CONTENT',
                            value: 'child1'
                        }]
                    },
                    {
                        type: 'ELEMENT',
                        name: 'child',
                        diff: {
                            type: 'missing',
                        },
                        children: [{
                            type: 'CONTENT',
                            value: 'child2'
                        }]
                    },
                    {
                        type: 'ELEMENT',
                        name: 'child',
                        diff: undefined,
                        children: [{
                            type: 'CONTENT',
                            value: 'child3'
                        }]
                    }
                ]
            },
            weight: Diff.DefaultWeights.CHILD_MISSING
        });

    });

    it('diffs an extra last child', () => {

        const result = getDiff( { name: 'span', attribs: {}, children: [
                { name: 'child', attribs: {}, children: ['child1'] },
                { name: 'child', attribs: {}, children: ['child2'] },
                { name: 'child', attribs: {}, children: ['child3'] }
            ] },
            { name: 'span', attribs: {}, children: [
                { name: 'child', attribs: {}, children: ['child1'] },
                { name: 'child', attribs: {}, children: ['child2'] }
            ] });

        expect(result, 'to satisfy', {
            diff: {
                children: [
                    {
                        type: 'ELEMENT',
                        name: 'child',
                        children: [{
                            type: 'CONTENT',
                            value: 'child1'
                        }]
                    },
                    {
                        type: 'ELEMENT',
                        name: 'child',
                        children: [{
                            type: 'CONTENT',
                            value: 'child2'
                        }]
                    },
                    {
                        type: 'ELEMENT',
                        name: 'child',
                        diff: {
                            type: 'extra'
                        },
                        children: [{
                            type: 'CONTENT',
                            value: 'child3'
                        }]
                    }
                ]
            },
            weight: Diff.DefaultWeights.CHILD_INSERTED
        });
    });

    it('diffs an extra middle child', () => {

        const result = getDiff( { name: 'span', attribs: {}, children: [
                { name: 'child', attribs: {}, children: ['child1'] },
                { name: 'child', attribs: {}, children: ['child2'] },
                { name: 'child', attribs: {}, children: ['child3'] }
            ] },
            { name: 'span', attribs: {}, children: [
                { name: 'child', attribs: {}, children: ['child1'] },
                { name: 'child', attribs: {}, children: ['child3'] }
            ] });

        // See comments in 'diffs a removed middle child' as to why this isn't an ideal diff
        expect(result, 'to satisfy', {
            diff: {
                children: [
                    {
                        type: 'ELEMENT',
                        name: 'child',
                        children: [{
                            type: 'CONTENT',
                            value: 'child1'
                        }]
                    },
                    {
                        type: 'ELEMENT',
                        name: 'child',
                        diff: {
                            type: 'extra'
                        },
                        children: [{
                            type: 'CONTENT',
                            value: 'child2'
                        }]
                    },
                    {
                        type: 'ELEMENT',
                        name: 'child',
                        diff: undefined,
                        children: [{
                            type: 'CONTENT',
                            value: 'child3'
                        }]
                    }
                ]
            },
            weight: Diff.DefaultWeights.CHILD_INSERTED
        });
    });

    it('diffs a missing content entry', () => {
        const result = getDiff( { name: 'span', attribs: {}, children: [
                 'child1', 'child3'] },
                { name: 'span', attribs: {}, children: [
                 'child1', 'child2', 'child3'] });

        // See comments in 'diffs a removed middle child' as to why this isn't an ideal diff
        expect(result, 'to satisfy', {
            diff: {
                children: [
                    {
                        type: 'CONTENT',
                        value: 'child1'
                    },
                    {
                        type: 'CONTENT',
                        value: 'child2',
                        diff: {
                            type: 'missing'
                        }
                    },
                    {
                        type: 'CONTENT',
                        value: 'child3'
                    }
                ]
            },
            weight: Diff.DefaultWeights.CHILD_INSERTED
        });
    });

    it('diffs an extra content entry', () => {
        const result = getDiff( { name: 'span', attribs: {}, children: [
                'child1', 'child2', 'child3'] },
            { name: 'span', attribs: {}, children: [
                'child1', 'child3'] });

        // See comments in 'diffs a removed middle child' as to why this isn't an ideal diff
        expect(result, 'to satisfy', {
            diff: {
                children: [
                    {
                        type: 'CONTENT',
                        value: 'child1'
                    },
                    {
                        type: 'CONTENT',
                        value: 'child2',
                        diff: {
                            type: 'extra'
                        }
                    },
                    {
                        type: 'CONTENT',
                        value: 'child3'
                    }
                ]
            },
            weight: Diff.DefaultWeights.CHILD_INSERTED
        });
    });

    it('diffs a changed element name', () => {

        const result = getDiff( { name: 'span', attribs: { className: 'foo' }, children: ['some text'] },
            { name: 'div', attribs: { className: 'foo' }, children: ['some text'] });

        expect(result, 'to satisfy', {
            diff: {
                type: 'ELEMENT',
                name: 'span',
                diff: {
                    type: 'differentElement',
                    expectedName: 'div'
                },
                attributes: [{ name: 'className', value: 'foo' }],
                children: [
                    { type: 'CONTENT', value: 'some text' }
                ]
            },
            weight: Diff.DefaultWeights.NAME_MISMATCH
        });
    });

    it('diffs a content-should-be-element', () => {
        const result = getDiff( 'some content',
            { name: 'div', attribs: { className: 'foo' }, children: ['some text'] });

        expect(result, 'to satisfy', {
            diff: {
                type: 'CONTENT',
                value: 'some content',
                diff: {
                    type: 'contentElementMismatch',
                    expected: {
                        type: 'ELEMENT',
                        name: 'div',
                        attributes: [{ name: 'className', value: 'foo' }],
                        children: [
                            { type: 'CONTENT', value: 'some text' }
                        ]
                    }
                }
            },
            weight: Diff.DefaultWeights.NATIVE_NONNATIVE_MISMATCH
        });

    });

    it('diffs a element-should-be-content', () => {
        const result = getDiff( { name: 'div', attribs: { className: 'foo' }, children: ['some text'] },
            'some content', {
                weights: { NATIVE_NONNATIVE_MISMATCH: 1 }  // Need to fool the weight to force this, otherwise it's a wrapper
            });

        expect(result, 'to satisfy', {
            diff: {
                type: 'ELEMENT',
                name: 'div',
                attributes: [
                    { name: 'className', value: 'foo' }
                ],
                diff: {
                    type: 'elementContentMismatch',
                    expected: {
                        type: 'CONTENT',
                        value: 'some content'
                    }
                },
                children: [
                    { type: 'CONTENT', value: 'some text' }
                ]
            },
            weight: 1 // Overridden NATIVE_NONNATIVE_MATCH weight
        });

    });

    it('diffs a wrapper around a single child', () => {

        const result = getDiff(
            { name: 'div', attribs: { className: 'foo' }, children: [
                { name: 'wrapper', attribs: { className: 'the-wrapper' }, children: [
                    { name: 'real', attribs: { className: 'real-element' } }
                ] }
            ] },
            { name: 'div', attribs: { className: 'foo' }, children: [
                { name: 'real', attribs: { className: 'real-element' } }
            ] });

        expect(result, 'to satisfy', {
            diff: {
                type: 'ELEMENT',
                name: 'div',
                attributes: [{ name: 'className', value: 'foo' }],
                children: [
                    {
                        type: 'ELEMENT',
                        name: 'wrapper',
                        diff: {
                            type: 'wrapper'
                        },
                        children: [
                            {
                                type: 'ELEMENT',
                                name: 'real',
                                attributes: [{ name: 'className', value: 'real-element' }]
                            }
                        ]
                    }
                ]
            },
            weight: Diff.DefaultWeights.WRAPPER_REMOVED
        });
    });

    it('diffs a wrapper around a single child', () => {

        const result = getDiff(
            { name: 'div', attribs: { className: 'foo' }, children: [
                { name: 'wrapper', attribs: { className: 'the-wrapper' }, children: [
                    { name: 'real', attribs: { className: 'real-element' } }
                ] }
            ] },
            { name: 'div', attribs: { className: 'foo' }, children: [
                { name: 'real', attribs: { className: 'real-element' } }
            ] });

        expect(result, 'to satisfy', {
            diff: {
                type: 'ELEMENT',
                name: 'div',
                attributes: [{ name: 'className', value: 'foo' }],
                children: [
                    {
                        type: 'ELEMENT',
                        name: 'wrapper',
                        diff: {
                            type: 'wrapper'
                        },
                        children: [
                            {
                                type: 'ELEMENT',
                                name: 'real',
                                attributes: [{ name: 'className', value: 'real-element' }]
                            }
                        ]
                    }
                ]
            },
            weight: Diff.DefaultWeights.WRAPPER_REMOVED
        });
    });

    it('diffs a wrapper around multiple children', () => {

        const result = getDiff(
            { name: 'div', attribs: { className: 'foo' }, children: [
                { name: 'wrapper', attribs: { className: 'the-wrapper' }, children: [
                    { name: 'real', attribs: { className: 'real-element-1' } },
                    { name: 'real', attribs: { className: 'real-element-2' } },
                    { name: 'real', attribs: { className: 'real-element-3' } }
                ] }
            ] },
            { name: 'div', attribs: { className: 'foo' }, children: [
                { name: 'real', attribs: { className: 'real-element-1' } },
                { name: 'real', attribs: { className: 'real-element-2' } },
                { name: 'real', attribs: { className: 'real-element-3' } }
            ] });

        expect(result, 'to satisfy', {
            diff: {
                type: 'ELEMENT',
                name: 'div',
                attributes: [{ name: 'className', value: 'foo' }],
                children: [
                    {
                        type: 'ELEMENT',
                        name: 'wrapper',
                        diff: {
                            type: 'wrapper'
                        },
                        children: [
                            { type: 'ELEMENT', name: 'real', attributes: [{ name: 'className', value: 'real-element-1' }] },
                            { type: 'ELEMENT', name: 'real', attributes: [{ name: 'className', value: 'real-element-2' }] },
                            { type: 'ELEMENT', name: 'real', attributes: [{ name: 'className', value: 'real-element-3' }] }
                        ]
                    }
                ]
            },
            weight: Diff.DefaultWeights.WRAPPER_REMOVED
        });
    });

    it('diffs a wrapper around each of several children', () => {

        const result = getDiff(
            { name: 'div', attribs: { className: 'foo' }, children: [
                { name: 'wrapper', attribs: { className: 'the-wrapper-1' }, children: [
                    { name: 'real', attribs: { className: 'real-element-1' } }
                  ]
                },
                { name: 'wrapper', attribs: { className: 'the-wrapper-2' }, children: [
                       { name: 'real', attribs: { className: 'real-element-2' } }
                  ]
                },
                { name: 'wrapper', attribs: { className: 'the-wrapper-3' }, children: [
                    { name: 'real', attribs: { className: 'real-element-3' } }
                  ]
                }
            ] },
            { name: 'div', attribs: { className: 'foo' }, children: [
                { name: 'real', attribs: { className: 'real-element-1' } },
                { name: 'real', attribs: { className: 'real-element-2' } },
                { name: 'real', attribs: { className: 'real-element-3' } }
            ] });

        expect(result, 'to satisfy', {
            diff: {
                type: 'ELEMENT',
                name: 'div',
                attributes: [{ name: 'className', value: 'foo' }],
                children: [
                    {
                        type: 'ELEMENT',
                        name: 'wrapper',
                        diff: {
                            type: 'wrapper'
                        },
                        attributes: [{ name: 'className', value: 'the-wrapper-1' }],
                        children: [
                            { type: 'ELEMENT', name: 'real', attributes: [{ name: 'className', value: 'real-element-1' }] }
                        ]
                    },
                    {
                        type: 'ELEMENT',
                        name: 'wrapper',
                        diff: {
                            type: 'wrapper'
                        },
                        attributes: [{ name: 'className', value: 'the-wrapper-2' }],
                        children: [
                            { type: 'ELEMENT', name: 'real', attributes: [{ name: 'className', value: 'real-element-2' }] }
                        ]
                    },
                    {
                        type: 'ELEMENT',
                        name: 'wrapper',
                        diff: {
                            type: 'wrapper'
                        },
                        attributes: [{ name: 'className', value: 'the-wrapper-3' }],
                        children: [
                            { type: 'ELEMENT', name: 'real', attributes: [{ name: 'className', value: 'real-element-3' }] }
                        ]
                    }
                ]
            },
            weight: Diff.DefaultWeights.WRAPPER_REMOVED * 3
        });
    });

    it('diffs a simple wrapper with diffWrappers:false', () => {

        const result = getDiff(
            { name: 'div', attribs: { className: 'foo' }, children: [
                { name: 'wrapper', attribs: { className: 'the-wrapper' }, children: [
                    { name: 'real', attribs: { className: 'real-element' } }
                ] }
            ] },
            { name: 'div', attribs: { className: 'foo' }, children: [
                { name: 'real', attribs: { className: 'real-element' } }
            ] },
            {
                diffWrappers: false
            });

        expect(result, 'to satisfy', {
            diff: {
                type: 'ELEMENT',
                name: 'div',
                attributes: [{ name: 'className', value: 'foo' }],
                children: [
                    {
                        type: 'WRAPPERELEMENT',
                        name: 'wrapper',
                        children: [
                            {
                                type: 'ELEMENT',
                                name: 'real',
                                attributes: [{ name: 'className', value: 'real-element' }]
                            }
                        ]
                    }
                ]
            },
            weight: Diff.DefaultWeights.OK
        });
    });


    it('diffs a wrapper around multiple children with diffWrappers:false', () => {

        const result = getDiff(
            { name: 'div', attribs: { className: 'foo' }, children: [
                { name: 'wrapper', attribs: { className: 'the-wrapper' }, children: [
                    { name: 'real', attribs: { className: 'real-element-1' } },
                    { name: 'real', attribs: { className: 'real-element-2' } },
                    { name: 'real', attribs: { className: 'real-element-3' } }
                ] }
            ] },
            { name: 'div', attribs: { className: 'foo' }, children: [
                { name: 'real', attribs: { className: 'real-element-1' } },
                { name: 'real', attribs: { className: 'real-element-2' } },
                { name: 'real', attribs: { className: 'real-element-3' } }
            ] },
            { diffWrappers: false });

        expect(result, 'to satisfy', {
            diff: {
                type: 'ELEMENT',
                name: 'div',
                attributes: [{ name: 'className', value: 'foo' }],
                children: [
                    {
                        type: 'WRAPPERELEMENT',
                        name: 'wrapper',
                        children: [
                            {
                                type: 'ELEMENT',
                                name: 'real',
                                attributes: [{ name: 'className', value: 'real-element-1' }]
                            },
                            {
                                type: 'ELEMENT',
                                name: 'real',
                                attributes: [{ name: 'className', value: 'real-element-2' }]
                            },
                            {
                                type: 'ELEMENT',
                                name: 'real',
                                attributes: [{ name: 'className', value: 'real-element-3' }]
                            }
                        ]
                    }
                ]
            },
            weight: Diff.DefaultWeights.OK
        });
    });

    it('diffs a wrapper around each of several children with diffWrappers:false', () => {

        const result = getDiff(
            { name: 'div', attribs: { className: 'foo' }, children: [
                { name: 'wrapper', attribs: { className: 'the-wrapper-1' }, children: [
                    { name: 'real', attribs: { className: 'real-element-1' } }
                ]
                },
                { name: 'wrapper', attribs: { className: 'the-wrapper-2' }, children: [
                    { name: 'real', attribs: { className: 'real-element-2' } }
                ]
                },
                { name: 'wrapper', attribs: { className: 'the-wrapper-3' }, children: [
                    { name: 'real', attribs: { className: 'real-element-3' } }
                ]
                }
            ] },
            { name: 'div', attribs: { className: 'foo' }, children: [
                { name: 'real', attribs: { className: 'real-element-1' } },
                { name: 'real', attribs: { className: 'real-element-2' } },
                { name: 'real', attribs: { className: 'real-element-3' } }
            ] },
            { diffWrappers: false });

        expect(result, 'to satisfy', {
            diff: {
                type: 'ELEMENT',
                name: 'div',
                attributes: [{ name: 'className', value: 'foo' }],
                children: [
                    {
                        type: 'WRAPPERELEMENT',
                        name: 'wrapper',
                        attributes: [{ name: 'className', value: 'the-wrapper-1' }],
                        children: [
                            {
                                type: 'ELEMENT',
                                name: 'real',
                                attributes: [{ name: 'className', value: 'real-element-1' }]
                            }
                        ]
                    },
                    {
                        type: 'WRAPPERELEMENT',
                        name: 'wrapper',
                        attributes: [{ name: 'className', value: 'the-wrapper-2' }],
                        children: [
                            {
                                type: 'ELEMENT',
                                name: 'real',
                                attributes: [{ name: 'className', value: 'real-element-2' }]
                            }
                        ]
                    },
                    {
                        type: 'WRAPPERELEMENT',
                        name: 'wrapper',
                        attributes: [{ name: 'className', value: 'the-wrapper-3' }],
                        children: [
                            {
                                type: 'ELEMENT',
                                name: 'real',
                                attributes: [{ name: 'className', value: 'real-element-3' }]
                            }
                        ]
                    }
                ]
            },
            weight: Diff.DefaultWeights.OK
        });
    });

    it('ignores a top level wrapper with diffWrappers:false', () => {

        const result = getDiff( {
                        name: 'TopLevel', attribs: {}, children: [
                        { name: 'MidLevel', attribs: {}, children: [
                            { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] },
                            { name: 'span', attribs: { id: 'childfoo' }, children: ['two'] }
                        ] }
                    ]
            },
            {
                name: 'MidLevel', attribs: {}, children: [
                { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] },
                { name: 'span', attribs: { id: 'childfoo' }, children: ['two'] }
            ]
            }, { diffWrappers: false });

        expect(result, 'to satisfy', {
            diff: {
                type: 'WRAPPERELEMENT',
                name: 'TopLevel',
                diff: undefined,
                children: [
                    {
                        type: 'ELEMENT',
                        name: 'MidLevel',
                        diff: undefined
                    }
                ]
            }
        });
    });

    it('ignores two levels of wrapper with diffWrappers:false', () => {

        const result = getDiff( {
            name: 'HigherOrderTopLevel', attribs: { id: 'main' }, children: [
            {
                name: 'TopLevel', attribs: {}, children: [
                { name: 'MidLevel', attribs: {}, children: [
                    { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] },
                    { name: 'span', attribs: { id: 'childfoo' }, children: ['two'] }
                ] }
            ]
            }
        ]
        },
        {
            name: 'MidLevel', attribs: {}, children: [
            { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] },
            { name: 'span', attribs: { id: 'childfoo' }, children: ['two'] }
        ]
        }, { diffWrappers: false });

        expect(result, 'to satisfy', {
            diff: {
                type: 'WRAPPERELEMENT',
                name: 'HigherOrderTopLevel',
                diff: undefined,
                children: [
                    {
                        type: 'WRAPPERELEMENT',
                        name: 'TopLevel',
                        diff: undefined,
                        children: [
                            {
                                type: 'ELEMENT',
                                name: 'MidLevel',
                                diff: undefined
                            }
                        ]
                    }
                ]
            },
            weight: Diff.DefaultWeights.OK
        });
    });

    it('ignores missing children if diffMissingChildren:false', () => {

        const result = getDiff( { name: 'span', attribs: {}, children: [
                { name: 'child', attribs: {}, children: ['child1'] },
                { name: 'child', attribs: {}, children: ['child2'] }
            ] },
            { name: 'span', attribs: {}, children: [
                { name: 'child', attribs: {}, children: ['child1'] },
                { name: 'child', attribs: {}, children: ['child2'] },
                { name: 'child', attribs: {}, children: ['child3'] }
            ] },
            { diffMissingChildren: false });

        expect(result, 'to satisfy', {
            diff: {
                children: expect.it('to have length', 2)
            },
            weight: Diff.DefaultWeights.OK
        });
    });

    it('ignores extra children if diffExtraChildren:false', () => {

        const result = getDiff( { name: 'span', attribs: {}, children: [
                { name: 'child', attribs: {}, children: ['child1'] },
                { name: 'child', attribs: {}, children: ['child2'] },
                { name: 'child', attribs: {}, children: ['child3'] }
            ] },
            { name: 'span', attribs: {}, children: [
                { name: 'child', attribs: {}, children: ['child1'] },
                { name: 'child', attribs: {}, children: ['child2'] }
            ] },
            { diffExtraChildren: false });

        expect(result, 'to satisfy', {
            diff: {
                children: [
                    { },
                    { },
                    {
                        type: 'ELEMENT',
                        name: 'child',
                        diff: undefined,
                        children: [{
                            type: 'CONTENT',
                            value: 'child3'
                        }]
                    }
                ]
            },
            weight: Diff.DefaultWeights.OK
        });
    });

    it('ignores missing attributes if diffRemovedAttributes:false', () => {

        const result = getDiff(
            {
                name: 'span',
                attribs: {
                    id: 'bar'
                },
                children: []
            },
            {
                name: 'span',
                attribs: {
                    className: 'foo',
                    id: 'bar'
                },
                children: []
            },
            { diffRemovedAttributes: false });

        expect(result, 'to satisfy', {
            diff: {
                type: 'ELEMENT',
                name: 'span',
                attributes: [{ name: 'id', value: 'bar' }]
            },
            weight: Diff.DefaultWeights.OK
        });

    });

    it('ignores extra attributes if diffExtraAttributes:false', () => {

        const result = getDiff(
            {
                name: 'span',
                attribs: {
                    className: 'foo',
                    id: 'bar'
                },
                children: []
            },
            {
                name: 'span',
                attribs: {
                    id: 'bar'
                },
                children: []
            },
            { diffExtraAttributes: false });

        expect(result, 'to satisfy', {
            diff: {
                type: 'ELEMENT',
                name: 'span',
                attributes: [
                    { name: 'className', value: 'foo', diff: undefined },
                    { name: 'id', value: 'bar' }
                ]
            },
            weight: Diff.DefaultWeights.OK
        });

    });

    it("doesn't wrap an element when it means there are missing children", () => {

        /*  This is an awkward special case.
         *  When given the following actual
         *  <SomeElement>
         *      <ThisIsNotAWrapper />
         *  </SomeElement>
         *
         *  vs expected
         *
         *  <SomeElement>
         *      <ExpectedElement />
         *  </SomeElement>
         *
         *  We would expect
         *  <SomeElement>
         *      <ThisIsNotAWrapper // should be <ExpectedElement
         *      />
         *  </SomeElement>
         *
         *   But, because element name changes have a large weight, and we're not diffing wrappers,
         *   what we get by default is
         *   <SomeElement>
         *     <ThisIsNotAWrapper>                  <-- Greyed out as it's identified as a wrapper
         *       // missing <ExpectedElement />     <-- Identified as a missing child
         *     </ThisIsNotAWrapper>                 <-- Greyed out as it's identified as a wrapper
         *   </SomeElement>
         */
        const result = getDiff(
            {
                name: 'SomeElement',
                attribs: {},
                children: [
                    { name: 'ThisIsNotAWrapper', attribs: {}, children: [] }
                ]
            },
            {
                name: 'SomeElement',
                attribs: {},
                children: [
                    { name: 'ExpectedElement', attribs: {}, children: [] }
                ]
            },
            { diffWrappers: false });

        expect(result, 'to satisfy', {
            diff: {
                type: 'ELEMENT',
                name: 'SomeElement',
                attributes: [],
                children: [
                    {
                        type: 'ELEMENT',
                        name: 'ThisIsNotAWrapper',
                        diff: {
                            type: 'differentElement',
                            expectedName: 'ExpectedElement'
                        }
                    }

                ]
            },
            weight: Diff.DefaultWeights.NAME_MISMATCH
        });
    });

    it('diffs extra children when the expected has no children but wrappers are allowed', () => {

        // This checks the case that an actual that has a child that shouldn't,
        // isn't simply marked as a wrapper - ie. a wrapper must wrap something!

        const result = getDiff(
            {
                name: 'SomeElement',
                attribs: {},
                children: [
                    { name: 'div', attribs: {}, children: [] }
                ]
            },
            {
                name: 'SomeElement',
                attribs: {},
                children: []
            },
            { diffWrappers: false });

        expect(result, 'to satisfy', {
            diff: {
                type: 'ELEMENT',
                name: 'SomeElement',
                children: [
                    {
                        type: 'ELEMENT',
                        name: 'div',
                        diff: {
                            type: 'extra'
                        }
                    }
                ]
            }
        })
    })


});
