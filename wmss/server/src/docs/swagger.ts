import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const currentDirname = typeof __dirname !== 'undefined'
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url));

const docPath = path.resolve(currentDirname, 'openapi.yaml');
const file = fs.readFileSync(docPath, 'utf8');

export const openApiDocument = YAML.parse(file);
