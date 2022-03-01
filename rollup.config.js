/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/naming-convention */
import copy from '@guanghechen/rollup-plugin-copy';
import typescript from '@rollup/plugin-typescript';
import styles from 'rollup-plugin-styles';
import { terser } from 'rollup-plugin-terser';
import livereload from 'rollup-plugin-livereload';
import * as yaml from 'js-yaml';

const name = 'swade';
const distDirectory = 'dist';
const srcDirectory = 'src';

const staticFiles = ['fonts', 'assets', 'templates', 'cards', 'system.json'];

const isProd = process.env.NODE_ENV === 'production';
const isDev = !isProd;

//this simple plugin displays which environment we're in when rollup starts
const envPlugin = () => {
  return {
    name: 'environment',
    buildStart() {
      console.log('\x1b[32m%s%s\x1b[0m', 'Environment: ', process.env.NODE_ENV);
    },
  };
};

/** @type {import('rollup').RollupOptions} */
const config = {
  input: { [`${name}`]: `${srcDirectory}/${name}.ts` },
  output: {
    dir: distDirectory,
    format: 'es',
    sourcemap: true,
    assetFileNames: '[name].[ext]',
  },
  plugins: [
    envPlugin(),
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
          transform: (content, src, _dst) =>
            JSON.stringify(yaml.load(content.toString(), { filename: src })),
          rename: (name, _ext) => `${name}.json`,
        },
        {
          //Convert the language files
          src: [`${srcDirectory}/lang/*.yml`],
          dest: `${distDirectory}/lang`,
          transform: (content, src, _dst) =>
            JSON.stringify(
              yaml.load(content.toString(), { filename: src }),
              null,
              2,
            ),
          rename: (name, _ext) => `${name}.json`,
        },
      ],
    }),
    isDev && livereload(distDirectory),
    isProd && terser({ ecma: 2020, keep_fnames: true, keep_classnames: true }),
  ],
};

export default config;
