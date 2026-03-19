/**
 * YAML parser wrapper for DeclareUI component files.
 */

import yaml from 'js-yaml';
import { readFileSync } from 'node:fs';
import { DeclareUIParseError } from '../errors.js';
import type { RawComponent } from '../validator/schema.js';

/**
 * Parse a YAML string into a raw component object.
 *
 * @param source - YAML string content
 * @returns Parsed raw component object
 * @throws DeclareUIParseError on invalid YAML
 */
export function parseComponent(source: string): RawComponent {
  try {
    const result = yaml.load(source);
    if (typeof result !== 'object' || result === null) {
      throw new DeclareUIParseError('YAML must contain a mapping (object) at the top level');
    }
    return result as RawComponent;
  } catch (error) {
    if (error instanceof DeclareUIParseError) {
      throw error;
    }
    if (error instanceof yaml.YAMLException) {
      throw new DeclareUIParseError(
        `YAML parse error: ${error.message}`,
        { line: error.mark?.line, column: error.mark?.column },
      );
    }
    throw new DeclareUIParseError(`Unexpected parse error: ${String(error)}`);
  }
}

/**
 * Parse a .ui.yaml file from disk.
 *
 * @param filePath - Path to the .ui.yaml file
 * @returns Parsed raw component object
 * @throws DeclareUIParseError on read or parse failure
 */
export function parseComponentFile(filePath: string): RawComponent {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return parseComponent(content);
  } catch (error) {
    if (error instanceof DeclareUIParseError) {
      throw error;
    }
    throw new DeclareUIParseError(`Failed to read file: ${filePath}`);
  }
}
