import ArrayChanges from 'array-changes';
import ObjectAssign from 'object-assign';
import isNativeType from './isNativeType';
import LineBreaker from './lineBreaker';
import Weights from './Weights';

// Weightings for diff heuristics

const DefaultWeights = {
    OK: 0,
    NATIVE_NONNATIVE_MISMATCH: 15,
    NAME_MISMATCH: 10,
    ATTRIBUTE_MISMATCH: 1,
    ATTRIBUTE_MISSING: 1,
    ATTRIBUTE_EXTRA: 1,     // Actual contains an attribute that is not expected
    STRING_CONTENT_MISMATCH: 3,
    CONTENT_TYPE_MISMATCH: 1,
    CHILD_MISSING: 2,
    CHILD_INSERTED: 2,
    WRAPPER_REMOVED: 3
};

const defaultOptions = {
    diffExtraAttributes: true,
    diffRemovedAttributes: true,
    diffExtraChildren: true,
    diffMissingChildren: true,
    diffWrappers: true
};

const WRAP_WIDTH = 80;

function diffContent(actualAdapter, expectedAdapter, actual, expected, output, diff, inspect, equal, options) {

    let bestWeight = null;
    let bestDiff = null;

    if (actual.length === 1 && expected.length === 1) {
        // It's a single element, then just directly compare the elements
        const singleElementDiff = diffElements(actualAdapter, expectedAdapter, actual[0], expected[0], output, diff, inspect, equal, options);
        bestDiff = singleElementDiff.output;
        bestWeight = singleElementDiff.weight;
    }

    if ((!bestWeight || bestWeight.real !== Weights.OK) &&
        actual.length === 1 &&
        !isNativeType(actual[0])) {
        // Try it as a wrapper, and see if it's better
        // Also covered here is a wrapper around several children

        const actualChildren = actualAdapter.getChildren(actual[0]);
        const wrapperResult = diffContent(actualAdapter, expectedAdapter, actualChildren, expected, output, diff, inspect, equal, options);

        if (!bestWeight || wrapperResult.weight.real < bestWeight.real) {
            // It could be a wrapper
            bestWeight = wrapperResult.weight;
            // TODO: Need to outputWrapper here
            bestDiff = output.clone();
            outputWrapper(bestDiff, actualAdapter.getName(actual[0]), actualAdapter.getAttributes(actual[0]), wrapperResult.output, inspect, options);
            if (options.diffWrappers) {
                bestWeight.add(DefaultWeights.WRAPPER_REMOVED);
            }

        }
    }

    if (!bestWeight || bestWeight.real !== Weights.OK) {
        // The children should be compared
        const childrenOutput = output.clone();
        const childWeights = diffChildren('diffContent', actualAdapter, expectedAdapter, actual, expected, childrenOutput, diff, inspect, equal, options);

        if (!bestWeight || childWeights.real < bestWeight.real) {
            bestWeight = childWeights;
            bestDiff = childrenOutput;
        }
    }
    console.log('Diffing content', actual, expected, 'best diff', bestWeight.real, bestDiff.toString());

    return {
        weight: bestWeight,
        output: bestDiff
    };

}

