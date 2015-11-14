# unexpected-htmllike

![tattoo](https://cloud.githubusercontent.com/assets/91716/11163196/8215efc2-8ac6-11e5-86da-7285585ab3ef.jpg)
(Image from http://www.idyllramblings.com/2010/03/the-geekiest-tattoos-you-ever-did-see.html)

Beautifully painted [magicpen](https://github.com/sunesimonsen/magicpen) generation and output of diffs and inspections for HTML-like structures.

![fulldemo](https://cloud.githubusercontent.com/assets/91716/10930973/a9ed17ba-82c3-11e5-8afc-393f8bca147d.png)

IMPORTANT: This is not a plugin for [unexpected](http://unexpected.js.org). This is a helper library for
plugins for unexpected, that perform assertions and/or inspections on HTML-like structures, such as the DOM,
React Elements (including JSX), and React shallow renderer.

# Status

Whilst this project is well covered with tests, it has not (yet) seen much real world use. If you find something that doesn't
diff properly, or you get some unexpected (pun intended) output, then please report it, if you can with the actual / expected HTML/XML 
syntax that caused the error.  

# Features


`inspect`, `diff` and `contains` methods are provided, allowing diffing of any HTML/XML like structure, including wrapper detection.
e.g.
Assuming a "actual" representation of the following
```xml
<div id="outer">
   <div id="the-wrapper">
      <span>Some text</span>
   </div>
</div>
```
If the expected is
```xml
<div id="outer">
   <span>Some text</span>
</div>
```
This (optionally) matches. This also works even if the content inside the wrapper doesn't match exactly. If that is the case,
the wrapping element is output greyed out, with the changes highlighted (use `diffWrappers: false` in the options). 

![wrapper_grey](https://cloud.githubusercontent.com/assets/91716/10930860/adbddf6a-82c2-11e5-96af-1b827a9d02ea.png)

You can also diff wrappers, and they will be highlighted as wrappers that should be removed (use `diffWrappers: true`, the default, in the options).

![wrapper_error](https://cloud.githubusercontent.com/assets/91716/10930873/c288a7cc-82c2-11e5-8c53-e7231dd22fb9.png)

The items that "count" towards a match can be controlled with `options`.

# Usage

Create an instance of `UnexpectedHtmlLike`, passing an adapter as the only parameter.
Over the next few days (as of 2015-11-04) a few useful adapters will be released, and listed here.
You can also write your own (please add to this list if you create one).

# Adapter API

If you want to use one of the exising adapters, you can skip this section - this is only if you want to implement your own adapter.

You need to create an object, with the following methods:
## `getName(element)`
Returns the name of the element as a string.  E.g. for the element `<input type="text" />`, `getName` would return `input`.

## `getChildren(element)`
Returns either an array of elements (or content). The elements should be either further elements that the methods of this object can call,
or native content.  For instance, `<span>the content</span>`, would return `[ 'the content' ]`.  If the element has no children, an empty array
should be returned.

## `getAttributes(element)`
Returns an object with each attribute as a key/value pair. Note that when outputting, `unexpected-htmllike` outputs string attributes in double quotes,
and other content types in curly braces (`{ }`). This matches the React/JSX style of attribute definition.  If you want to force quoted attributes (such
as XML or HTML output), simply ensure the attribute values are strings.

# API

## constructor (adapter)

Pass the adapter object (ie. an object with `getName`, `getAttributes`, and `getChildren` methods)
e.g.
```js
var jsxAdapter = require('unexpected-htmllike-jsx-adapter');
var UnexpectedHtmlLike = require('unexpected-htmllike');

var jsxDiff = new UnexpectedHtmlLike(jsxAdapter.create());
```

## inspect(actual, depth, output, inspect)
Returns a formatted output of the element (`actual`) using [magicpen](https://github.com/sunesimonsen/magicpen)
Parameters are the same as for the unexpected `inspect` method

## diff(expectedAdapter, actual, expected, output, diff, inspect, equal, options)
Diffs actual against expected, outputting the output to the magicpen instance `output`. Note that a second adapter
is passed for the `expected`, such that it is possible to diff two otherwise incompatible representations. If you want
to diff the same type as the "actual" (e.g. comparing JSX with JSX), simply pass the same adapter as the `expectedAdapter`.

`diff`, `inspect` and `equal` are the functions available from `unexpected`, and are passed everywhere where a diff is
required, but are also available as `expect.diff`, `expect.inspect`, and `expect.equal`.

`options` can be null, or an object with the following flags (all are optional, and all boolean flags default to true).
### diffMissingChildren  (boolean)
When true (the default), if a child element is missing in the actual, this is counted as a mismatch, and highlighted in the output

### diffExtraChildren  (boolean)
When true (the default), if a child element appears in the actual, but not in the expected, this is counted as a mismatch,
and highlighted in the output.

### diffMissingAttributes  (boolean)
When true (the default), if an attribute appears in the expected, but not in the actual, this is counted as a mismatch, and
is highlighted in the output.

### diffExtraAttributes  (boolean)
When true (the default), if an attribute appears in the actual, but not in the expected, this is counted as a mismatch, and
is highlighted in the output.  It is anticipated that most usages will set this to false, to allow for a `'to satisfy'` style
of assertion, but the default is true to ensure that the default is always an exact match.

### diffWrappers  (boolean)
When true (the default), if an element is found in the actual to be wrapping what is expected, it is highlighted as a wrapper
that should be removed.  When false, if the content does not match exactly (ie. diff returns a weight of non-zero - see return value),
then the wrapper is outputted in grey (the `prismPunctuation` style), and is always separated onto a separate line.

### weights  (object)
This must be an object that represents the different weights for the various differences that can occur.
The weights that can be provided, and the defaults are shown here
```js
{
    NATIVE_NONNATIVE_MISMATCH: 15,
    NAME_MISMATCH: 10,
    ATTRIBUTE_MISMATCH: 1,
    ATTRIBUTE_MISSING: 1,
    ATTRIBUTE_EXTRA: 1,
    STRING_CONTENT_MISMATCH: 3,
    CONTENT_TYPE_MISMATCH: 1,
    CHILD_MISSING: 2,
    CHILD_INSERTED: 2,
    WRAPPER_REMOVED: 3,
    ALL_CHILDREN_MISSING: 8
};
```

The weights are used to detect wrapper elements by identifying that when the wrapping element is removed,
the weight of the diff is less than the diff when it remains there.  
This can be easily demonstrated:

```xml
<div className="wrapper-example">
  <span id="content">here is some text</span>
</div>
```

If we diff against the following

```xml
<span id="different-content">here is some different text</span>
```
This (without wrapper detection), would result in the following points being found:
* `span` should be a `div`  (NAME_MISMATCH == 10)
* `id="different-content"` attribute missing  (ATTRIBUTE_MISSING == 1)
* `className="wrapper-example"` extra attribute  (ATTRIBUTE_EXTRA == 1)
* `<span id="content">here is some text</span>` should be the simple content text `here is some text` (NATIVE_NONNATIVE_MISMATCH == 15)
... which is a total weight of 10 + 1 + 1 + 15 = 27

Removing the wrapper, results in
* `id="content"` should be `id="different-content"` (`ATTRIBUTE_MISSMATCH == 1`)
* `here is some text` should be `here is some different text`  (`STRING_CONTENT_MISMATCH == 3`)
... which is a total weight of 1 + 3 = 4

If `diffWrappers == true`, then `WRAPPER_REMOVED` (== 3) is added to this.

### Return value
`diff` returns a promise, which resolves with an object with the following 2 properties:

* `weight` - the resulting weight from the diff. If this is `0`, the actual and expected match according to the `options` provided.
* `diff` - the output of the diff, with differences highlighted.

**Note that the promise is always resolved (unless of a bug or a real issue in a assertion), whether a difference is recorded or not.**
To check that the `actual` and `expected` are equivalent (given the options provided), check that the `weight` is zero.

## contains (expectedAdapter, actual, expected, output, diff, inspect, equal, options)

Checks if the `expected` is contained somewhere within the `actual`. The arguments are the same as the `diff` function,
including the options for flags and weights (`options` can also be null, to accept the defaults). See the description of `diff`
for information on the parameters.

### Return value
`contains` returns a promise, which resolves with an object, with the following properties
* `found` - (boolean) - true if a match was found
* `bestMatch` - (object) - if `found` is false, `bestMatch` contains the best located match, and is the same result as the `diff` function.
That is to say that `bestMatch` has the following properties:
** `weight` - (number) the weight of the diff - larger numbers indicate a bigger difference (see the description of `diff` above)
** `diff` - (magicpen) the diff output of the best matching element, against the `expected` value
* `bestMatchItem` - this is the element in whatever form the `actual` value takes that matched the best. This could be useful to identify the actual
node that matched the best, and is provided only for convenience.

**Note that the promise is always resolved (unless of a bug or a real issue in a assertion), whether the content is `found` or not.**


# Contributing

Absolutely! Do it! Raise a pull request, an issue, make a comment.  If you do make an addition or change, please make sure there are
tests to go with the changes. Each module has a `.spec.js` file to go with it. Tests for `diff` usually have a direct test, and an integration
level test in `HtmlLike.spec.js`, that tests that the correct output is given when the output of `diff` is passed to the `painter`. `painter.js` is
responsible for outputting the diff or element description to a magicpen instance. This separates the diffing and output generation, which is helpful
for wrapper detection, as some elements may need to be diffed several times to check for wrappers. Leaving the output generation to the end means this
process is a little more efficient.

# Roadmap / Future plans

We may need to extend the interface of the adapters to allow for "special" elements (such as `<style>` and `<script>` elements in the DOM), or to allow
for special child identification rules (for instance, using React's `key` attribute to identify the same child).

Weights may need to be adjusted when the project has seem some real world use. The current values are the result of a bit of playing with some examples,
and large helping of "gut feel".  Time will tell.

We may decide to add a weighting of what matches. Currently weights are only added according to how much doesn't match, but no weight (pun intended) is
placed on how much does match. It is plausible to think there are examples where something has "more things mismatching" than another element, but it also
has much more matching, and that should cancel each other out.  If you find a practical example where this would help, please raise an issue with it.


# Thanks

This project owes a huge amount to the `unexpected-dom` project from [@Munter](https://github.com/munter) - much of the code has been adapted from
that project.  

The whole project would not be possible without the amazing work of Sune [@sunesimonsen](https://github.com/sunesimonsen) and Andreas [@papandreou](https://github.com/papandreou),
and others in the [unexpected gitter chat room](https://gitter.im/unexpectedjs/unexpected).

Their assistance, answering my questions, discussing ideas and giving encouragement is truly appreciated. Thank you.

# License

MIT
