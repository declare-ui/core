/**
 * DeclareUI error classes.
 */

/** Base error for all DeclareUI errors */
export class DeclareUIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeclareUIError';
  }
}

/** Validation error with structured context */
export class DeclareUIValidationError extends DeclareUIError {
  code: string;
  path?: string;
  line?: number;

  constructor(options: {
    code: string;
    message: string;
    path?: string;
    line?: number;
  }) {
    super(options.message);
    this.name = 'DeclareUIValidationError';
    this.code = options.code;
    this.path = options.path;
    this.line = options.line;
  }
}

/** Parse error for YAML/JSON parsing failures */
export class DeclareUIParseError extends DeclareUIError {
  line?: number;
  column?: number;

  constructor(message: string, options?: { line?: number; column?: number }) {
    super(message);
    this.name = 'DeclareUIParseError';
    this.line = options?.line;
    this.column = options?.column;
  }
}