function diffElements(actualAdapter, expectedAdapter, actual, expected, output, diff, inspect, equal, options) {

    options = ObjectAssign({}, defaultOptions, options);
    let diffWeight = new Weights();

    let startPosition = 0;

    const diffOutput = output.clone();

    if (isNativeType(actual) && isNativeType(expected)) {
        if (actual !== expected) {
            const actualNativeContent = ('' + actual);
            const expectedNativeContent = ('' + expected);
            if (actualNativeContent !== expectedNativeContent) {
                const diffResult = diff(actualNativeContent, expectedNativeContent);
                return {
                    weight: diffWeight.add(DefaultWeights.STRING_CONTENT_MISMATCH),
                    output: diffResult.diff
                }
            } else {
                return {
                    weight: diffWeight.add(DefaultWeights.CONTENT_TYPE_MISMATCH),
                    output: diffOutput.text(actualNativeContent).sp().annotationBlock(function () {
                        this.error('mismatched type').sp();
                        const typeDiff = diff(typeof actual, typeof expected);
                        this.block(typeDiff.diff)
                    })
                }
            }
        } else {
            diffOutput.text(actual);
            return {
                weight: diffWeight,
                output: diffOutput
            };
        }
    } else if (isNativeType(actual) && !isNativeType(expected)) {
        diffOutput.block('' + actual).sp().annotationBlock(function () {
            this.error('should be ').block(inspect(expected));
        });
        return {
            weight: diffWeight.add(DefaultWeights.NATIVE_NONNATIVE_MISMATCH),
            output: diffOutput
        };
    } else if (!isNativeType(actual) && isNativeType(expected)) {

        const actualOutput = inspect(actual);
        diffOutput.block(actualOutput).sp().annotationBlock(function () {

            this.nl(actualOutput.size().height - 1).error('should be ').block(inspect(expected))
        });
        return {
            weight: diffWeight.add(DefaultWeights.NATIVE_NONNATIVE_MISMATCH),
            output: diffOutput
        }

    }

    const actualName = actualAdapter.getName(actual);
    const expectedName = expectedAdapter.getName(expected);

    diffWeight.setName('Comparing actual ' + actualName + ' against expected ' + expectedName);

    let childrenOutput = diffOutput.clone();

    const actualChildren = actualAdapter.getChildren(actual);
    const expectedChildren = expectedAdapter.getChildren(expected);

    let childrenOnNewLine = false;
    diffOutput.prismPunctuation('<');
    if (actualName === expectedName) {
        diffOutput.prismTag(actualName);
        startPosition = actualName.length;
    } else {
        diffWeight.add(DefaultWeights.NAME_MISMATCH);
        diffOutput.prismTag(actualName)
            .sp().annotationBlock(function () {
                this.error('should be ').prismPunctuation('<').prismTag(expectedName).prismPunctuation('>')
            })
            .nl();
        childrenOnNewLine = true;  // We've broken the tag with the "// should be <tagname>", so we need children indented
    }

    const actualAttributes = actualAdapter.getAttributes(actual);
    const expectedAttributes = expectedAdapter.getAttributes(expected);

    const attributesOutput = diffOutput.clone();
    diffWeight.addWeight(diffAttributes(diffWeight.name, actualAttributes, expectedAttributes, attributesOutput, startPosition, diff, inspect, equal, options));
    console.log(attributesOutput.toString())

    diffOutput.append(attributesOutput);
    const attributeSize = attributesOutput.size();
    if (attributeSize.width > WRAP_WIDTH || attributeSize.height > 1) {
        childrenOnNewLine = true;
    }


    if (actualChildren.length || expectedChildren.length) {
        diffOutput.prismPunctuation('>');
        let childrenDiff = diffContent(actualAdapter, expectedAdapter, actualChildren, expectedChildren, childrenOutput, diff, inspect, equal, options);

        if (childrenDiff.output.toString().indexOf('// extraAttribute') !== -1) {
            console.log(childrenOutput.toString())
        }
        if (childrenDiff.weight.real !== DefaultWeights.OK && actualChildren.length === 1 && !isNativeType(actualChildren[0])) {

            // The children could be a inside a wrapper.
            // Let's try the children of the first child, and see if the diff weight is lower
            const grandchildrenDiff = diffContent(actualAdapter, expectedAdapter, actualAdapter.getChildren(actualChildren[0]), expectedChildren, diffOutput, diff, inspect, equal, options);

            if (grandchildrenDiff.weight.real < childrenDiff.weight.real) {
                childrenOutput = diffOutput.clone();
                outputWrapper(childrenOutput,
                    actualAdapter.getName(actualChildren[0]),
                    actualAdapter.getAttributes(actualChildren[0]),
                    grandchildrenDiff.output,
                    inspect,
                    options);

                console.log('Children (grandchildren) Wrapper output ', childrenOutput.toString());
                childrenDiff.weight = grandchildrenDiff.weight.addTotal(DefaultWeights.WRAPPER_REMOVED);
                childrenDiff.weight.addReal(options.diffWrappers ? DefaultWeights.WRAPPER_REMOVED : DefaultWeights.OK);
            } else {
            childrenOutput = childrenDiff.output;
        }
        } else {
            childrenOutput = childrenDiff.output;
        }

        diffWeight.addWeight(childrenDiff.weight);

        diffOutput.indentLines();

        const childSize = childrenOutput.size();

        // This is a bit hacky - if childrenDiff.weight isn't 0,
        // then it means there was some kinda difference in the children.
        // If thats's the case, we need the children on a separate line to show the children diff properly
        if (childSize.width > WRAP_WIDTH || childSize.height > 1 || childrenDiff.weight.real) {
            childrenOnNewLine = true;
        }
        if (childrenOnNewLine) {
            diffOutput.nl().i();
        }


        diffOutput.block(childrenOutput);
        diffOutput.outdentLines();
        if (childrenOnNewLine) {
            diffOutput.nl().i();
        }
        diffOutput.prismPunctuation('</').prismTag(actualName).prismPunctuation('>');
    } else {
        diffOutput.prismPunctuation('/>');
    }

    // We'll check if the actual is just a wrapper for the expected content
    if (diffWeight.real !== DefaultWeights.OK && !isNativeType(actual) && actualChildren && actualChildren.length === 1)  {
        const wrapperCheckResult = diffElements(actualAdapter, expectedAdapter, actualChildren[0], expected, output, diff, inspect, equal, options);
        if (wrapperCheckResult.weight.real < diffWeight.real) {
            // It's a wrap(per)!
            const wrapperOutput = output.clone();

            outputWrapper(wrapperOutput,
                actualName,
                actualAttributes,
                wrapperCheckResult.output,
                inspect,
                options);

            const wrapperWeights = new Weights();
            wrapperWeights.addWeight(wrapperCheckResult.weight);
            wrapperWeights.addTotal(DefaultWeights.WRAPPER_REMOVED);
            if (options.diffWrappers) {
                wrapperWeights.addReal(DefaultWeights.WRAPPER_REMOVED);
            }
            return {
                weight: wrapperWeights,
                output: wrapperOutput
            };
        }
    }

    return {
        weight: diffWeight,
        output: diffOutput
    };



}

