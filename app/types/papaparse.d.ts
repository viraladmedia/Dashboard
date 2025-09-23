// File: types/papaparse.d.ts  (or app/types/papaparse.d.ts)
declare module "papaparse" {
  export interface ParseResult<T = unknown> {
    data: T[];
  }

  export interface ParseError {
    message: string;
  }

  export interface ParseConfig<T = unknown> {
    header?: boolean;
    dynamicTyping?: boolean | Record<string, boolean>;
    skipEmptyLines?: boolean | "greedy";
    complete?: (results: ParseResult<T>) => void;
    error?: (error: ParseError) => void;
  }

  export function parse<T = unknown>(
    file: File | string,
    config?: ParseConfig<T>
  ): void;

  export function unparse(data: unknown): string;

  const Papa: {
    parse: typeof parse;
    unparse: typeof unparse;
  };

  export default Papa;
}
