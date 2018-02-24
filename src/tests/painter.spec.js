
import Unexpected from 'unexpected';
import MagicPenPrism from 'magicpen-prism';
import UnexpectedMagicPen from 'unexpected-magicpen';

import Painter from '../painter';

import { shortFunc, longFunc, longFunc2, longSingleLine, shortMultiLine } from './no-instrument/functions';

const expect = Unexpected
    .clone()
    .use(UnexpectedMagicPen)
    .use(MagicPenPrism);

expect.output.preferredWidth = 80;

function duplicate(object, count) {
    const result = [];
    for(let i = count - 1; i >= 0; --i) {
        result.push(object);
    }
    return result;
}

expect.addAssertion('<object> to output <string>', function (expect, subject, result) {

    const pen = expect.output.clone();
    pen.addStyle('appendInspected', function (arg) {
        this.append(expect.inspect(arg));
    }, true);
    Painter(pen, subject, expect.diff.bind(expect), expect.inspect.bind(expect));
    expect(pen.toString(), 'to equal', result);
});

describe('Painter', () => {

    let pen;

    beforeEach(() => {
        pen = expect.output.clone('text');
        pen.addStyle('appendInspected', function (arg) {
            this.append(expect.inspect(arg));
        }, true);
    });

    it('outputs a single empty element', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div'
        };

        expect(description, 'to output',
        '<div />');
    });

    it('outputs a single empty element with string attributes', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            attributes: [
                { name: 'id', value: 'abc' },
                { name: 'className', value: 'foo' }
            ]
        };

        expect(description, 'to output',
            '<div id="abc" className="foo" />');
    });
    
    it('skips outputting attributes that are undefined', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            attributes: [
                { name: 'id', value: undefined },
                { name: 'className', value: 'foo' }
            ]
        };

        expect(description, 'to output',
            '<div className="foo" />');
    });

    it('outputs a single empty element with object attributes', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            attributes: [
                { name: 'id', value: 'abc' },
                { name: 'style', value: { width: 100, height: 200 } }
            ]
        };

        expect(description, 'to output',
            '<div id="abc" style={{ width: 100, height: 200 }} />');
    });

    it('outputs many attributes over separate lines', () => {
        const description = {
            type: 'ELEMENT',
            name: 'div',
            attributes: [
                { name: 'id', value: 'abc' },
                { name: 'className', value: 'foo bah gah blah cheese' },
                { name: 'another', value: 'big long attribute value' },
                { name: 'style', value: { width: 100, height: 200 } },
                { name: 'role', value: 'button-with-a-long-name' }
            ]
        };

        expect(description, 'to output',
            '<div id="abc" className="foo bah gah blah cheese" another="big long attribute value"\n' +
            '   style={{ width: 100, height: 200 }} role="button-with-a-long-name"\n' +
            '/>');
    });
    
    it('outputs a long function attribute without a body', () => {
        const description = {
            type: 'ELEMENT',
            name: 'MyComponent',
            attributes: [
                { name: 'onClick', value: function handleClick(a, b) {
                   console.log(a + b, 'This is a long function');
                    console.log('with many lines');
                } }
            ]

        };
        
        expect(description, 'to output',
            '<MyComponent onClick={function handleClick(a, b) { /* ... */ }} />');
        
    });


    it('outputs a short one line function attribute with a body', () => {

        const description = {
            type: 'ELEMENT',
            name: 'MyComponent',
            attributes: [
                { name: 'onClick', value: shortFunc }
            ]
        };

        expect(description, 'to output',
            '<MyComponent onClick={function shortFunc(a, b) { return a + b; }} />');

    });

    it('outputs a short multi line function attribute without a body', () => {

        const description = {
            type: 'ELEMENT',
            name: 'MyComponent',
            attributes: [
                { name: 'onClick', value: shortMultiLine }
            ]
        }

        expect(description, 'to output',
            '<MyComponent onClick={function shortMultiLine(a, b) { /* ... */ }} />');

    });

    it('outputs a long single line function attribute without a body', () => {

        const description = {
            type: 'ELEMENT',
            name: 'MyComponent',
            attributes: [
                { name: 'onClick', value: longSingleLine }
            ]
        };
        expect(description, 'to output',
            '<MyComponent onClick={function longSingleLine(a, b) { /* ... */ }} />');

    });

    it('outputs an expect.it assertion as an assertion and not a function', () => {

        const description = {
            type: 'ELEMENT',
            name: 'MyComponent',
            attributes: [
                { name: 'onClick', value: expect.it('to be a function') }
            ]
        };

        expect(description, 'to output',
            '<MyComponent onClick={expect.it(\'to be a function\')} />');
    });

    it('outputs a difference long function attribute with a body', () => {

        const description = {
            type: 'ELEMENT',
            name: 'MyComponent',
            attributes: [
                { name: 'onClick', value: longFunc, diff: { type: 'changed', expectedValue: longFunc2 } }
            ]
        };

        expect(description, 'to output',
            '<MyComponent\n' +
            '   onClick={function longFunc(a, b) { /* ... */ }} // should be onClick={function longFunc2(a, b) { /* ... */ }}\n' +
            '                                                   // function longFunc2(a, b) {\n' +
            '                                                   //   console.log(\'This ia long func\', a + b);\n' +
            '                                                   //   console.log(\'With multiple lines that are different\');\n' +
            '                                                   // }\n' +
            '/>');

    });

    it('outputs a function with a custom toString() directly', () => {

        const testFunc = function testFunc() {
            console.log('hello world');
        };

        testFunc.toString = function () {
            return 'spy';
        };

        const description = {
            type: 'ELEMENT',
            name: 'MyComponent',
            attributes: [
                { name: 'onClick', value: testFunc }
            ]
        };

        expect(description, 'to output',
            '<MyComponent onClick={function spy} />');


    });

    it('outputs a changed attribute', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            attributes: [
                { name: 'id', value: 'abc', diff: { type: 'changed', expectedValue: '123' } }
            ]
        };

        expect(description, 'to output',
            '<div id="abc" // should be id="123"\n' +
            '              // -abc\n' +
            '              // +123\n' +
            '/>');
    });

    it('outputs a different attribute type', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            attributes: [
                { name: 'id', value: '123', diff: { type: 'changed', expectedValue: 123 } }
            ]
        };

        expect(description, 'to output',
            '<div id="123" // should be id={123}\n' +
            '/>');
    });

    it('outputs a different attribute type and value', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            attributes: [
                { name: 'id', value: '123', diff: { type: 'changed', expectedValue: 1234 } }
            ]
        };

        expect(description, 'to output',
            '<div id="123" // should be id={1234}\n' +
            '/>');
    });


    it('outputs a different boolean attribute', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            attributes: [
                { name: 'disabled', value: true, diff: { type: 'changed', expectedValue: false } }
            ]
        }

        expect(description, 'to output',
            '<div disabled={true} // should be disabled={false}\n' +
            '/>');
    });


    it('outputs a changed attribute with an object diff', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            attributes: [
                { name: 'id', value: { abc: 123, def: 'ghi' }, diff: { type: 'changed', expectedValue: { abc: 123, def: 'ghij' } } }
            ]
        };

        expect(description, 'to output',
            "<div id={{ abc: 123, def: 'ghi' }} // should be id={{ abc: 123, def: 'ghij' }}\n" +
            '                                   // {\n' +
            '                                   //   abc: 123,\n' +
            "                                   //   def: 'ghi' // should equal 'ghij'\n" +
            '                                   //              //\n' +
            '                                   //              // -ghi\n' +
            '                                   //              // +ghij\n' +
            '                                   // }\n' +
            '/>');
    });

    it('outputs a changed attribute with an object assertion failure', () => {

        var error;
        try {
            expect({ abc: 123, def: 'ghi' }, 'to satisfy', { abc: 245 });
        } catch (e) {
            error = e;
        }
        const description = {
            type: 'ELEMENT',
            name: 'div',
            attributes: [
                { name: 'id', value: { abc: 123, def: 'ghi' }, diff: { type: 'changed', error: error, expectedValue: { abc: 123, def: 'ghij' } } }
            ]
        };

        expect(description, 'to output',
            "<div\n" +
            "   id={{ abc: 123, def: 'ghi' }} // expected { abc: 123, def: 'ghi' } to satisfy { abc: 245 }\n" +
            '                                 //\n' +
            '                                 // {\n' +
            '                                 //   abc: 123, // should equal 245\n' +
            "                                 //   def: 'ghi'\n" +
            '                                 // }\n' +
            '/>');
    });

    it('outputs a missing attribute', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            attributes: [
                { name: 'id', diff: { type: 'missing', expectedValue: '123' } }
            ]
        };

        expect(description, 'to output',
            '<div // missing id="123"\n' +
            '/>');

    });

    it('outputs an extra attribte', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            attributes: [
                { name: 'id', value:'abc', diff: { type: 'extra' } }
            ]
        };

        expect(description, 'to output',
            '<div id="abc" // id should be removed\n' +
            '/>');
    });

    it('outputs an inspected object attribute over multiple lines', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            attributes: [
                {
                    name: 'id',
                    diff: {
                        type: 'missing',
                        expectedValue: {
                            test: 'one two three four five',
                            foo: 'bar lah cheese',
                            testing: 'is fun with long text',
                            id: 42
                        }
                    }
                }
            ]
        }

        expect(description, 'to output',
            '<div // missing id={{\n' +
            "     //   test: 'one two three four five',\n" +
            "     //   foo: 'bar lah cheese',\n" +
            "     //   testing: 'is fun with long text',\n" +
            '     //   id: 42\n' +
            '     // }}\n' +
            '/>');
    });

    it('outputs a custom error when an attribute fails the `to satisfy`', () => {

        let error;
        const actual ={ a: 'hello', b: 'foo', c: false } ;
        const expected = { b: 'bar', c: true };
        try {
            expect(actual, 'to satisfy', expected)
        } catch (e) {
            error = e;
        }

        const description = {
            type: 'ELEMENT',
            name: 'div',
            attributes: [
                {
                    name: 'data',
                    value: actual,
                    diff: {
                        type: 'changed',
                        expectedValue: expected,
                        error: error
                    }
                }
            ]
        };
        Painter(pen, description, expect.diff, expect.inspect);
        expect(pen.toString(), 'to equal', '<div\n' +
        "   data={{ a: 'hello', b: 'foo', c: false }} // expected { a: 'hello', b: 'foo', c: false } to satisfy { b: 'bar', c: true }\n" +
        '                                             //\n' +
        '                                             // {\n' +
        "                                             //   a: 'hello',\n" +
        "                                             //   b: 'foo', // should equal 'bar'\n" +
        '                                             //             //\n' +
        '                                             //             // -foo\n' +
        '                                             //             // +bar\n' +
        '                                             //   c: false // should equal true\n' +
        '                                             // }\n' +
        '/>')

    });

    it('outputs many attributes over multiple lines', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            attributes: [
                { name: 'id', value: 'very-long-attribute-value' },
                { name: 'data-value1', value: 'very-long-attribute-value' },
                { name: 'data-value2', value: 'very-long-attribute-value' }
            ],
            children: [ {
                type: 'CONTENT',
                value: 'one'
            }]
        };

        expect(description, 'to output',
            '<div id="very-long-attribute-value" data-value1="very-long-attribute-value"\n' +
                '   data-value2="very-long-attribute-value">\n' +
            '  one\n' +
            '</div>');
    });

    it('forces the children onto multiple lines when attributes are on multiple lines', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            attributes: [
                {
                    name: 'id',
                    diff: {
                        type: 'missing',
                        expectedValue: {
                            test: 'one two three four five',
                            foo: 'bar lah cheese',
                            testing: 'is fun with long text',
                            id: 42
                        }
                    }
                }
            ],
            children: [ { type: 'CONTENT', value: 'some text' }]
        };

        expect(description, 'to output',
            '<div // missing id={{\n' +
            "     //   test: 'one two three four five',\n" +
            "     //   foo: 'bar lah cheese',\n" +
            "     //   testing: 'is fun with long text',\n" +
            '     //   id: 42\n' +
            '     // }}\n' +
            '>\n' +
            '  some text\n' +
            '</div>');
    });

    it('outputs a single child element', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            children: [
                { type: 'ELEMENT',
                  name: 'span'
                }
            ]
        };

        expect(description, 'to output',
            '<div><span /></div>');

    });


    it('outputs many children split onto separate lines', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            children: duplicate(
                { type: 'ELEMENT',
                  name: 'span'
                }, 12)
        };

        expect(description, 'to output',
            '<div>\n' +
            '  <span />\n' +
            '  <span />\n' +
            '  <span />\n' +
            '  <span />\n' +
            '  <span />\n' +
            '  <span />\n' +
            '  <span />\n' +
            '  <span />\n' +
            '  <span />\n' +
            '  <span />\n' +
            '  <span />\n' +
            '  <span />\n' +
            '</div>');
    });

    it('outputs children with changes on separate lines', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            children: [
                {
                    type: 'ELEMENT',
                    name: 'span',
                    attributes: [
                        { name: 'id', value: 'abc', diff: { type: 'changed', expectedValue: 'abcd' } }
                    ]
                }
            ]
        };

        expect(description, 'to output',
        '<div>\n' +
        '  <span id="abc" // should be id="abcd"\n' +
        '                 // -abc\n' +
        '                 // +abcd\n' +
        '  />\n' +
        '</div>');
    });

    it('outputs children with single line changes on separate lines', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            children: [
                {
                    type: 'ELEMENT',
                    name: 'span',
                    attributes: [
                        { name: 'id', diff: { type: 'missing', expectedValue: 'abcd' } }
                    ]
                }
            ]
        };

        expect(description, 'to output',
            '<div>\n' +
            '  <span // missing id="abcd"\n' +
            '  />\n' +
            '</div>');
    });

    it('outputs text content', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            children: [
                {
                    type: 'CONTENT',
                    value: 'abc'
                }
            ]
        };

        expect(description, 'to output',
            '<div>abc</div>');

    });

    it('outputs numeric content', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            children: [
                {
                    type: 'CONTENT',
                    value: 42
                }
            ]
        };

        expect(description, 'to output',
            '<div>42</div>');

    });

    it('outputs children with text content on separate lines', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            children: duplicate({
                type: 'ELEMENT',
                name: 'span',
                attributes: [{ name: 'className', value: 'foo' }],
                children: [{ type: 'CONTENT', value: 'text content' }]
            }, 3)
        };

        expect(description, 'to output',
            '<div>\n' +
            '  <span className="foo">text content</span>\n' +
            '  <span className="foo">text content</span>\n' +
            '  <span className="foo">text content</span>\n' +
            '</div>');

    });

    it('outputs deep nested children', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            children: duplicate({
                type: 'ELEMENT',
                name: 'span',
                attributes: [{ name: 'className', value: 'foo' }],
                children: [
                    { type: 'ELEMENT', name: 'strong', children: [ { type: 'CONTENT', value: 'text content' }] }
                ]
            }, 3)
        }

        expect(description, 'to output',
            '<div>\n' +
            '  <span className="foo"><strong>text content</strong></span>\n' +
            '  <span className="foo"><strong>text content</strong></span>\n' +
            '  <span className="foo"><strong>text content</strong></span>\n' +
            '</div>');
    });

    it('outputs a changed text content', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            children: [
                {
                    type: 'CONTENT',
                    value: 'abc',
                    diff: {
                        type: 'changed',
                        expectedValue: 'abcd'
                    }
                }
            ]
        };

        expect(description, 'to output',
            '<div>\n' +
            '  abc // -abc\n' +
            '      // +abcd\n' +
            '</div>');

    });
    
    it('outputs a changed numerical content', () => {
        
        const description = {
            type: 'ELEMENT',
            name: 'div',
            children: [
                {
                    type: 'CONTENT',
                    value: 42,
                    diff: {
                        type: 'changed',
                        expectedValue: 84
                    }
                }
            ]
        };
        
        expect(description, 'to output',
          '<div>\n' +
          '  42 // should be 84\n' +
          '</div>');
        
    });
    
    it('outputs a multiline changed text content', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            children: [
                {
                    type: 'CONTENT',
                    value: 'abc\ndef\nghi',
                    diff: {
                        type: 'changed',
                        expectedValue: 'abcd\nefgh\nghi'
                    }
                }
            ]
        };

        expect(description, 'to output',
            '<div>\n' +
            '  abc // -abc\n' +
            '  def // -def\n' +
            '  ghi // +abcd\n' +
            '      // +efgh\n' +
            '      //  ghi\n' +
            '</div>');

    });

    it('outputs a changed type content', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            children: [
                {
                    type: 'CONTENT',
                    value: '123',
                    diff: {
                        type: 'changed',
                        expectedValue: 123
                    }
                }
            ]
        };

        expect(description, 'to output',
            '<div>\n' +
            '  123 // mismatched type -string\n' +
            '      //                 +number\n' +
            '</div>');

    });

    it('outputs a changed type and value content', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            children: [
                {
                    type: 'CONTENT',
                    value: '1234',
                    diff: {
                        type: 'changed',
                        expectedValue: 123
                    }
                }
            ]
        };

        expect(description, 'to output',
            '<div>\n' +
            '  -1234 // and mismatched type -string\n' +
            '  +123  //                     +number\n' +
            '</div>');

    });

    it('outputs a missing child', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            children: [
                {
                    type: 'ELEMENT',
                    name: 'span',
                    attributes: [ { name: 'className', value: 'foo' } ],
                    diff: {
                        type: 'missing'
                    }
                }
            ]
        };

        expect(description, 'to output',
        '<div>\n' +
        '  // missing <span className="foo" />\n' +
        '</div>');
    });

    it('outputs a missing child in the middle of list of children', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            children: [
                {
                    type: 'ELEMENT',
                    name: 'span',
                    attributes: [ { name: 'className', value: 'foo' } ]
                },
                {
                    type: 'ELEMENT',
                    name: 'span',
                    attributes: [ { name: 'className', value: 'foo' } ],
                    diff: {
                        type: 'missing'
                    }
                },
                {
                    type: 'ELEMENT',
                    name: 'span',
                    attributes: [ { name: 'className', value: 'foo' } ]
                }
            ]
        };

        expect(description, 'to output',
            '<div>\n' +
            '  <span className="foo" />\n' +
            '  // missing <span className="foo" />\n' +
            '  <span className="foo" />\n' +
            '</div>');
    });

    it('outputs an extra element', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            children: [
                {
                    type: 'ELEMENT',
                    name: 'span',
                    attributes: [ { name: 'className', value: 'foo' } ],
                    diff: {
                        type: 'extra'
                    }
                }
            ]
        };

        expect(description, 'to output',
            '<div>\n' +
            '  <span className="foo" /> // should be removed\n' +
            '</div>');
    });

    it('outputs an extra element over multiple lines', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            children: [
                {
                    type: 'ELEMENT',
                    name: 'span',
                    attributes: [
                        { name: 'className', value: 'foo' },
                        { name: 'data-className1', value: 'foo' },
                        { name: 'data-className2', value: 'foo' },
                        { name: 'data-className3', value: 'foo' },
                        { name: 'data-className4', value: 'foo' }
                    ],
                    diff: {
                        type: 'extra'
                    }
                }
            ]
        };

        expect(description, 'to output',
            '<div>\n' +
            '  <span className="foo" data-className1="foo" data-className2="foo" // should be removed\n' +
            '     data-className3="foo" data-className4="foo"                    //\n' +
            '  />                                                                //\n' +
            '</div>');
    });

    it('outputs an extra element in the middle of the children', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            children: [
                {
                    type: 'ELEMENT',
                    name: 'span',
                    attributes: [ { name: 'className', value: 'foo' } ]
                },
                {
                    type: 'ELEMENT',
                    name: 'span',
                    attributes: [ { name: 'className', value: 'foo' } ],
                    diff: {
                        type: 'extra'
                    }
                },
                {
                    type: 'ELEMENT',
                    name: 'span',
                    attributes: [ { name: 'className', value: 'foo' } ]
                }
            ]
        };

        expect(description, 'to output',
            '<div>\n' +
            '  <span className="foo" />\n' +
            '  <span className="foo" /> // should be removed\n' +
            '  <span className="foo" />\n' +
            '</div>');
    });

    it('outputs a removed text element', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            children: [
                {
                    type: 'CONTENT',
                    value: 'some text',
                    diff: {
                        type: 'extra'
                    }
                }
            ]
        };

        expect(description, 'to output',
            '<div>\n' +
            '  some text // should be removed\n' +
            '</div>');
    });

    it('outputs a removed text element over multiple lines', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            children: [
                {
                    type: 'CONTENT',
                    value: 'some text\nsome more text',
                    diff: {
                        type: 'extra'
                    }
                }
            ]
        };

        expect(description, 'to output',
            '<div>\n' +
            '  some text      // should be removed\n' +
            '  some more text //\n' +
            '</div>');
    });

    it('outputs a missing text element', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            children: [
                {
                    type: 'CONTENT',
                    value: 'some text',
                    diff: {
                        type: 'missing'
                    }
                }
            ]
        };

        expect(description, 'to output',
            '<div>\n' +
            '  // missing some text\n' +
            '</div>');
    });

    it('outputs a missing text element over multiple lines', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            children: [
                {
                    type: 'CONTENT',
                    value: 'some text\nsome more text',
                    diff: {
                        type: 'missing'
                    }
                }
            ]
        };

        expect(description, 'to output',
            '<div>\n' +
            '  // missing some text\n' +
            '  //         some more text\n' +
            '</div>');
    });


    it('outputs an extra wrapper', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            diff: {
                type: 'wrapper'
            },
            children: [
                {
                    type: 'ELEMENT',
                    name: 'span',
                    children: [ { type: 'CONTENT', value: 'some text' } ]
                }
            ]
        }

        expect(description, 'to output',
            '<div> // wrapper should be removed\n' +
            '  <span>some text</span>\n' +
            '</div> // wrapper should be removed');
    });

    it('outputs two levels of extra wrappers', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            diff: {
                type: 'wrapper'
            },
            children: [
                {
                    type: 'ELEMENT',
                    name: 'span',
                    diff: {
                        type: 'wrapper'
                    },
                    children: [{
                        type: 'ELEMENT', name: 'span', children: [{ type: 'CONTENT', value: 'some text' }]
                    } ]
                }
            ]
        };

        expect(description, 'to output',
            '<div> // wrapper should be removed\n' +
            '  <span> // wrapper should be removed\n' +
            '    <span>some text</span>\n' +
            '  </span> // wrapper should be removed\n' +
            '</div> // wrapper should be removed');
    });

    it('outputs a wrapper on separate line when the wrapper is not a diff', () => {

        const description = {
            type: 'WRAPPERELEMENT',
            name: 'div',
            attributes: [{ name: 'className', value: 'foo' }],
            children: [
                {
                    type: 'ELEMENT',
                    name: 'span',
                    children: [ { type: 'CONTENT', value: 'some text' } ]
                }
            ]
        };

        expect(description, 'to output',
            '<div className="foo">\n' +
            '  <span>some text</span>\n' +
            '</div>');
    });

    it('outputs a wrapper greyed out when the wrapper is not a diff', () => {

        const description = {
            type: 'WRAPPERELEMENT',
            name: 'div',
            attributes: [{ name: 'className', value: 'foo' }],
            children: [
                {
                    type: 'ELEMENT',
                    name: 'span',
                    children: [ { type: 'CONTENT', value: 'some text' } ]
                }
            ]
        };
        Painter(pen, description, expect.diff, expect.inspect);

        expect(pen, 'to equal',
            expect.output.clone('text').gray('<div className="foo">')
                    .nl().indentLines().i()
                    .block(function () {
                        this.prismPunctuation('<')
                            .prismTag('span')
                            .prismPunctuation('>')
                            .block('some text')
                            .prismPunctuation('</')
                            .prismTag('span')
                            .prismPunctuation('>');
                    })
            .nl().gray('</div>')
        );
    });

    it('outputs a different named element without attributes or children', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            diff: {
                type: 'differentElement',
                expectedName: 'span'
            }
        };

        expect(description, 'to output',
            '<div // should be <span\n' +
            '/>');
    });

    it('outputs a different named element without attributes', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            diff: {
                type: 'differentElement',
                expectedName: 'span'
            },
            children: [
                {
                    type: 'ELEMENT',
                    name: 'span',
                    children: [{
                        type: 'CONTENT', value: 'some text'
                    } ]
                }
            ]
        };

        expect(description, 'to output',
            '<div // should be <span\n' +
            '>\n' +
            '  <span>some text</span>\n' +
            '</div>');

    });

    it('outputs a different named element with attributes', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            attributes: [
                { name: 'className', value: 'foo' },
                { name: 'id', value: 'abc123' }
            ],
            diff: {
                type: 'differentElement',
                expectedName: 'span'
            },
            children: [
                {
                    type: 'ELEMENT',
                    name: 'span',
                    children: [{
                        type: 'CONTENT', value: 'some text'
                    } ]
                }
            ]
        };

        expect(description, 'to output',
            '<div // should be <span\n' +
            '   className="foo" id="abc123">\n' +
            '  <span>some text</span>\n' +
            '</div>');
    });

    it('outputs a different named element with children but without attributes', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            attributes: [],
            diff: {
                type: 'differentElement',
                expectedName: 'span'
            },
            children: [
                { type: 'CONTENT', value: 'some text' }
            ]
        };

        expect(description, 'to output',
            '<div // should be <span\n' +
            '>\n' +
            '  some text\n' +
            '</div>');
    });

    it('outputs a different named element with attributes in the middle of children', () => {

        const description = {
            type: 'ELEMENT',
            name: 'body',
            children: [
                { type: 'ELEMENT', name: 'span', children: [ { type: 'CONTENT', value: 'some text' } ] },
                {
                    type: 'ELEMENT',
                    name: 'div',
                    attributes: [
                        { name: 'className', value: 'foo' },
                        { name: 'id', value: 'abc123' }
                    ],
                    diff: {
                        type: 'differentElement',
                        expectedName: 'span'
                    },
                    children: [
                        {
                            type: 'ELEMENT',
                            name: 'span',
                            children: [{
                                type: 'CONTENT', value: 'some text'
                            } ]
                        }
                    ]
                },
                { type: 'ELEMENT', name: 'span', children: [ { type: 'CONTENT', value: 'some text' } ] }
            ]
        };

        expect(description, 'to output',
            '<body>\n' +
            '  <span>some text</span>\n' +
            '  <div // should be <span\n' +
            '     className="foo" id="abc123">\n' +
            '    <span>some text</span>\n' +
            '  </div>\n' +
            '  <span>some text</span>\n' +
            '</body>');
    });

    it('outputs a single line contentElementMismatch diff', () => {
        const description = {
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
        };

        expect(description, 'to output',
        'some content // should be <div className="foo">some text</div>');

    });

    it('outputs a multi-line contentElementMismatch diff', () => {
        const description = {
            type: 'CONTENT',
            value: 'some content',
            diff: {
                type: 'contentElementMismatch',
                expected: {
                    type: 'ELEMENT',
                    name: 'div',
                    attributes: [{ name: 'className', value: 'foo' }],
                    children: [
                        { type: 'ELEMENT', name: 'some-long-element-name', children: [
                            { type: 'ELEMENT', name: 'child-element', children: [
                                { type: 'CONTENT', value: 'some text' }
                            ] }
                        ] }
                    ]
                }
            }
        };

        expect(description, 'to output',
            'some content // should be <div className="foo">\n' +
            '             //             <some-long-element-name><child-element>some text</child-element></some-long-element-name>\n' +
            '             //           </div>');

    });

    it('forces a linebreak before a contentElementMismatch', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            attributes: [],
            children: [
                {
                    type: 'CONTENT',
                    value: 'two',
                    diff: {
                        type: 'contentElementMismatch',
                        expected: {
                            type: 'ELEMENT',
                            name: 'child',
                            attributes: [],
                            children: [
                                {
                                    type: 'CONTENT',
                                    value: 'aa'
                                }
                            ]
                        }
                    }
                }
            ]
        };

        expect(description, 'to output',
        '<div>\n' +
        '  two // should be <child>aa</child>\n' +
        '</div>');
    });

    it('outputs a single line elementContentMismatch diff', () => {

        const description = {
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
        };

        expect(description, 'to output',
            '<div className="foo">some text</div> // should be \'some content\'');
    });

    it('outputs a multi-line elementContentMismatch diff', () => {

        const description = {
            type: 'ELEMENT',
            name: 'div',
            attributes: [
                { name: 'className', value: 'foo' }
            ],
            children: [
                {
                    type: 'ELEMENT',
                    name: 'some-long-element-name',
                    attributes: [{ name: 'className', value: 'very long list of classes' }],
                    children: [
                        { type: 'ELEMENT', name: 'child-element', children: [{ type: 'CONTENT', value: 'some content' }] }
                    ]
                }
            ],
            diff: {
                type: 'elementContentMismatch',
                expected: {
                    type: 'CONTENT',
                    value: 'some content'
                }
            }
        };

        expect(description, 'to output',
            '<div className="foo">                                            // should be \'some content\'\n' +
            '  <some-long-element-name className="very long list of classes"> //\n' +
            '    <child-element>some content</child-element>                  //\n' +
            '  </some-long-element-name>                                      //\n' +
            '</div>                                                           //');
    });

    it('outputs an element/content mismatch diff, and forces a line break before', () => {
        const description = {
            type: 'ELEMENT',
            name: 'div',
            attributes: [ { name: 'id', value: 'foo' } ],
            children: [
                {
                    type: 'ELEMENT',
                    name: 'span',
                    attributes: [ { name: 'id', value: 'childfoo' }
                                ],
                    children: [ { type: 'CONTENT', value: 'one' }
                              ]
                },
                {
                    type: 'ELEMENT',
                    name: 'span',
                    attributes: [],
                    children: [ { type: 'CONTENT', value: 'two' }
                              ],
                    diff: {
                        type: 'elementContentMismatch',
                        expected: { type: 'CONTENT', value: 'some text' }
                    }
                }
            ]
        };

        expect(description, 'to output',
        '<div id="foo">\n' +
        '  <span id="childfoo">one</span>\n' +
        '  <span>two</span> // should be \'some text\'\n' +
        '</div>');

    });

    it('outputs a moved element hint', () => {

        /*
         * This is where the actual is
         *   <span>
         *       <Test>one</Test>
         *       <Test>three</Test>
         *       <Test>two</Test>
         *   </span>
         *
         *   And should be one, two, three.
         */

        const description = {
            type: 'ELEMENT',
            name: 'span',
            attributes: [],
            children: [
                { type: 'ELEMENT', name: 'Test', attributes: [], children: [ { type: 'CONTENT', value: 'one' } ] },
                {
                    type: 'ELEMENT', name: 'Test', attributes: [], children: [ { type: 'CONTENT', value: 'two' } ],
                    diff: {
                        type: 'missing',
                        actualIndex: 2
                    }
                },
                { type: 'ELEMENT', name: 'Test', attributes: [], children: [ { type: 'CONTENT', value: 'three' } ] },
                {
                    type: 'ELEMENT', name: 'Test', attributes: [], children: [ { type: 'CONTENT', value: 'two' } ],
                    diff: {
                        type: 'extra'
                    }
                }
            ]
        };

        expect(description, 'to output',
            '<span>\n' +
            '  <Test>one</Test>\n' +
            '  // missing (found at index 2) <Test>two</Test>\n' +
            '  <Test>three</Test>\n' +
            '  <Test>two</Test> // should be removed\n' +
            '</span>');
    });

    describe('class differences', () => {

        it('outputs an extra className', () => {

            const description = {
                type: 'ELEMENT',
                name: 'div',
                attributes: [
                    {
                        name: 'className',
                        value: 'one two three',
                        diff: {
                            type: 'class',
                            extra: 'two'
                        },
                    }
                ],
                children: []
            };

            expect(description, 'to output',
                '<div className="one two three" // extra class \'two\'\n' +
                '/>');
        });

        it('outputs a missing className', () => {

            const description = {
                type: 'ELEMENT',
                name: 'div',
                attributes: [
                    {
                        name: 'className',
                        value: 'one three',
                        diff: {
                            type: 'class',
                            missing: 'cheese'
                        },
                    }
                ],
                children: []
            };

            expect(description, 'to output',
                '<div className="one three" // missing class \'cheese\'\n' +
                '/>');
        });

        it('outputs an extra and a missing className', () => {

            const description = {
                type: 'ELEMENT',
                name: 'div',
                attributes: [
                    {
                        name: 'className',
                        value: 'one three',
                        diff: {
                            type: 'class',
                            missing: 'cheese',
                            extra: 'three',
                        },
                    }
                ],
                children: []
            };

            expect(description, 'to output',
                '<div className="one three" // missing class \'cheese\'\n' +
                '                           // extra class \'three\'\n' +
                '/>');
        });

        it('outputs multiple extra classes', () => {

            const description = {
                type: 'ELEMENT',
                name: 'div',
                attributes: [
                    {
                        name: 'className',
                        value: 'one three two',
                        diff: {
                            type: 'class',
                            extra: 'two three'
                        }
                    }
                ],
                children: []
            };

            expect(description, 'to output',
                '<div className="one three two" // extra classes \'two three\'\n' +
                '/>');
        });

        it('outputs multiple missing classes', () => {

            const description = {
                type: 'ELEMENT',
                name: 'div',
                attributes: [
                    {
                        name: 'className',
                        value: 'one three',
                        diff: {
                            type: 'class',
                            missing: 'cheese another'
                        }
                    }
                ],
                children: []
            };

            expect(description, 'to output',
                '<div className="one three" // missing classes \'cheese another\'\n' +
                '/>');
        });
    });

    describe('expect.it', () => {

        it('should diff an expect.it assertion attribute', () => {

            // Generate an UnexpectedError
            let error;
            try {
                expect('abcde', 'to match', /[a-d]+$/);
            } catch (e) {
                error = e;
            }

            expect({
                type: 'ELEMENT',
                name: 'div',
                attributes: [{
                    name: 'className',
                    value: 'abcde',
                    diff: {
                        type: 'custom',
                        assertion: expect.it('to match', /[a-d]+$/),
                        error: error
                    }
                }],
                children: []
            }, 'to output',
                '<div className="abcde" // expected \'abcde\' to match /[a-d]+$/\n' +
                '/>');

        });

        it('should diff an expect.it assert content', () => {

            // Generate an UnexpectedError
            let error;
            try {
                expect('abcde', 'to match', /[a-d]+$/);
            } catch (e) {
                error = e;
            }

            expect({
                    type: 'ELEMENT',
                    name: 'div',
                    children: [{
                        type: 'CONTENT',
                        value: 'abcde',
                        diff: {
                            type: 'custom',
                            assertion: expect.it('to match', /[a-d]+$/),
                            error: error
                        }
                    }]
                }, 'to output',
                '<div>\n' +
                '  abcde // expected \'abcde\' to match /[a-d]+$/\n' +
                '</div>');
        });

        it('should diff an expect.it assert content on numbers', () => {

            // Generate an UnexpectedError
            let error;
            try {
                expect(17, 'to be a string');
            } catch (e) {
                error = e;
            }

            expect({
                    type: 'ELEMENT',
                    name: 'div',
                    children: [{
                        type: 'CONTENT',
                        value: 17,
                        diff: {
                            type: 'custom',
                            assertion: expect.it('to match', /[a-d]+$/),
                            error: error
                        }
                    }]
                }, 'to output',
                '<div>\n' +
                '  17 // expected 17 to be a string\n' +
                '</div>');
        });

        it('should diff an expect.it assert content over multiple lines', () => {

            // Generate an UnexpectedError
            let error;
            try {
                expect('abcde', 'to be a string').and('to have length', 4);
            } catch (e) {
                error = e;
            }

            expect({
                    type: 'ELEMENT',
                    name: 'div',
                    children: [{
                        type: 'CONTENT',
                        value: 'abcde',
                        diff: {
                            type: 'custom',
                            assertion: expect.it('to be a string').and('to have length', 4),
                            error: error
                        }
                    }]
                }, 'to output',
                '<div>\n' +
                '  abcde // expected \'abcde\' to have length 4\n' +
                '        //   expected 5 to be 4\n' +
                '</div>');
        });

        it('should show an expect.it assertion when the value is an assertion', () => {

            expect({
                    type: 'ELEMENT',
                    name: 'div',
                    children: [{
                        type: 'CONTENT',
                        value: expect.it('to be a', 'string').and('to have length', 4)
                    }]
                }, 'to output',
                '<div>\n' +
                "  {expect.it('to be a', 'string')\n" +
                "          .and('to have length', 4)}\n" +   // TODO: I don't understand why this is indented wrong
                '</div>');
        });
    });
});