function diffAttributes(diffWeightName, actualAttributes, expectedAttributes, diffOutput, nameLength, diff, inspect, equal, options) {

    let diffWeights = new Weights();
    diffWeights.setName('Attributes of ' + diffWeightName);

    const attributeOutput = LineBreaker.breakAt(diffOutput, WRAP_WIDTH);
    attributeOutput.add(pen => {
        pen.wrapIfHadBreaks().indentOnBreak();
    });

    Object.keys(actualAttributes).forEach(attrib => {
        if (expectedAttributes.hasOwnProperty(attrib)) {
            if (!equal(actualAttributes[attrib], expectedAttributes[attrib])) {
                const diffResult = diff('' + actualAttributes[attrib], '' + expectedAttributes[attrib]);

                attributeOutput.add(pen => {

                    pen.sp();
                    outputAttribute(pen, attrib, actualAttributes[attrib], inspect);

                    pen.sp().annotationBlock(function () {
                        this.error('should be').sp();
                        outputAttribute(this, attrib, expectedAttributes[attrib], inspect);
                        this.sp().block(diffResult.diff);
                    });
                    pen.forceLineBreak();
                });
                diffWeights.add(DefaultWeights.ATTRIBUTE_MISMATCH)
            } else {
                attributeOutput.add(pen => {
                    pen.sp();
                    outputAttribute(pen, attrib, actualAttributes[attrib], inspect)
                });
            }
        } else {
            if (options.diffExtraAttributes) {

                attributeOutput.add(pen => {
                    pen.sp();
                    outputAttribute(pen, attrib, actualAttributes[attrib], inspect);
                    pen.sp().annotationBlock(function () {
                            this.prismAttrName(attrib).sp().error('should be removed');
                        })
                        .forceLineBreak();
                });

                diffWeights.addReal(DefaultWeights.ATTRIBUTE_EXTRA);
            }

            diffWeights.addTotal(DefaultWeights.ATTRIBUTE_EXTRA);
        }
    });

    Object.keys(expectedAttributes).forEach(attrib => {
        if (options.diffRemovedAttributes && !actualAttributes.hasOwnProperty(attrib)) {
            diffWeights.addReal(DefaultWeights.ATTRIBUTE_MISSING);
            attributeOutput.add(pen => {

                pen.sp().annotationBlock(function () {
                    this.error('missing').sp();
                    outputAttribute(this, attrib, expectedAttributes[attrib], inspect);
                })
                .forceLineBreak();
            });
        }
        diffWeights.addTotal(DefaultWeights.ATTRIBUTE_MISSING);
    });

    diffOutput.append(attributeOutput.getOutput( { groupContent: true, appendBreakIfHadBreaks: true }));
    return diffWeights;
}

