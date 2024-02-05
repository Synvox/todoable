namespace JSX {
  interface ElementChildrenAttribute {
    children: {}; // specify children here
  }

  export interface IntrinsicElements {
    [elemName: string]: any & { children?: any };
  }
}
