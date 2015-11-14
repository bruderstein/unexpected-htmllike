
import LineBreaker from './lineBreaker';
import isNativeType from './isNativeType';

const WRAP_WIDTH = 80;

export default function painter(pen, description, inspect, diffFn) {

    if (description.diff) {

        switch(description.diff.type) {
            case 'missing':
                pen.forceLineBreakBefore();
                pen.annotationBlock(function () {
                    this.error('missing').sp();
                    this.block(function () {
                        painter(this, {
                            type: description.type,
                            name: description.name,
                            value: description.value,
                            attributes: description.attributes,
                            children: description.children
                        }, inspect, diffFn);
                    });
                });
                return;

            case 'extra':
                pen.forceLineBreakBefore();
                const removedElementPen = pen.clone();

                painter(removedElementPen, {
                    type: description.type,
                    name: description.name,
                    value: description.value,
                    attributes: description.attributes,
                    children: description.children
                }, inspect, diffFn);
                pen.block(removedElementPen).sp().annotationBlock(function () {
                    this.error('should be removed');
                    this.nl(removedElementPen.size().height - 1).i();
                });
                return;

            case 'wrapper':
                pen.prismPunctuation('<')
                    .prismTag(description.name);
                if (description.attributes) {
                    outputAttributes(pen, description.attributes, inspect, diffFn);
                }
                pen.prismPunctuation('>')
                    .sp()
                    .annotationBlock(function () {
                        this.error('wrapper should be removed');
                    });

                outputChildren(pen, description, inspect, diffFn, true);
                pen.prismPunctuation('</')
                    .prismTag(description.name)
                    .prismPunctuation('>').sp().annotationBlock(function () {
                    this.error('wrapper should be removed');
                });
                return;

            case 'differentElement':
                pen.prismPunctuation('<')
                    .prismTag(description.name)
                    .sp().annotationBlock(function () {
                    this.error('should be').sp().prismPunctuation('<')
                    .prismTag(description.diff.expectedName);
                });
                if (description.attributes) {
                    pen.nl().indentLines();
                    if (description.attributes && description.attributes.length) {
                        pen.i();
                        outputAttributes(pen, description.attributes, inspect, diffFn);
                    }
                    pen.outdentLines();
                } else {
                    pen.nl().i();
                }

                if (description.children && description.children.length) {
                    pen.prismPunctuation('>');
                    outputChildren(pen, description, inspect, diffFn, true);
                    pen.prismPunctuation('</')
                        .prismTag(description.name)
                        .prismPunctuation('>');
                } else {
                    pen.prismPunctuation('/>');
                }
                return;

            case 'contentElementMismatch':
                if (pen.forceLineBreakBefore) {
                    pen.forceLineBreakBefore();
                }
                pen.text(description.value).sp().annotationBlock(function () {
                    this.error('should be').sp();
                    const expectedPen = pen.clone();
                    painter(expectedPen, description.diff.expected, inspect, diffFn);
                    this.block(expectedPen);
                });
                return;

            case 'elementContentMismatch':
                const elementPen = pen.clone();
                outputElement(elementPen, description, inspect, diffFn);
                if (pen.forceLineBreakBefore) {
                    pen.forceLineBreakBefore();
                }
                pen.block(elementPen).sp().annotationBlock(function () {
                    this.error('should be')
                        .sp()
                        .append(inspect(description.diff.expected.value))
                        .nl(elementPen.size().height - 1);
                });
                return;
        }

    }


    switch(description.type) {

        case 'ELEMENT':
            outputElement(pen, description, inspect, diffFn);
            break;

        case 'WRAPPERELEMENT':
            outputWrapperElement(pen, description, inspect, diffFn);
            break;

        case 'CONTENT':
            if (description.diff) {
                switch(description.diff.type) {
                    case 'changed':
                        const expectedString = '' + description.diff.expectedValue;
                        const actualString = '' + description.value;
                        pen.block(function () {
                            if (expectedString === actualString) {
                                this.block(function () {
                                    this.text(actualString);
                                }).sp().annotationBlock(function () {
                                    this.error('mismatched type').sp().block(diffFn(typeof description.value, typeof description.diff.expectedValue).diff);
                                });
                            } else if (typeof description.value === typeof description.diff.expectedValue) {
                                this.append(diffFn(description.value, description.diff.expectedValue).diff);
                            } else {
                                this.block(function () {
                                    this.append(diffFn('' + description.value, '' + description.diff.expectedValue).diff);
                                }).sp().annotationBlock(function () {
                                    this.error('and mismatched type').sp().block(diffFn(typeof description.value, typeof description.diff.expectedValue).diff);
                                });
                            }
                        });
                        break;

                    case 'custom':

                        pen.text(description.value).sp().annotationBlock(function () {
                            pen.addStyle('appendInspected', function (arg) {
                                this.append(inspect(arg));
                            });
                            this.append(description.diff.error.getErrorMessage(pen));
                        });
                        if (pen.forceLineBreak) {
                            pen.forceLineBreakBefore();
                        }
                        break;

                }
            } else if (typeof description.value === 'function' && description.value._expectIt) {
                pen.prismPunctuation('{').append(inspect(description.value)).prismPunctuation('}');
            } else {
                pen.text(description.value);
            }
            break;
    }
}