function diffChildren(diffWeightName, actualAdapter, expectedAdapter, actualChildren, expectedChildren, output, diff, inspect, equal, options) {

    let diffWeights = new Weights();
    diffWeights.setName('Children of' + diffWeightName);

    var changes = ArrayChanges(actualChildren, expectedChildren,
        function (a, b) {
            const elementDiff = diffElements(actualAdapter, expectedAdapter, a, b, output, diff, inspect, equal, options);
            return elementDiff.weight.total === DefaultWeights.OK;
        },

        function (a, b) {
            // Figure out whether a and b are the same element so they can be diffed inline.
            var aIsNativeType = isNativeType(a);
            var bIsNativeType = isNativeType(b);
            if (aIsNativeType && bIsNativeType) {
                return true;
            }

            if (aIsNativeType !== bIsNativeType) {
                return false;
            }


            return (
                actualAdapter.getName(a)  === expectedAdapter.getName(b)
            );
        } );

    const childCollection = LineBreaker.breakAt(output.clone(), WRAP_WIDTH);

    changes.forEach(function (diffItem, index) {


            switch(diffItem.type) {
                case 'insert':
                    if (options.diffMissingChildren) {
                        diffWeights.addReal(DefaultWeights.CHILD_MISSING);
                        childCollection.add(pen =>{
                            pen.block(function () {
                                this.annotationBlock(function () {
                                    this.error('missing ');
                                    if (typeof diffItem.value === 'string') {
                                        this.block(function () {
                                            this.text(diffItem.value);
                                        });
                                    } else {
                                        this.block(inspect(diffItem.value));
                                    }
                                });
                            }).forceLineBreakBefore().forceLineBreak();

                        });
                    }
                    diffWeights.addTotal(DefaultWeights.CHILD_MISSING);
                    break;

                case 'remove':
                    if (options.diffExtraChildren) {
                        diffWeights.addReal(DefaultWeights.CHILD_INSERTED);
                        childCollection.add(pen => {
                            pen.block(function () {
                                if (typeof diffItem.value === 'string') {
                                    this.block(function () {
                                        this.text(diffItem.value).sp().error('// should be removed');
                                    });
                                } else {
                                    const actualInspectBlock = inspect(diffItem.value);
                                    this.block(actualInspectBlock).sp().annotationBlock(function () {
                                        this.error('should be removed');
                                        this.nl(actualInspectBlock.size().height - 1);
                                    });
                                }
                            }).forceLineBreakBefore().forceLineBreak();
                        });
                    } else {

                        const actualInspectBlock = inspect(diffItem.value);
                        childCollection.add(pen => {
                            pen.block(actualInspectBlock);
                        });
                        diffWeights.addTotal(DefaultWeights.CHILD_INSERTED);
                    }
                    break;

                case 'equal':
                    childCollection.add(pen => {
                        pen.block(function () {
                            if (typeof diffItem.value === 'string') {
                                this.block(function () {
                                    this.text(diffItem.value);
                                });
                            } else {
                                this.block(inspect(diffItem.value));
                            }
                        });
                    });
                    break;

                default:
                    childCollection.add(pen => {

                        pen.block(function () {

                            const elementDiffResult = diffElements(actualAdapter, expectedAdapter, diffItem.value, diffItem.expected, output, diff, inspect, equal, options);
                            diffWeights.addWeight(elementDiffResult.weight);

                            this.block(elementDiffResult.output);

                            const elementDiffSize = elementDiffResult.output.size();
                            if (elementDiffSize.height > 1) {
                                pen.forceLineBreak();
                            }

                            // If there was a difference, break to a new line to show it neatly
                            if (elementDiffResult.weight.real) {
                                pen.forceLineBreakBefore();
                            }
                        });
                    });
                    break;
            }

    });

    const childOutputBlock = childCollection.getOutput({
        allowForceLastLineBreak: false
    });

    output.block(childOutputBlock);

    return diffWeights;
}

function outputWrapper(output, wrapperName, attributes, children, inspect, options) {

    output.block(function () {

        let prismTagFunc = 'prismTag';
        if (!options.diffWrappers) {
            prismTagFunc = 'prismPunctuation';  // Make the tagname grey
        }

        this.prismPunctuation('<')
            [prismTagFunc](wrapperName);


        const attributePen = this.clone();

        outputAttributes(attributePen, attributes, inspect);
        attributePen.replaceText(function (styles, text) {
            this.text(text, 'prismPunctuation');
        });
        this.append(attributePen);
        this.prismPunctuation('>');
        if (options.diffWrappers) {
            this.sp().annotationBlock(function () {
                this.error('wrapper should be removed');
            });
        }
        this.indentLines().nl().i();
        this.block(children);
        this.outdentLines().nl().i();
        this.prismPunctuation('</')
            [prismTagFunc](wrapperName)
            .prismPunctuation('>');
        if (options.diffWrappers) {
            this.sp().annotationBlock(function () {
                this.error('wrapper should be removed');
            });
        }
    });
}


function outputAttribute(output, name, value, inspect) {

    output.prismAttrName(name)
        .prismPunctuation('=');
    if (typeof value === 'string') {
        output.prismPunctuation('"')
            .prismAttrValue(value)
            .prismPunctuation('"');
    } else {
        output.prismPunctuation('{')
            .prismAttrValue(inspect(value))
            .prismPunctuation('}');
    }
}

function outputAttributes(output, attributes, inspect) {
    const attribOutput = LineBreaker.breakAt(output, WRAP_WIDTH);
    attribOutput.add(pen => pen.indentOnBreak());

    Object.keys(attributes).forEach(attribName => {
        attribOutput.add(pen => {
            pen.sp();
            outputAttribute(pen, attribName, attributes[attribName], inspect);
        });
    });

    output.append(attribOutput.getOutput({ groupContent: true }));
}

export default {
    diffElements,
    DefaultWeights
};