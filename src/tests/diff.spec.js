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
    return Diff.diffElements(TestAdapter, TestAdapter, actual, expected, expect, options);
}

expect.addType({
    name: 'TestHtmlElement',
    identify: function (value) {
        return value &&
            typeof value === 'object' &&
            typeof value.name === 'string' &&
            typeof value.attribs === 'object';
    }
});

expect.addAssertion('<string|TestHtmlElement> when diffed against <string|TestHtmlElement> <assertion>', function (expect, subject, value) {

    return getDiff(subject, value, {}).then(diff => {
        expect.shift(diff);
    });
});

expect.addAssertion('<TestHtmlElement|string> when diffed with options against <object> <TestHtmlElement|string> <assertion>', function (expect, subject, options, value) {

    return getDiff(subject, value, options).then(diff => {
        expect.shift(diff);
    });
});


describe('diff', () => {

    it('returns no differences for an identical element', () => {

        return expect(
            { name: 'span', attribs: { className: 'foo' }, children: ['some text'] },
            'when diffed against',
            { name: 'span', attribs: { className: 'foo' }, children: ['some text'] },
            'to satisfy',
            {
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

        return expect(
            { name: 'span', attribs: { className: 'foo' }, children: ['some text'] },
            'when diffed against',
            { name: 'span', attribs: { className: 'bar' }, children: ['some text'] },
            'to satisfy',
            {
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


        return expect({ name: 'span', attribs: { className: 'foo' }, children: ['some text'] },
            'when diffed against',
            { name: 'span', attribs: {}, children: ['some text'] },
            'to satisfy', {
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

        return expect({ name: 'span', attribs: { id: 'abc', className: 'foo' }, children: ['some text'] },
            'when diffed against',
            { name: 'span', attribs: { id: 'abcd' }, children: ['some text'] },
            'to satisfy', {
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

        return expect({ name: 'span', attribs: {}, children: ['some text'] },
            'when diffed against',
            { name: 'span', attribs: { className: 'foo' }, children: ['some text'] },
            'to satisfy', {
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

        return expect({ name: 'span', attribs: {}, children: ['some text'] },
            'when diffed against',
            { name: 'span', attribs: {}, children: ['some changed text'] },
            'to satisfy', {
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

        return expect({ name: 'span', attribs: {}, children: [
                { name: 'child', attribs: {}, children: ['child1'] },
                { name: 'child', attribs: {}, children: ['child2'] }
            ] },
            'when diffed against',
            { name: 'span', attribs: {}, children: [
                { name: 'child', attribs: {}, children: ['child1'] },
                { name: 'child', attribs: {}, children: ['child2'] },
                { name: 'child', attribs: {}, children: ['child3'] }
            ] },
            'to satisfy',
            {
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
        return expect({
                name: 'span', attribs: {}, children: [
                    { name: 'child', attribs: {}, children: ['child1'] },
                    { name: 'child', attribs: {}, children: ['child3'] }
                ]
            },
            'when diffed against',
            {
                name: 'span', attribs: {}, children: [
                { name: 'child', attribs: {}, children: ['child1'] },
                { name: 'child', attribs: {}, children: ['child2'] },
                { name: 'child', attribs: {}, children: ['child3'] }
            ]
            },
            'to satisfy',
            {
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
        return expect({ name: 'span', attribs: {}, children: [
            { name: 'child', attribs: {}, children: ['child1'] },
            { name: 'child', attribs: {}, children: ['child2'] },
            { name: 'child', attribs: {}, children: ['child3'] }
        ] }, 'when diffed against', { name: 'span', attribs: {}, children: [
            { name: 'child', attribs: {}, children: ['child1'] },
            { name: 'child', attribs: {}, children: ['child2'] }
        ] }, 'to satisfy', {
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
        // See comments in 'diffs a removed middle child' as to why this isn't an ideal diff
        return expect({ name: 'span', attribs: {}, children: [
            { name: 'child', attribs: {}, children: ['child1'] },
            { name: 'child', attribs: {}, children: ['child2'] },
            { name: 'child', attribs: {}, children: ['child3'] }
        ] }, 'when diffed against', { name: 'span', attribs: {}, children: [
            { name: 'child', attribs: {}, children: ['child1'] },
            { name: 'child', attribs: {}, children: ['child3'] }
        ] }, 'to satisfy', {
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

    it('diffs a changed middle child', () => {
        return expect({ name: 'span', attribs: {}, children: [
            { name: 'child', attribs: {}, children: ['child1'] },
            { name: 'child', attribs: {}, children: ['child2 changed'] },
            { name: 'child', attribs: {}, children: ['child3'] }
        ] }, 'when diffed against', { name: 'span', attribs: {}, children: [
            { name: 'child', attribs: {}, children: ['child1'] },
            { name: 'child', attribs: {}, children: ['child2'] },
            { name: 'child', attribs: {}, children: ['child3'] }
        ] }, 'to satisfy', {
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
                            value: 'child2 changed',
                            diff: {
                                type: 'changed',
                                expectedValue: 'child2'
                            }
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
            weight: Diff.DefaultWeights.STRING_CONTENT_MISMATCH
        });
    });

    it('diffs a missing content entry', () => {
        // See comments in 'diffs a removed middle child' as to why this isn't an ideal diff
        return expect({ name: 'span', attribs: {}, children: [
            'child1', 'child3'] }, 'when diffed against', { name: 'span', attribs: {}, children: [
            'child1', 'child2', 'child3'] }, 'to satisfy', {
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
        // See comments in 'diffs a removed middle child' as to why this isn't an ideal diff
        return expect({ name: 'span', attribs: {}, children: [
            'child1', 'child2', 'child3'] }, 'when diffed against', { name: 'span', attribs: {}, children: [
            'child1', 'child3'] }, 'to satisfy', {
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
        return expect(
            { name: 'span', attribs: { className: 'foo' }, children: ['some text'] },
            'when diffed against',
            { name: 'div', attribs: { className: 'foo' }, children: ['some text'] },
            'to satisfy',
            {
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
            }
        );
    });

    it('diffs a content-should-be-element', () => {
        return expect(
            'some content',
            'when diffed against',
            { name: 'div', attribs: { className: 'foo' }, children: ['some text'] },
            'to satisfy',
            {
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
            }
        );
    });

    it('diffs a element-should-be-content', () => {
        return expect(
            { name: 'div', attribs: { className: 'foo' }, children: ['some text'] },
            'when diffed with options against',
            {
                weights: { NATIVE_NONNATIVE_MISMATCH: 1 }  // Need to fool the weight to force this, otherwise it's a wrapper
            },
            'some content',
            'to satisfy',
            {
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
            }
        );
    });

    it('diffs a wrapper around a single child', () => {
        return expect({ name: 'div', attribs: { className: 'foo' }, children: [
            { name: 'wrapper', attribs: { className: 'the-wrapper' }, children: [
                { name: 'real', attribs: { className: 'real-element' } }
            ] }
        ] }, 'when diffed against', { name: 'div', attribs: { className: 'foo' }, children: [
            { name: 'real', attribs: { className: 'real-element' } }
        ] }, 'to satisfy', {
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
        return expect({ name: 'div', attribs: { className: 'foo' }, children: [
            { name: 'wrapper', attribs: { className: 'the-wrapper' }, children: [
                { name: 'real', attribs: { className: 'real-element' } }
            ] }
        ] }, 'when diffed against', { name: 'div', attribs: { className: 'foo' }, children: [
            { name: 'real', attribs: { className: 'real-element' } }
        ] }, 'to satisfy', {
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
        return expect({ name: 'div', attribs: { className: 'foo' }, children: [
            { name: 'wrapper', attribs: { className: 'the-wrapper' }, children: [
                { name: 'real', attribs: { className: 'real-element-1' } },
                { name: 'real', attribs: { className: 'real-element-2' } },
                { name: 'real', attribs: { className: 'real-element-3' } }
            ] }
        ] }, 'when diffed against', { name: 'div', attribs: { className: 'foo' }, children: [
            { name: 'real', attribs: { className: 'real-element-1' } },
            { name: 'real', attribs: { className: 'real-element-2' } },
            { name: 'real', attribs: { className: 'real-element-3' } }
        ] }, 'to satisfy', {
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
        return expect({ name: 'div', attribs: { className: 'foo' }, children: [
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
        ] }, 'when diffed against', { name: 'div', attribs: { className: 'foo' }, children: [
            { name: 'real', attribs: { className: 'real-element-1' } },
            { name: 'real', attribs: { className: 'real-element-2' } },
            { name: 'real', attribs: { className: 'real-element-3' } }
        ] }, 'to satisfy', {
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
        return expect({ name: 'div', attribs: { className: 'foo' }, children: [
            { name: 'wrapper', attribs: { className: 'the-wrapper' }, children: [
                { name: 'real', attribs: { className: 'real-element' } }
            ] }
        ] }, 'when diffed with options against', {
            diffWrappers: false
        }, { name: 'div', attribs: { className: 'foo' }, children: [
            { name: 'real', attribs: { className: 'real-element' } }
        ] }, 'to satisfy', {
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
        return expect({ name: 'div', attribs: { className: 'foo' }, children: [
            { name: 'wrapper', attribs: { className: 'the-wrapper' }, children: [
                { name: 'real', attribs: { className: 'real-element-1' } },
                { name: 'real', attribs: { className: 'real-element-2' } },
                { name: 'real', attribs: { className: 'real-element-3' } }
            ] }
        ] }, 'when diffed with options against', { diffWrappers: false }, { name: 'div', attribs: { className: 'foo' }, children: [
            { name: 'real', attribs: { className: 'real-element-1' } },
            { name: 'real', attribs: { className: 'real-element-2' } },
            { name: 'real', attribs: { className: 'real-element-3' } }
        ] }, 'to satisfy', {
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
        return expect({ name: 'div', attribs: { className: 'foo' }, children: [
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
        ] }, 'when diffed with options against', { diffWrappers: false }, { name: 'div', attribs: { className: 'foo' }, children: [
            { name: 'real', attribs: { className: 'real-element-1' } },
            { name: 'real', attribs: { className: 'real-element-2' } },
            { name: 'real', attribs: { className: 'real-element-3' } }
        ] }, 'to satisfy', {
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
        return expect({
            name: 'TopLevel', attribs: {}, children: [
                { name: 'MidLevel', attribs: {}, children: [
                    { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] },
                    { name: 'span', attribs: { id: 'childfoo' }, children: ['two'] }
                ] }
            ]
        }, 'when diffed with options against', { diffWrappers: false }, {
            name: 'MidLevel', attribs: {}, children: [
                { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] },
                { name: 'span', attribs: { id: 'childfoo' }, children: ['two'] }
            ]
        }, 'to satisfy', {
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
        return expect({
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
        }, 'when diffed with options against', { diffWrappers: false }, {
            name: 'MidLevel', attribs: {}, children: [
                { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] },
                { name: 'span', attribs: { id: 'childfoo' }, children: ['two'] }
            ]
        }, 'to satisfy', {
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
        return expect({ name: 'span', attribs: {}, children: [
            { name: 'child', attribs: {}, children: ['child1'] },
            { name: 'child', attribs: {}, children: ['child2'] }
        ] }, 'when diffed with options against', { diffMissingChildren: false }, { name: 'span', attribs: {}, children: [
            { name: 'child', attribs: {}, children: ['child1'] },
            { name: 'child', attribs: {}, children: ['child2'] },
            { name: 'child', attribs: {}, children: ['child3'] }
        ] }, 'to satisfy', {
            diff: {
                children: expect.it('to have length', 2)
            },
            weight: Diff.DefaultWeights.OK
        });
    });

    it('ignores extra children if diffExtraChildren:false', () => {
        return expect({ name: 'span', attribs: {}, children: [
            { name: 'child', attribs: {}, children: ['child1'] },
            { name: 'child', attribs: {}, children: ['child2'] },
            { name: 'child', attribs: {}, children: ['child3'] }
        ] }, 'when diffed with options against', { diffExtraChildren: false }, { name: 'span', attribs: {}, children: [
            { name: 'child', attribs: {}, children: ['child1'] },
            { name: 'child', attribs: {}, children: ['child2'] }
        ] }, 'to satisfy', {
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
        return expect({
            name: 'span',
            attribs: {
                id: 'bar'
            },
            children: []
        }, 'when diffed with options against', { diffRemovedAttributes: false }, {
            name: 'span',
            attribs: {
                className: 'foo',
                id: 'bar'
            },
            children: []
        }, 'to satisfy', {
            diff: {
                type: 'ELEMENT',
                name: 'span',
                attributes: [{ name: 'id', value: 'bar' }]
            },
            weight: Diff.DefaultWeights.OK
        });
    });

    it('ignores extra attributes if diffExtraAttributes:false', () => {
        return expect({
            name: 'span',
            attribs: {
                className: 'foo',
                id: 'bar'
            },
            children: []
        }, 'when diffed with options against', { diffExtraAttributes: false }, {
            name: 'span',
            attribs: {
                id: 'bar'
            },
            children: []
        }, 'to satisfy', {
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
        return expect({
            name: 'SomeElement',
            attribs: {},
            children: [
                { name: 'ThisIsNotAWrapper', attribs: {}, children: [] }
            ]
        }, 'when diffed with options against', { diffWrappers: false }, {
            name: 'SomeElement',
            attribs: {},
            children: [
                { name: 'ExpectedElement', attribs: {}, children: [] }
            ]
        }, 'to satisfy', {
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
        return expect({
            name: 'SomeElement',
            attribs: {},
            children: [
                { name: 'div', attribs: {}, children: [] }
            ]
        }, 'when diffed with options against', { diffWrappers: false }, {
            name: 'SomeElement',
            attribs: {},
            children: []
        }, 'to satisfy', {
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
        });
    });

    describe('expect.it', () => {

        it('accepts a passing expect.it attribute assertion', () => {
            return expect({
                type: 'ELEMENT',
                name: 'SomeElement',
                attribs: {
                    className: 'abcde'
                }
            }, 'when diffed against', {
                name: 'SomeElement',
                attribs: {
                    className: expect.it('to match', /[a-e]+$/)
                }
            }, 'to satisfy', {
                diff: {
                    type: 'ELEMENT',
                    name: 'SomeElement',
                    attributes: [ {
                        name: 'className',
                        value: 'abcde',
                        diff: undefined
                    }]
                }
            });
        });

        it('diffs an expect.it attribute assertion', () => {
            return expect({
                type: 'ELEMENT',
                name: 'SomeElement',
                attribs: {
                    className: 'abcde'
                }
            }, 'when diffed against', {
                name: 'SomeElement',
                attribs: {
                    className: expect.it('to match', /[a-d]+$/)
                }
            }, 'to satisfy', {
                diff: {
                    type: 'ELEMENT',
                    name: 'SomeElement',
                    attributes: [ {
                        name: 'className',
                        value: 'abcde',
                        diff: {
                            type: 'custom',
                            assertion: expect.it('to be a', 'function')
                        }
                    }]
                },
                weight: Diff.DefaultWeights.ATTRIBUTE_MISMATCH
            });
        });

        it('diffs an expect.it content assertion', () => {
            return expect({
                type: 'ELEMENT',
                name: 'SomeElement',
                attribs: {},
                children: [ 'abcde' ]
            }, 'when diffed against', {
                name: 'SomeElement',
                attribs: {},
                children: [expect.it('to match', /[a-d]+$/) ]
            }, 'to satisfy', {
                diff: {
                    type: 'ELEMENT',
                    name: 'SomeElement',
                    children: [{
                        type: 'CONTENT',
                        value: 'abcde',
                        diff: {
                            type: 'custom',
                            assertion: expect.it('to be a', 'function'),
                            error: expect.it('to be a', 'UnexpectedError')
                                .and('to have message', 'expected \'abcde\' to match /[a-d]+$/')
                        }
                    }]
                },
                weight: Diff.DefaultWeights.STRING_CONTENT_MISMATCH
            });
        });

        it('returns a CONTENT type for a passed content assertion', () => {
            return expect({
                type: 'ELEMENT',
                name: 'SomeElement',
                attribs: {},
                children: [ 'abcd' ]
            }, 'when diffed against', {
                name: 'SomeElement',
                attribs: {},
                children: [expect.it('to match', /[a-d]+$/) ]
            }, 'to satisfy', {
                diff: {
                    type: 'ELEMENT',
                    name: 'SomeElement',
                    children: [{
                        type: 'CONTENT',
                        value: 'abcd',
                        diff: undefined
                    }]
                },
                weight: Diff.DefaultWeights.OK
            });
        });
    });

});