function outputElement(pen, description, inspect, diffFn) {

    pen.prismPunctuation('<')
        .prismTag(description.name);

    let needSpaceBeforeSelfClose = true;
    let forceChildrenOnNewLine = false;
    if (description.attributes) {
        const penSize = outputAttributes(pen, description.attributes, inspect, diffFn);
        if (penSize.height > 1) {
            needSpaceBeforeSelfClose = false;
            forceChildrenOnNewLine = true;
        }
    }


    if (!description.children || description.children.length === 0) {
        if (needSpaceBeforeSelfClose) {
            pen.sp();
        }
        pen.prismPunctuation('/>');
    } else {

        pen.prismPunctuation('>');
        outputChildren(pen, description, inspect, diffFn, forceChildrenOnNewLine);

        pen.prismPunctuation('</')
            .prismTag(description.name)
            .prismPunctuation('>');

    }
}

function outputWrapperElement(pen, description, inspect, diffFn) {

    pen.gray('<')
        .gray(description.name);

    if (description.attributes) {
        const attribPen = pen.clone();
        outputAttributes(attribPen, description.attributes, inspect, diffFn);
        attribPen.replaceText(function (styles, text) {
            this.text(text, 'gray');
        });
        pen.append(attribPen);
    }


    pen.gray('>');
    outputChildren(pen, description, inspect, diffFn, true);

    pen.gray('</')
        .gray(description.name)
        .gray('>');

}

function outputChildren(pen, description, inspect, diffFn, forcedOnNewLine) {

    const childrenOutput = LineBreaker.breakAt(pen, WRAP_WIDTH);
    for (let childIndex = 0; childIndex < description.children.length; ++childIndex) {
        const child = description.children[childIndex];

        childrenOutput.add(childPen => {
            painter(childPen, child, inspect, diffFn);
        });
    }
    const childrenResultOutput = childrenOutput.getOutput();
    const childrenSize = childrenResultOutput.output.size();

    let childrenOnSeparateLines = false;
    if (forcedOnNewLine ||
        childrenResultOutput.breakAfter ||
        childrenResultOutput.breakBefore ||
        childrenSize.height > 1 ||
        (childrenSize.width + pen.size().width) >= WRAP_WIDTH) {
        pen.indentLines().nl().i();
        childrenOnSeparateLines = true;
    }

    pen.block(childrenResultOutput.output);

    if (childrenOnSeparateLines) {
        pen.outdentLines().nl().i();
    }
    // TO HERE
}

function outputAttribute(pen, name, value, diff, inspect, diffFn) {


    if (diff) {
        switch(diff.type) {
            case 'changed':
                outputRawAttribute(pen, name, value, inspect);
                pen.sp().annotationBlock(pen => {
                    pen.error('should be ');
                    outputRawAttribute(pen, name, diff.expectedValue, inspect);

                    if (typeof value === typeof diff.expectedValue && typeof value !== 'boolean') {
                        const valueDiff = diffFn(value, diff.expectedValue);

                        if (valueDiff && valueDiff.inline) {
                            pen.nl().block(valueDiff.diff);
                        } else if (valueDiff) {
                            pen.nl().block(function () {
                                this.append(valueDiff.diff);
                            });
                        } else {
                            pen.nl().block(function () {
                                this.append(inspect(diff.expectedValue));
                            });
                        }
                    }
                }).forceLineBreak();
                break;

            case 'custom':
                outputRawAttribute(pen, name, value, inspect);
                pen.sp().annotationBlock(pen => {
                    pen.addStyle('appendInspected', function (arg) {
                        this.append(inspect(arg));
                    });
                    pen.block(diff.error.getErrorMessage(pen));
                }).forceLineBreak();

                break;
            case 'missing':
                pen.annotationBlock(pen => {
                    pen.error('missing ');
                    outputRawAttribute(pen, name, diff.expectedValue, inspect);
                }).forceLineBreak();
                break;

            case 'extra':
                outputRawAttribute(pen, name, value, inspect, diff);
                pen.sp().annotationBlock(pen => {
                    pen.prismAttrName(name)
                        .sp()
                        .error('should be removed');
                }).forceLineBreak();
        }
    } else {
        outputRawAttribute(pen, name, value, inspect);
    }
}

function outputRawAttribute(pen, name, value, inspect) {

    pen.prismAttrName(name)
        .prismPunctuation('=');
    if (typeof value === 'string') {
        pen.prismPunctuation('"')
            .prismAttrValue(value)
            .prismPunctuation('"');
    } else {
        pen.prismPunctuation('{')
            .prismAttrValue(inspect(value))
            .prismPunctuation('}');
    }
}

function outputAttributes(pen, attributes, inspect, diffFn) {
    const attribOutput = LineBreaker.breakAt(pen, WRAP_WIDTH);
    attribOutput.add(pen => pen.indentOnBreak());

    attributes.forEach(attrib => {
        attribOutput.add(pen => {
            pen.sp();
            outputAttribute(pen, attrib.name, attrib.value, attrib.diff, inspect, diffFn);
        });
    });

    const attribPen = attribOutput.getOutput({ groupContent: true, appendBreakIfHadBreaks: true }).output;
    pen.append(attribPen);
    return attribPen.size();
}
