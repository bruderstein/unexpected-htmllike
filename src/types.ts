
export interface Adapter<T> {
  getName: (element: T) => string;
  getChildren: (element: T) => T[];
  getAttributes: (element: T) => {
    [key: string]: any
  };

  classAttributeName?: string;
}

export interface Expect {
  inspect: (value: any) => MagicPen;
  diff: <T>(a: T, b: T) => MagicPen;
}

export interface MagicPen {

}


export type ChildContentDesc<T> = ElementDesc<T> | ContentDesc | WrapperElementDesc<T>;

export interface ElementDesc<T> {
  type: 'ELEMENT',
  name: string,
  attributes: Attribute[],
  children: Array<ChildContentDesc<T>>,
  diff?: ElementDiff<T>
}

export interface Attribute {
  name: string;
  value: any
  diff?: AttributeDiff
}

export type AttributeDiff = MissingAttributeDiff
  | ExtraAttributeDiff
  | ChangedAttributeDiff
  | ClassAttributeMissingDiff
  | ClassAttributeExtraDiff;

export interface MissingAttributeDiff {
  type: 'missing';
}

export interface ExtraAttributeDiff {
  type: 'extra';
}

export interface ChangedAttributeDiff {
  type: 'changed';
  expectedValue: any;
}

export interface ClassAttributeMissingDiff {
  type: 'class';
  missing?: string;
}

export interface ClassAttributeExtraDiff {
  type: 'class';
  extra?: string;
}

export interface WeightResults {
  thisWeight: number;
  subtreeWeight: number;
  treeWeight: number;
  totalTreeWeight: number;
}


export interface ContentDesc {
  type: 'CONTENT';
  value: any;
  diff?: ContentDiff
}

export type ContentDiff = ChangedContentDiff | MissingContentDiff | ExtraContentDiff | CustomContentDiff;

export interface ChangedContentDiff {
  type: 'changed';
  expectedValue: any;
}

export interface MissingContentDiff {
  type: 'missing';
}

export interface ExtraContentDiff {
  type: 'extra';
}

export interface CustomContentDiff {
  type: 'custom';
  assertion: (value: any) => void;
  error: Error;
}

export interface WrapperElementDesc<T> {
  type: 'WRAPPER',
  attributes: Attribute[],
  children: Array<ElementDesc | ContentDesc | WrapperElementDesc<T>>,
  diff?: ElementDiff<T>,
  target?: T
}

export type ElementDiff<T> = MissingElementDiff
  | ExtraElementDiff
  | DifferentElementDiff
  | WrapperElementDiff
  | ContentElementMismatchDiff<T>
  | ElementContentMismatchDiff;

export interface MissingElementDiff {
  type: 'missing';
}

export interface ExtraElementDiff {
  type: 'extra';
}

export interface DifferentElementDiff {
  type: 'differentElement';
  expectedName: string;
}

export interface WrapperElementDiff {
  type: 'wrapper';
}

export interface ContentElementMismatchDiff<T> {
  type: 'contentElementMismatch';
  expected: ElementDesc | WrapperElementDesc<T>;
}

export interface ElementContentMismatchDiff {
  type: 'elementContentMismatch';
  expected: ContentDesc;
}

export interface DiffResult<T> {
  diff: ChildContentDesc;
  target?: T;
  weights: WeightResults;
}

export interface FullDiffResult<T> extends DiffResult<T> {
  weight: number;
}
