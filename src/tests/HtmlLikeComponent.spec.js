
import HtmlLikeUnexpected from '../';
import MagicPen from 'magicpen';
import MagicPenPrism from 'magicpen-prism';
import Unexpected from 'unexpected';
import ObjectAssign from 'object-assign';

const expect = Unexpected.clone();

const TestAdapter = {
        getName(comp) { return comp.name; },

        getAttributes(comp) { return comp.attribs; },

        getChildren(comp) {
            return [].concat([], comp.children);
        }
};

expect.addType({
    name: 'TestHtmlLike',
    identify: value => value && value.name && value.attribs && value.children,
    inspect: (value, depth, output, inspect) => {

        const htmlLikeUnexpected = new HtmlLikeUnexpected(TestAdapter, TestAdapter);
        return htmlLikeUnexpected.inspect(value, depth, output, inspect);
    },

    diff: (actual, expected, output, diff, inspect, equal) => {
        const htmlLikeUnexpected = new HtmlLikeUnexpected(TestAdapter, TestAdapter);
        return htmlLikeUnexpected.inspect(value, depth, output, inspect);
    }
});

expect.addAssertion('<any> to inspect as <string>', (expect, subject, value) => {
    expect(expect.inspect(subject).toString(), 'to equal', value);
});

expect.addAssertion('<TestHtmlLike> when diffed against <TestHtmlLike> <assertion>', (expect, subject, value) => {

    const htmlLikeUnexpected = new HtmlLikeUnexpected(TestAdapter);
    const pen = expect.output.clone();
    const result = htmlLikeUnexpected.diff(TestAdapter, subject, value, pen, expect.diff.bind(expect), expect.inspect.bind(expect), expect.equal.bind(expect));
    return expect.shift(result);
});

expect.addAssertion('<TestHtmlLike> when diffed with options against <object> <TestHtmlLike> <assertion>', (expect, subject, options, value) => {

    const htmlLikeUnexpected = new HtmlLikeUnexpected(TestAdapter);
    const pen = expect.output.clone();
    const result = htmlLikeUnexpected.diff(TestAdapter, subject, value, pen, expect.diff.bind(expect), expect.inspect.bind(expect), expect.equal.bind(expect), options);
    return expect.shift(result);
});

expect.addType({
    name: 'HtmlDiffResult',
    identify: value => value && value.output && value.weight && typeof value.weight.real === 'number'
});

expect.addAssertion('<HtmlDiffResult> to have weight <number>', (expect, subject, weight) => {
    expect.withError(() => expect(subject.weight.real, 'to equal', weight), e => {
        expect.fail({
            diff: function (output) {
                return {
                    inline: false,
                    diff: output.error('expected').text(' weight ').gray('to be ').text(weight).gray(' but was ').text(subject.weight.real)
                };
            }
        })
    });
});

expect.addAssertion('<HtmlDiffResult> to output <magicpen>', (expect, subject, pen) => {
    expect.withError(() => expect(subject.output, 'to equal', pen), e => {
      return expect.fail({
          diff: function (output, diff, inspect, equal) {
             return {
                 inline: false,
                 diff: output.block(function () {
                     this.append(inspect(subject.output))
                 }).sp().block(function () {
                     this.append(inspect(pen))
                 })
             };
          }
      })
    });
});

expect.addAssertion('<HtmlDiffResult> to output <string>', (expect, subject, value) => {
    expect(subject.output.toString(), 'to equal', value);
});

expect.addAssertion('<HtmlDiffResult> to output with weight <string> <number>', (expect, subject, value, weight) => {
    expect(subject.output.toString(), 'to equal', value);
    expect(subject, 'to have weight', weight);
});


expect.use(MagicPenPrism);

const prismPen = MagicPen();
prismPen.use(MagicPenPrism);

