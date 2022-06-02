/* eslint-disable @typescript-eslint/no-unused-vars */
import path from 'node:path';
import * as yaml from 'js-yaml';
import { readdir, readFile, writeFile } from 'node:fs/promises';

const src = 'src/lang';

const inputDir = path.resolve(src);
const languages = await readdir(inputDir);
for (const lang of languages) {
  const filePath = path.resolve(src, lang);
  const file = await readFile(filePath, 'utf-8');
  const content = yaml.load(file);
  const data = expandObject(content);
  //await exportAsJSON(data, filePath);
  await exportAsYAML(data, filePath);
}

async function exportAsJSON(data, filePath) {
  const output = JSON.stringify(data, null, 2);
  await writeFile(filePath.replace('yml', 'json'), output, {
    encoding: 'utf-8',
    flag: 'w',
  });
}

async function exportAsYAML(data, filePath) {
  const output = yaml.dump(data, { indent: 2, lineWidth: 1000 });
  await writeFile(filePath, output, {
    encoding: 'utf-8',
    flag: 'w',
  });
}

/**
 * Expand a flattened object to be a standard multi-dimensional nested Object by converting all dot-notation keys to
 * inner objects.
 *
 * @param {object} obj      The object to expand
 * @param {Number} [_d=0]   Track the recursion depth to prevent overflow
 * @return {object}         An expanded object
 */
function expandObject(obj, _d = 0) {
  const expanded = {};
  if (_d > 100) {
    throw new Error('Maximum depth exceeded');
  }
  for (let [k, v] of Object.entries(obj)) {
    if (v instanceof Object && !Array.isArray(v)) v = expandObject(v, _d + 1);
    setProperty(expanded, k, v);
  }
  return expanded;
}

/**
 * A helper function which searches through an object to assign a value using a string key
 * This string key supports the notation a.b.c which would target object[a][b][c]
 * @param {object} object   The object to update
 * @param {string} key      The string key
 * @param {*} value         The value to be assigned
 * @return {boolean}        Whether the value was changed from its previous value
 */
function setProperty(object, key, value) {
  let target = object;
  let changed = false;

  // Convert the key to an object reference if it contains dot notation
  if (key.indexOf('.') !== -1) {
    let parts = key.split('.');
    key = parts.pop();
    target = parts.reduce((o, i) => {
      if (!o.hasOwnProperty(i)) o[i] = {};
      return o[i];
    }, object);
  }

  // Update the target
  if (target[key] !== value) {
    changed = true;
    target[key] = value;
  }

  // Return changed status
  return changed;
}
