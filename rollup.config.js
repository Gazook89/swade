import copy from '@guanghechen/rollup-plugin-copy';
import typescript from '@rollup/plugin-typescript';
import * as yaml from 'js-yaml';
import livereload from 'rollup-plugin-livereload';
import styles from 'rollup-plugin-styles';
import { defineConfig } from 'rollup';

const name = 'swade';
const distDirectory = 'dist';
const srcDirectory = 'src';

const staticFiles = ['fonts', 'assets', 'templates', 'cards', 'system.json'];

const isProd = process.env.NODE_ENV === 'production';
const isDev = !isProd;

const banner = `/**
* Author: FloRad
* Content License: All Rights Reserved Pinnacle Entertainment, Inc
* Software License: Apache License, Version 2.0
*/`;

/**
 * this simple plugin displays which environment we're in when rollup starts
 * @param {string} environment - the environment to display
 */
const environment = (environment) => {
  /** @type {import('rollup').PluginContext} */
  const plugin = {
    name: 'environment',
    buildStart() {
      console.log('\x1b[32m%s%s\x1b[0m', 'Environment: ', environment);
    },
  };
  return plugin;
};

export default defineConfig({
  input: { [`${name}`]: `${srcDirectory}/${name}.ts` },
  output: {
    dir: distDirectory,
    format: 'es',
    sourcemap: true,
    assetFileNames: '[name].[ext]',
    banner: banner,
  },
  plugins: [
    environment(process.env.NODE_ENV),
    typescript({ noEmitOnError: isProd }),
    styles({
      mode: ['extract', `${name}.css`],
      url: false,
      sourceMap: true,
      minimize: isProd,
    }),
    copy({
      targets: [
        {
          src: staticFiles.map((f) => `${srcDirectory}/${f}`),
          dest: distDirectory,
        },
        {
          //Convert the template
          src: [`${srcDirectory}/template.yml`],
          dest: distDirectory,
          transform: (content, src, _dst) => {
            return JSON.stringify(
              yaml.load(content.toString(), { filename: src }),
            );
          },
          rename: (name, _ext) => `${name}.json`,
        },
        {
          //Convert the language files
          src: [`${srcDirectory}/lang/*.yml`],
          dest: `${distDirectory}/lang`,
          transform: (content, src, _dst) => {
            return JSON.stringify(
              yaml.load(content.toString(), { filename: src }),
              null,
              2,
            );
          },
          rename: (name, _ext) => `${name}.json`,
        },
      ],
    }),
    isDev && livereload(distDirectory),
  ],
});
