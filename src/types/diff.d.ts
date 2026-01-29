declare module "diff" {
  export type Change = {
    added?: boolean;
    removed?: boolean;
    value: string;
  };

  export function diffWords(oldStr: string, newStr: string): Change[];
}
