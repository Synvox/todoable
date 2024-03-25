import { JSXNode } from "../util";

export function jsx(type: any, props: Record<string, any>) {
  return new JSXNode(type, props);
}

export function jsxFragment(props: Record<string, any>) {
  return new JSXNode("fragment", props);
}
