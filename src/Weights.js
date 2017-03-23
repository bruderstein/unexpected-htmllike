

function Weights() {
    this._children = [];
    this.real = 0;
    this.total = 0;
    this.thisLevel = 0;
}

Weights.prototype.add = function (weight) {
    if (typeof weight !== 'number') {
        throw new Error('add takes a numeric parameter');
    }
//    console.log('Adding ', weight, 'to', this.name, 'results in ', this.total, this.real);
    this.real += weight;
    this.total += weight;
    this.thisLevel += weight;
    return this;
};

Weights.prototype.addReal = function (weight) {
    if (typeof weight !== 'number') {
        throw new Error('addReal takes a numeric parameter');
    }
    this.real += weight;
    this.thisLevel += weight;
    //console.log('Adding real', weight, 'to', this.name, 'results in', this.real);
    return this;
};

Weights.prototype.addTotal = function (weight) {
    if (typeof weight !== 'number') {
        throw new Error('addTotal takes a numeric parameter');
    }
    this.total += weight;
    return this;
};

Weights.prototype.addChildWeight = function (weight) {
    if (!weight instanceof Weights) {
        throw new Error('addWeight can only add other Weight objects');
    }
    weight._parent = this;
    this._children.push(weight);

    if (isNaN(this.real)) {
        throw new Error('caused nan');
    }
    return this;
};

Weights.prototype.createChild = function () {
    const child = new Weights();
    child._parent = this;
    this._children.push(child);
    return child;
};

Weights.prototype.results = function () {
    const subtreeWeights = addSubtree(this._children);
    return {
        thisWeight: this.real,
        subtreeWeight: subtreeWeights.real,
        treeWeight: this.real + subtreeWeights.real,
        totalTreeWeight: this.total + subtreeWeights.total
    };
};

Weights.prototype.getSubtree = function () {
    return addSubtree(this._children);
};


function addSubtree(children) {
    let subtreeWeightReal = 0;
    let subtreeWeightTotal = 0;
    for(let i = children.length - 1; i >= 0; --i) {
        let subtree = children[i].getSubtree();
        subtreeWeightReal += children[i].real + subtree.real;
        subtreeWeightTotal += children[i].total + subtree.total;
    }
    return { real: subtreeWeightReal, total: subtreeWeightTotal };
}

module.exports = Weights;
