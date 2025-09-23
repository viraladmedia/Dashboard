// types/papaparse.d.ts
declare module "papaparse" {
  type ParseConfig = any; // keep simple; can refine later
  export function parse<T = any>(
    file: File | string,
    config?: ParseConfig
  ): void;

  export function unparse(data: any): string;

  const _default: {
    parse: typeof parse;
    unparse: typeof unparse;
  };
  export default _default;
}