describe('HtmlLikeComponent', () => {


    it('outputs a formatted output with no children', () => {
        expect({ name: 'div', attribs: { id: 'foo', className: 'bar' }, children: [] }, 'to inspect as',
        '<div id="foo" className="bar" />');

    });

    it('outputs a formatted output with children', () => {

        expect({
            name: 'div', attribs: {id: 'foo', className: 'bar'}, children: [
                {
                    name: 'span',
                    attribs: { className: 'child1' },
                    children: ['child content 1']
                },
                {
                    name: 'span',
                    attribs: { className: 'child2' },
                    children: ['child content 2']
                }
            ]
        }, 'to inspect as',
            '<div id="foo" className="bar">\n' +
            '  <span className="child1">child content 1</span>\n' +
            '  <span className="child2">child content 2</span>\n' +
            '</div>');
    });

    it('outputs object attributes', () => {
        expect({
                name: 'div', attribs: { style: { width: 125, height: 100 } }, children: [
                ]
            }, 'to inspect as',
            '<div style={{ width: 125, height: 100 }} />');

    });

    it.only('outputs large object attributes over multiple lines', () => {
        expect({
                name: 'div',
                attribs: {
                    style: {
                        width: 125,
                        height: 100,
                        background: '#ff6600 url("blah blah blah blah blah")'
                    }
                }, children: []
            }, 'to inspect as',
            '<div style={{ width: 125, height: 100 }} />');

    });

    it('outputs deeply nested children over multiple lines', () => {

        expect({
                name: 'div', attribs: { id: 'outside-wrapper', className: 'wrap-me' }, children: [
                    {
                        name: 'div', attribs: {id: 'foo', className: 'bar'}, children: [
                        {
                            name: 'span',
                            attribs: { className: 'child1' },
                            children: ['child content 1']
                        },
                        {
                            name: 'span',
                            attribs: { className: 'child2' },
                            children: ['child content 2']
                        }
                    ]
                    }
                ]
    }, 'to inspect as',
            '<div id="outside-wrapper" className="wrap-me">\n' +
            '  <div id="foo" className="bar">\n' +
            '    <span className="child1">child content 1</span>\n' +
            '    <span className="child2">child content 2</span>\n' +
            '  </div>\n' +
            '</div>');

    })

    it('outputs children on a single line if it fits', () => {

        expect({
            name: 'div', attribs: {id: 'foo', className: 'bar'}, children: [
                {
                    name: 'span',
                    children: ['1']
                },
                {
                    name: 'span',
                    children: ['2']
                }
            ]
        }, 'to inspect as', '<div id="foo" className="bar"><span>1</span><span>2</span></div>');
    });

    it('outputs attributes on split lines if they are too long, with no content', () => {
        expect({
            name: 'div', attribs: {
                id: 'foo',
                className: 'bar blah mcgar',
                'aria-role': 'special-long-button',
                'data-special': 'some other long attrib'
            },
            children: []
        }, 'to inspect as',
            '<div\n' +
            '  id="foo"\n' +
            '  className="bar blah mcgar"\n' +
            '  aria-role="special-long-button"\n' +
            '  data-special="some other long attrib"\n' +
            '/>');
    });

    it('outputs attributes on split lines if they are too long, with content', () => {
        expect({
            name: 'div', attribs: {
                id: 'foo',
                className: 'bar blah mcgar',
                'aria-role': 'special-long-button',
                'data-special': 'some other long attrib'
            },
            children: ['some content']
        }, 'to inspect as',
            '<div\n' +
            '  id="foo"\n' +
            '  className="bar blah mcgar"\n' +
            '  aria-role="special-long-button"\n' +
            '  data-special="some other long attrib"\n' +
            '>\n' +
            '  some content\n' +
            '</div>');
    });

    describe('with no external inspect function', () => {

        let htmlLikeUnexpected;
        let pen;

        beforeEach(() => {

            htmlLikeUnexpected = new HtmlLikeUnexpected(TestAdapter);
            pen = new MagicPen();
            pen.use(MagicPenPrism);
        });

        it('outputs an object attribute with ellipses', () => {

            htmlLikeUnexpected.inspect({
                name: 'div', attribs: {special: {abc: 123, def: 'bar'}}, children: []
            }, 0, pen);

            expect(pen.toString(), 'to equal', '<div special={...} />');
        });
    });

    describe('with an external inspect function', () => {

        let htmlLikeUnexpected;
        let pen;

        beforeEach(() => {

            htmlLikeUnexpected = new HtmlLikeUnexpected(TestAdapter);
            pen = new MagicPen();
            pen.use(MagicPenPrism);
        });

        it('outputs an inspected object attribute', () => {

            htmlLikeUnexpected.inspect({
                name: 'div', attribs: {special: {abc: 123, def: 'bar'}}, children: []
            }, 0, pen, value => ('INSPECTED' + value.abc));
            expect(pen.toString(), 'to equal', "<div special={INSPECTED123} />");
        });
    });

    describe('diff', () => {

       it('gets the weight correct for a single component with a different attribute', () => {

           expect(
               {
                   name: 'div', attribs: { id: 'foo' }, children: []
               },
               'when diffed against',
               {
                   name: 'div', attribs: { id: 'bar' }, children: []
               },
               'to have weight', HtmlLikeUnexpected.DefaultWeights.ATTRIBUTE_MISMATCH
           );

       });

        it('outputs the diff of a single component with a different attribute', () => {

            expect(
                {
                    name: 'div', attribs: { id: 'foo' }, children: []
                },
                'when diffed against',
                {
                    name: 'div', attribs: { id: 'bar' }, children: []
                },
                'to output',
                '<div id="foo" // should be id="bar" -foo\n' +
                '              //                    +bar\n' +
                '/>'
            );

        });

        it('outputs attributes that are different types but evaluate to the same string', () => {
            expect(
                {
                    name: 'div', attribs: { id: '42' }, children: []
                },
                'when diffed against',
                {
                    name: 'div', attribs: { id: 42 }, children: []
                },
                'to output with weight',
                '<div id="42" // should be id={42}  42\n' +
                '/>', 1);

        });

        it('outputs the diff of a single component with a different attribute and a matching attribute after', () => {

            expect(
                {
                    name: 'div', attribs: { id: 'foo', className: 'testing' }, children: []
                },
                'when diffed against',
                {
                    name: 'div', attribs: { id: 'bar', className: 'testing' }, children: []
                },
                'to output',
                '<div id="foo" // should be id="bar" -foo\n' +
                '              //                    +bar\n' +
                '   className="testing"\n' +
                '/>'
            );
        });

        it('outputs the diff of a single component with a different attribute and a matching attribute before', () => {

            expect(
                {
                    name: 'div', attribs: { className: 'testing', id: 'foo'  }, children: []
                },
                'when diffed against',
                {
                    name: 'div', attribs: { className: 'testing', id: 'bar' }, children: []
                },
                'to output',
                '<div className="testing" id="foo" // should be id="bar" -foo\n' +
                '                                  //                    +bar\n' +
                '/>'
            );
        });

        it('breaks the output if there are lots of matching attributes', () => {

            const attribs = {
                attrib1: 'aaa',
                attrib2: 'hello world',
                attrib3: 'testing is fun',
                attrib4: 'hallo welt',
                attrib5: 'jonny number five'
            };

            const afterAttribs = {
                after: 'bbb',
                after2: 'ccc some more words',
                after3: 'here is some more'
            };
            const actualAttribs = ObjectAssign({}, attribs, { mismatch: 'foo' }, afterAttribs);
            const expectedAttribs = ObjectAssign({}, attribs, { mismatch: 'bar' }, afterAttribs);

            expect(
                {
                    name: 'div', attribs: actualAttribs, children: []
                },
                'when diffed against',
                {
                    name: 'div', attribs: expectedAttribs, children: []
                },
                'to output',
                '<div attrib1="aaa" attrib2="hello world" attrib3="testing is fun"\n' +
                '   attrib4="hallo welt" attrib5="jonny number five"\n' +
                '   mismatch="foo" // should be mismatch="bar" -foo\n' +
                '                  //                          +bar\n' +
                '   after="bbb" after2="ccc some more words" after3="here is some more"\n' +
                '/>'
            );
        });

        it('highlights a missing attribute', () => {
            expect(
                {
                    name: 'div', attribs: { id: 'foo'  }, children: []
                },
                'when diffed against',
                {
                    name: 'div', attribs: { className: 'testing', id: 'foo' }, children: []
                },
                'to output',
                '<div id="foo" // missing className="testing"\n' +
                '/>'
            );
        });

        it('highlights two missing attributes', () => {
            expect(
                {
                    name: 'div', attribs: { id: 'foo'  }, children: []
                },
                'when diffed against',
                {
                    name: 'div', attribs: { className: 'testing', id: 'foo', extra: '123' }, children: []
                },
                'to output',
                '<div id="foo" // missing className="testing"\n' +
                '   // missing extra="123"\n' +
                '/>'
            );
        });

        it('diffs a component with a single text child', () => {

            expect(
                {
                    name: 'div', attribs: { id: 'foo' }, children: ['abc']
                },
                'when diffed against',
                {
                    name: 'div', attribs: { id: 'foo' }, children: ['def']
                },
                'to output with weight',
                '<div id="foo">\n' +
                '  -abc\n' +
                '  +def\n' +
                '</div>', HtmlLikeUnexpected.DefaultWeights.STRING_CONTENT_MISMATCH
            );
        });

        it('diffs a component with mismatching content types', () => {

            expect(
                {
                    name: 'div', attribs: { id: 'foo' }, children: [ '42' ]
                },
                'when diffed against',
                {
                    name: 'div', attribs: { id: 'foo' }, children: [ 42 ]
                },
                'to output with weight',
                '<div id="foo">\n' +
                '  42 // mismatched type -string\n' +
                '     //                 +number\n' +
                '</div>', HtmlLikeUnexpected.DefaultWeights.CONTENT_TYPE_MISMATCH
            );
        });

        it('diffs a component with child components with different content', () => {

            expect(
                {
                    name: 'div', attribs: { id: 'foo' }, children: [
                    { name: 'span', attribs: {}, children: ['one'] },
                    { name: 'span', attribs: {}, children: ['two'] }
                ]
                },
                'when diffed against',
                {
                    name: 'div', attribs: { id: 'foo' }, children: [
                    { name: 'span', attribs: {}, children: ['one'] },
                    { name: 'span', attribs: {}, children: ['updated'] }
                ]
                },
                'to output with weight',
                '<div id="foo">\n' +
                '  <span>one</span>\n' +
                '  <span>\n' +
                '    -two\n' +
                '    +updated\n' +
                '  </span>\n' +
                '</div>', HtmlLikeUnexpected.DefaultWeights.STRING_CONTENT_MISMATCH
            );
        });

        it('diffs a component with child components with different tags', () => {

            expect(
                {
                    name: 'div', attribs: { id: 'foo' }, children: [
                    { name: 'div', attribs: {}, children: ['one'] },
                    { name: 'span', attribs: {}, children: ['two'] }
                ]
                },
                'when diffed against',
                {
                    name: 'div', attribs: { id: 'foo' }, children: [
                    { name: 'span', attribs: {}, children: ['one'] },
                    { name: 'span', attribs: {}, children: ['two'] }
                ]
                },
                'to output with weight',
                '<div id="foo">\n' +
                '  <div // should be <span>\n' +
                '  >\n' +
                '    one\n' +
                '  </div>\n' +
                '  <span>two</span>\n' +
                '</div>', HtmlLikeUnexpected.DefaultWeights.NAME_MISMATCH
            );
        });

        it('diffs a component with child components with different attributes', () => {

            expect(
                {
                    name: 'div', attribs: { id: 'foo' }, children: [
                    { name: 'span', attribs: { id: 'childfoo'}, children: ['one'] },
                    { name: 'span', attribs: {}, children: ['two'] }
                ]
                },
                'when diffed against',
                {
                    name: 'div', attribs: { id: 'foo' }, children: [
                    { name: 'span', attribs: { id: 'childbar' }, children: ['one'] },
                    { name: 'span', attribs: {}, children: ['two'] }
                ]
                },
                'to output with weight',
                '<div id="foo">\n' +
                '  <span id="childfoo" // should be id="childbar" -childfoo\n' +
                '                      //                         +childbar\n' +
                '  >\n' +
                '    one\n' +
                '  </span>\n' +
                '  <span>two</span>\n' +
                '</div>', HtmlLikeUnexpected.DefaultWeights.ATTRIBUTE_MISMATCH
            );
        });

        it('diffs a component with a missing child', () => {

            expect(
                {
                    name: 'div', attribs: { id: 'foo' }, children: [
                    { name: 'span', attribs: { id: 'childfoo'}, children: ['one'] }
                ]
                },
                'when diffed against',
                {
                    name: 'div', attribs: { id: 'foo' }, children: [
                    { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] },
                    { name: 'span', attribs: {}, children: ['two'] }
                ]
                },
                'to output with weight',
                '<div id="foo">\n' +
                '  <span id="childfoo">one</span>\n' +
                '  // missing <span>two</span>\n' +
                '</div>', HtmlLikeUnexpected.DefaultWeights.CHILD_MISSING
            );
        });

        it('diffs a component with an extra child', () => {

            expect(
                {
                    name: 'div', attribs: { id: 'foo' }, children: [
                    { name: 'span', attribs: { id: 'childfoo'}, children: ['one'] },
                    { name: 'span', attribs: {}, children: ['two'] }
                ]
                },
                'when diffed against',
                {
                    name: 'div', attribs: { id: 'foo' }, children: [
                    { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] }
                ]
                },
                'to output with weight',
                '<div id="foo">\n' +
                '  <span id="childfoo">one</span>\n' +
                '  <span>two</span> // should be removed\n' +
                '</div>', HtmlLikeUnexpected.DefaultWeights.CHILD_INSERTED
            );
        });

        it('diffs a component with a child that is an element and should be a string', () => {

            expect(
                {
                    name: 'div', attribs: { id: 'foo' }, children: [
                    { name: 'span', attribs: { id: 'childfoo'}, children: ['one'] },
                    { name: 'span', attribs: {}, children: ['two'] }
                ]
                },
                'when diffed against',
                {
                    name: 'div', attribs: { id: 'foo' }, children: [
                    { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] },
                    'some text'
                ]
                },
                'to output with weight',
                '<div id="foo">\n' +
                '  <span id="childfoo">one</span>\n' +
                "  <span>two</span> // should be 'some text'\n" +
                '</div>', HtmlLikeUnexpected.DefaultWeights.NATIVE_NONNATIVE_MISMATCH
            );
        });

        it('lays out a diff where element should be wrapped but it all fits on one line', () => {

            expect(
                {
                    name: 'div', attribs: {}, children: [
                    'two'
                ]
                },
                'when diffed against',
                {
                    name: 'div', attribs: {}, children: [
                    { name: 'child', attribs: {}, children: ['aa' ] }
                ]
                },
                'to output with weight',
                '<div>\n' +
                '  two // should be <child>aa</child>\n' +
                '</div>', HtmlLikeUnexpected.DefaultWeights.NATIVE_NONNATIVE_MISMATCH
            );

        });

        it('diffs a component with a child that is an deep element and should be a string', () => {

            expect(
                {
                    name: 'div', attribs: { id: 'foo' }, children: [
                    { name: 'span', attribs: { id: 'childfoo'}, children: ['one'] },
                    { name: 'span', attribs: {}, children: [
                        { name: 'span', attribs: { className: 'deep'}, children: ['nested and broken over many lines']}
                    ] }
                ]
                },
                'when diffed against',
                {
                    name: 'div', attribs: { id: 'foo' }, children: [
                    { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] },
                    'some text'
                ]
                },
                'to output with weight',
                '<div id="foo">\n' +
                '  <span id="childfoo">one</span>\n' +
                '  <span>                                                            // \n' +
                '    <span className="deep">nested and broken over many lines</span> //\n' +
                "  </span>                                                           // should be 'some text'\n" +
                '</div>', HtmlLikeUnexpected.DefaultWeights.NATIVE_NONNATIVE_MISMATCH
            );
        });

        it('diffs a component with a child that is a string and should be an element', () => {

            expect(
                {
                    name: 'div', attribs: { id: 'foo' }, children: [
                    { name: 'span', attribs: { id: 'childfoo'}, children: ['one'] },
                    'some text'
                ]
                },
                'when diffed against',
                {
                    name: 'div', attribs: { id: 'foo' }, children: [
                    { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] },
                    { name: 'span', attribs: {}, children: ['two'] }
                ]
                },
                'to output with weight',
                '<div id="foo">\n' +
                '  <span id="childfoo">one</span>\n' +
                '  some text // should be <span>two</span>\n' +
                '</div>', HtmlLikeUnexpected.DefaultWeights.NATIVE_NONNATIVE_MISMATCH
            );
        });

        it('diffs a component with a child that is a string and should be a deep multiline element', () => {

            expect(
                {
                    name: 'div', attribs: { id: 'foo' }, children: [
                    { name: 'span', attribs: { id: 'childfoo'}, children: ['one'] },
                    'some text'
                ]
                },
                'when diffed against',
                {
                    name: 'div', attribs: { id: 'foo' }, children: [
                    { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] },
                    { name: 'span', attribs: {}, children: [
                        { name: 'span', attribs: { className: 'deep'}, children: ['nested and broken over many lines']}
                    ] }
                ]
                },
                'to output with weight',
                '<div id="foo">\n' +
                '  <span id="childfoo">one</span>\n' +
                '  some text // should be <span>\n' +
                '            //             <span className="deep">nested and broken over many lines</span>\n' +
                '            //           </span>\n' +
                '</div>', HtmlLikeUnexpected.DefaultWeights.NATIVE_NONNATIVE_MISMATCH
            );
        });

        describe('with options', () => {

            describe('diffExtraAttributes', () => {

                it('accepts extra attributes when flag is false', () => {

                    expect({
                        name: 'div', attribs: { id: 'foo' }, children: [
                            { name: 'span', attribs: { id: 'childfoo', extraAttribute: 'does not matter'}, children: ['one'] }
                        ]
                    }, 'when diffed with options against', { diffExtraAttributes: false }, {
                        name: 'div', attribs: { id: 'foo' }, children: [
                            { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] }
                        ]
                    }, 'to have weight', HtmlLikeUnexpected.DefaultWeights.OK);

                });

                it('diffs extra attributes when flag is true', () => {

                    expect({
                        name: 'div', attribs: { id: 'foo' }, children: [
                            { name: 'span', attribs: { id: 'childfoo', extraAttribute: 'does matter' }, children: ['one'] }
                        ]
                    }, 'when diffed with options against', { diffExtraAttributes: true }, {
                        name: 'div', attribs: { id: 'foo' }, children: [
                            { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] }
                        ]
                    }, 'to output with weight',
                        '<div id="foo">\n' +
                        '  <span id="childfoo" extraAttribute="does matter" // extraAttribute should be removed\n' +
                        '  >\n' +
                        '    one\n' +
                        '  </span>\n' +
                        '</div>', HtmlLikeUnexpected.DefaultWeights.ATTRIBUTE_EXTRA);

                });
            });

            describe('diffRemovedAttributes', () => {

                it('diffs removed attributes when flag is true', () => {

                    expect({
                        name: 'div', attribs: { id: 'foo' }, children: [
                            { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] }
                        ]
                    }, 'when diffed with options against', { diffRemovedAttributes: true }, {
                        name: 'div', attribs: { id: 'foo' }, children: [
                            { name: 'span', attribs: { id: 'childfoo', removedAttribute: 'does matter'}, children: ['one'] }
                        ]
                    }, 'to output with weight',
                        '<div id="foo">\n' +
                        '  <span id="childfoo" // missing removedAttribute="does matter"\n' +
                        '  >\n' +
                        '    one\n' +
                        '  </span>\n' +
                        '</div>', HtmlLikeUnexpected.DefaultWeights.ATTRIBUTE_MISSING);
                });

                it('ignores removed attributes when flag is false', () => {

                    expect({
                        name: 'div', attribs: { id: 'foo' }, children: [
                            { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] }
                        ]
                    }, 'when diffed with options against', { diffRemovedAttributes: false }, {
                        name: 'div', attribs: { id: 'foo' }, children: [
                            { name: 'span', attribs: { id: 'childfoo', removedAttribute: 'does matter'}, children: ['one'] }
                        ]
                    }, 'to output with weight',
                        '<div id="foo"><span id="childfoo">one</span></div>', HtmlLikeUnexpected.DefaultWeights.OK);
                });
            });

            describe('diffMissingChildren', () => {

                it('diffs missing children when the flag is true', () => {

                    expect(
                        {
                            name: 'div', attribs: { id: 'foo' }, children: [
                            { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] }
                        ]
                        }, 'when diffed with options against', { diffMissingChildren: true },
                        {
                            name: 'div', attribs: { id: 'foo' }, children: [
                            { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] },
                            { name: 'span', attribs: { id: 'removed-child' }, children: ['two'] }
                        ]
                        },
                        'to output with weight',
                        '<div id="foo">\n' +
                        '  <span id="childfoo">one</span>\n' +
                        '  // missing <span id="removed-child">two</span>\n' +
                        '</div>', HtmlLikeUnexpected.DefaultWeights.CHILD_MISSING);
                });

                it('ignores missing children when the flag is false', () => {

                    expect(
                        {
                            name: 'div', attribs: { id: 'foo' }, children: [
                            { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] }
                        ]
                        }, 'when diffed with options against', { diffMissingChildren: false },
                        {
                            name: 'div', attribs: { id: 'foo' }, children: [
                            { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] },
                            { name: 'span', attribs: { id: 'removed-child' }, children: ['two'] }
                        ]
                        },
                        'to output with weight',
                        '<div id="foo"><span id="childfoo">one</span></div>', HtmlLikeUnexpected.DefaultWeights.OK);
                });
            });

            describe('diffExtraChildren', () => {

                it('diffs extra children when the flag is true', () => {

                    expect(
                        {
                            name: 'div', attribs: { id: 'foo' }, children: [
                            { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] },
                            { name: 'span', attribs: { id: 'extra-child' }, children: ['two'] }
                        ]
                        }, 'when diffed with options against', { diffExtraChildren: true },
                        {
                            name: 'div', attribs: { id: 'foo' }, children: [
                            { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] }
                        ]
                        },
                        'to output with weight',
                        '<div id="foo">\n' +
                        '  <span id="childfoo">one</span>\n' +
                        '  <span id="extra-child">two</span> // should be removed\n' +
                        '</div>', HtmlLikeUnexpected.DefaultWeights.CHILD_INSERTED);
                });

                it('ignores extra children when the flag is false', () => {

                    expect(
                        {
                            name: 'div', attribs: { id: 'foo' }, children: [
                            { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] },
                            { name: 'span', attribs: { id: 'extra-child' }, children: ['two'] }
                        ]
                        }, 'when diffed with options against', { diffExtraChildren: false },
                        {
                            name: 'div', attribs: { id: 'foo' }, children: [
                            { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] }
                        ]
                        },
                        'to output with weight',
                        '<div id="foo"><span id="childfoo">one</span><span id="extra-child">two</span></div>', HtmlLikeUnexpected.DefaultWeights.OK);
                });
            });
        });

        describe('wrappers', () => {

            it('identifies an extra wrapper component around a single child', () => {

                    expect(
                        {
                            name: 'body', attribs: { id: 'main' }, children: [
                            {
                                name: 'div', attribs: { id: 'wrapper' }, children: [
                                { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] }
                            ]
                            }
                        ]
                    }, 'when diffed against',
                {
                    name: 'body', attribs: { id: 'main' }, children: [
                    {
                        name: 'span', attribs: { id: 'childfoo' }, children: ['one']
                    }
                    ]
                },
                    'to output with weight',
                    '<body id="main">\n' +
                    '  <div id="wrapper"> // wrapper should be removed\n' +
                    '    <span id="childfoo">one</span>\n' +
                    '  </div> // wrapper should be removed\n' +
                    '</body>', HtmlLikeUnexpected.DefaultWeights.WRAPPER_REMOVED);
            });

            it('identifies an extra wrapper component around a many children', () => {

                expect(
                    {
                        name: 'body', attribs: { id: 'main' }, children: [
                        {
                            name: 'div', attribs: { id: 'wrapper' }, children: [
                            { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] },
                            { name: 'span', attribs: { id: 'childfoo' }, children: ['two'] }
                        ]
                        }
                    ]
                    }, 'when diffed against',
                    {
                        name: 'body', attribs: { id: 'main' }, children: [
                        { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] },
                        { name: 'span', attribs: { id: 'childfoo' }, children: ['two'] }
                    ]
                    },
                    'to output with weight',
                    '<body id="main">\n' +
                    '  <div id="wrapper"> // wrapper should be removed\n' +
                    '    <span id="childfoo">one</span><span id="childfoo">two</span>\n' +
                    '  </div> // wrapper should be removed\n' +
                    '</body>', HtmlLikeUnexpected.DefaultWeights.WRAPPER_REMOVED);
            });

            it('identifies an extra wrapper component around a many children with some minor changes', () => {

                expect(
                    {
                        name: 'body', attribs: { id: 'main' }, children: [
                        {
                            name: 'div', attribs: { id: 'wrapper' }, children: [
                            { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] },
                            { name: 'span', attribs: { id: 'childfoo' }, children: ['two'] }
                        ]
                        }
                    ]
                    }, 'when diffed against',
                    {
                        name: 'body', attribs: { id: 'main' }, children: [
                        { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] },
                        { name: 'span', attribs: { id: 'other' }, children: ['changed'] }
                    ]
                    },
                    'to output with weight',
                    '<body id="main">\n' +
                    '  <div id="wrapper"> // wrapper should be removed\n' +
                    '    <span id="childfoo">one</span>\n' +
                    '    <span id="childfoo" // should be id="other" -childfoo\n' +
                    '                        //                      +other\n' +
                    '    >\n' +
                    '      -two\n' +
                    '      +changed\n' +
                    '    </span>\n' +
                    '  </div> // wrapper should be removed\n' +
                    '</body>',
                    HtmlLikeUnexpected.DefaultWeights.WRAPPER_REMOVED +
                    HtmlLikeUnexpected.DefaultWeights.ATTRIBUTE_MISMATCH +
                    HtmlLikeUnexpected.DefaultWeights.STRING_CONTENT_MISMATCH);
            });

            it('identifies an extra wrapper component around each child', () => {

                expect(
                    {
                        name: 'body', attribs: { id: 'main' }, children: [
                            { name: 'childWrapper', attribs: {}, children: [{ name: 'span', attribs: { id: 'childfoo' }, children: ['one'] }] },
                            { name: 'childWrapper', attribs: {}, children: [{ name: 'span', attribs: { id: 'childfoo' }, children: ['two'] }] }
                    ]
                    }, 'when diffed against',
                    {
                        name: 'body', attribs: { id: 'main' }, children: [
                        { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] },
                        { name: 'span', attribs: { id: 'childfoo' }, children: ['two'] }
                    ]
                    },
                    'to output with weight',
                    '<body id="main">\n' +
                    '  <childWrapper> // wrapper should be removed\n' +
                    '    <span id="childfoo">one</span>\n' +
                    '  </childWrapper> // wrapper should be removed\n' +
                    '  <childWrapper> // wrapper should be removed\n' +
                    '    <span id="childfoo">two</span>\n' +
                    '  </childWrapper> // wrapper should be removed\n' +
                    '</body>', HtmlLikeUnexpected.DefaultWeights.WRAPPER_REMOVED * 2);
            });

            it('identifies an extra wrapper component around each child with attributes', () => {

                expect(
                    {
                        name: 'body', attribs: { id: 'main' }, children: [
                        { name: 'childWrapper', attribs: { id: 'wrapper1' }, children: [{ name: 'span', attribs: { id: 'childfoo' }, children: ['one'] }] },
                        { name: 'childWrapper', attribs: { id: 'wrapper2' }, children: [{ name: 'span', attribs: { id: 'childfoo' }, children: ['two'] }] }
                    ]
                    }, 'when diffed against',
                    {
                        name: 'body', attribs: { id: 'main' }, children: [
                        { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] },
                        { name: 'span', attribs: { id: 'childfoo' }, children: ['two'] }
                    ]
                    },
                    'to output with weight',
                    '<body id="main">\n' +
                    '  <childWrapper id="wrapper1"> // wrapper should be removed\n' +
                    '    <span id="childfoo">one</span>\n' +
                    '  </childWrapper> // wrapper should be removed\n' +
                    '  <childWrapper id="wrapper2"> // wrapper should be removed\n' +
                    '    <span id="childfoo">two</span>\n' +
                    '  </childWrapper> // wrapper should be removed\n' +
                    '</body>', HtmlLikeUnexpected.DefaultWeights.WRAPPER_REMOVED * 2);
            });

            it('ignores wrappers when using the diffWrappers=false flag', () => {

                expect(
                    {
                        name: 'body', attribs: { id: 'main' }, children: [
                        { name: 'childWrapper', attribs: {}, children: [{ name: 'span', attribs: { id: 'childfoo' }, children: ['one'] }] },
                        { name: 'childWrapper', attribs: {}, children: [{ name: 'span', attribs: { id: 'childfoo' }, children: ['two'] }] }
                    ]
                    }, 'when diffed with options against', { diffWrappers: false },
                    {
                        name: 'body', attribs: { id: 'main' }, children: [
                        { name: 'span', attribs: { id: 'childfoo' }, children: ['one'] },
                        { name: 'span', attribs: { id: 'childfoo' }, children: ['two'] }
                    ]
                    },
                    'to output with weight',
                    '<body id="main">\n' +
                    '  <childWrapper>\n' +
                    '    <span id="childfoo">one</span>\n' +
                    '  </childWrapper>\n' +
                    '  <childWrapper>\n' +
                    '    <span id="childfoo">two</span>\n' +
                    '  </childWrapper>\n' +
                    '</body>', HtmlLikeUnexpected.DefaultWeights.OK);
            });

            // TODO: Skip 2 wrapper    MainComp -> wrapper1 -> wrapper2 -> expectedComp
            // Skip wrapper on main element    MainCompWrapper -> expected

            it('diffs a top level wrapper', () => {

                expect(
                    {
                        name: 'HigherOrderTopLevel', attribs: { id: 'main' }, children: [
                        {
                            name: 'TopLevel', attribs: {}, children: [
                            {name: 'span', attribs: {id: 'childfoo'}, children: ['one']},
                            {name: 'span', attribs: {id: 'childfoo'}, children: ['two']}
                        ]
                        }
                    ]
                    }, 'when diffed against',
                    {
                            name: 'TopLevel', attribs: {}, children: [
                            {name: 'span', attribs: {id: 'childfoo'}, children: ['one']},
                            {name: 'span', attribs: {id: 'childfoo'}, children: ['two']}
                    ]
                    }, 'to output with weight',
                    '<HigherOrderTopLevel id="main"> // wrapper should be removed\n' +
                    '  <TopLevel><span id="childfoo">one</span><span id="childfoo">two</span></TopLevel>\n' +
                    '</HigherOrderTopLevel> // wrapper should be removed', HtmlLikeUnexpected.DefaultWeights.WRAPPER_REMOVED);
            });

            it('diffs a two levels of top level wrapper', () => {

                expect(
                    {
                        name: 'HigherOrderTopLevel', attribs: { id: 'main' }, children: [
                        {
                            name: 'TopLevel', attribs: {}, children: [
                            { name: 'MidLevel', attribs: {}, children: [
                                {name: 'span', attribs: {id: 'childfoo'}, children: ['one']},
                                {name: 'span', attribs: {id: 'childfoo'}, children: ['two']}
                            ]}
                        ]
                        }
                    ]
                    }, 'when diffed against',
                    {
                        name: 'MidLevel', attribs: {}, children: [
                        {name: 'span', attribs: {id: 'childfoo'}, children: ['one']},
                        {name: 'span', attribs: {id: 'childfoo'}, children: ['two']}
                    ]
                    }, 'to output with weight',
                    '<HigherOrderTopLevel id="main"> // wrapper should be removed\n' +
                    '  <TopLevel> // wrapper should be removed\n' +
                    '    <MidLevel><span id="childfoo">one</span><span id="childfoo">two</span></MidLevel>\n' +
                    '  </TopLevel> // wrapper should be removed\n' +
                    '</HigherOrderTopLevel> // wrapper should be removed', HtmlLikeUnexpected.DefaultWeights.WRAPPER_REMOVED * 2);
            });

            it('ignores two levels of top level wrapper when diffWrappers is false', () => {

                expect(
                    {
                        name: 'HigherOrderTopLevel', attribs: { id: 'main' }, children: [
                        {
                            name: 'TopLevel', attribs: {}, children: [
                            { name: 'MidLevel', attribs: {}, children: [
                                {name: 'span', attribs: {id: 'childfoo'}, children: ['one']},
                                {name: 'span', attribs: {id: 'childfoo'}, children: ['two']}
                            ]}
                        ]
                        }
                    ]
                    }, 'when diffed with options against', { diffWrappers: false },
                    {
                        name: 'MidLevel', attribs: {}, children: [
                        {name: 'span', attribs: { id: 'childfoo' }, children: ['one']},
                        {name: 'span', attribs: { id: 'childfoo' }, children: ['two']}
                    ]
                    }, 'to output with weight',
                    '<HigherOrderTopLevel id="main">\n' +
                    '  <TopLevel>\n' +
                    '    <MidLevel><span id="childfoo">one</span><span id="childfoo">two</span></MidLevel>\n' +
                    '  </TopLevel>\n' +
                    '</HigherOrderTopLevel>', HtmlLikeUnexpected.DefaultWeights.OK);
            });

            it('ignores mixed wrapper->real->wrapper when diffWrappers is false', () => {

                expect(
                    {
                        name: 'HigherOrderTopLevel', attribs: { id: 'main' }, children: [
                        {
                            name: 'TopLevel', attribs: { id: 'main' }, children: [
                            { name: 'MidLevel', attribs: {}, children: [
                                {name: 'span', attribs: {id: 'childfoo'}, children: ['one']},
                                {name: 'span', attribs: {id: 'childfoo'}, children: ['two']}
                            ]}
                        ]
                        }
                    ]
                    }, 'when diffed with options against', { diffWrappers: false },
                    {
                        name: 'TopLevel', attribs: { id: 'main' }, children: [
                        {name: 'span', attribs: { id: 'childfoo' }, children: ['one']},
                        {name: 'span', attribs: { id: 'childfoo' }, children: ['changed']}
                    ]
                    }, 'to output with weight',
                    '<HigherOrderTopLevel id="main">\n' +
                    '  <TopLevel id="main">\n' +
                    '    <MidLevel>\n' +
                    '      <span id="childfoo">one</span>\n' +
                    '      <span id="childfoo">\n' +
                    '        -two\n' +
                    '        +changed\n' +
                    '      </span>\n' +
                    '    </MidLevel>\n' +
                    '  </TopLevel>\n' +
                    '</HigherOrderTopLevel>', HtmlLikeUnexpected.DefaultWeights.STRING_CONTENT_MISMATCH);
            });

            it('ignores two mid level wrappers when diffWrappers is false', () => {

                expect(
                    {
                        name: 'HigherOrderTopLevel', attribs: {id: 'main'}, children: [
                        {
                                name: 'MidLevel', attribs: {}, children: [
                                {
                                    name: 'LowLevel', attribs: {id: 'lower'}, children: [
                                    {name: 'span', attribs: {id: 'childfoo'}, children: ['one']},
                                    {name: 'span', attribs: {id: 'childfoo'}, children: ['two']}
                                ]
                                }
                        ]
                        }
                    ]
                    }, 'when diffed with options against', { diffWrappers: false },
                    { name: 'HigherOrderTopLevel', attribs: { id: 'main' }, children: [
                                {name: 'span', attribs: {id: 'childfoo'}, children: ['one']},
                                {name: 'span', attribs: {id: 'childfoo'}, children: ['two']}
                    ]
                    }, 'to output with weight',
                    '<HigherOrderTopLevel id="main">\n' +
                    '  <MidLevel>\n' +
                    '    <LowLevel id="lower">\n' +
                    '      <span id="childfoo">one</span><span id="childfoo">two</span>\n' +
                    '    </LowLevel>\n' +
                    '  </MidLevel>\n' +
                    '</HigherOrderTopLevel>', HtmlLikeUnexpected.DefaultWeights.OK);
            });

        });
    });
});