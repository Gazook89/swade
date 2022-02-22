import path from 'node:path';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { load as yamlLoad } from 'js-yaml';
import { existsSync, readdirSync } from 'node:fs';

/**
 * //TODO possibly revisit for watch functionality
 * @param {object} options
 * @param {string} options.src - The source directory which contains a subdirectory per compendium pack
 * @param {string} options.dest - The destination directory
 * @returns {rollup.Plugin}
 */
export default function buildCompendiums({ src, dest }) {
  /** @type {import('rollup').Plugin} */
  const plugin = {
    name: 'build-compendiums',
    load() {
      getFiles(src).forEach((file) => this.addWatchFile(file));
    },
    async generateBundle() {
      //load the subdirectories
      const inputDir = path.resolve(src);
      const packs = await readdir(inputDir);
      //go through each subdirectory
      for (const pack of packs) {
        console.log(`Building pack ${pack}`);
        let packData = '';
        const packPath = path.resolve(inputDir, pack);
        const entries = await readdir(packPath);
        //read each file in a subdirectory and push it into the array
        for (const entry of entries) {
          const entryPath = path.resolve(packPath, entry);
          //load the YAML
          const file = await readFile(entryPath, 'utf-8');
          const content = yamlLoad(file, { filename: entry });
          //add ID if necessary
          if (!content._id) content._id = makeid();
          //add it to the complete DB string
          packData += JSON.stringify(content);
          packData += '\n';
        }

        //check if the output directory exists, and create it if necessary
        const outputDir = path.resolve(dest);
        if (!existsSync(outputDir)) await mkdir(outputDir, { recursive: true });

        //write the contents to the pack file
        const outputPath = path.resolve(outputDir, pack);
        await writeFile(`${outputPath}.db`, packData, { flag: 'w' });
      }
    },
  };
  return plugin;
}

function makeid(length = 16) {
  var result = '';
  var characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

/**
 * Recursively reads a directory to get all filepaths in that directory
 * @param {string} dir - The path to the directory that should be explored
 * @returns {Array<string>} a list of filepaths
 */
function getFiles(dir) {
  const subdirs = readdirSync(dir, { withFileTypes: true });
  const files = subdirs.map((subdir) => {
    const res = path.resolve(dir, subdir.name);
    return subdir.isDirectory() ? getFiles(res) : res;
  });
  return files.reduce((a, f) => a.concat(f), []);
}
