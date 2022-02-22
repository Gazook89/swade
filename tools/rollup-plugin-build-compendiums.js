import path from 'node:path';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { load as yamlLoad } from 'js-yaml';
import { existsSync } from 'node:fs';

/**
 * //TODO possibly revisit for watch functionality
 * @param {object} options
 * @param {string} options.src - The source directory which contains a subdirectory per compendium pack
 * @param {string} options.dest - The destination directory
 */
export default function buildCompendiums({ src, dest }) {
  return {
    name: 'build-compendiums',
    async buildStart() {
      //load the subdirectories
      const inputDir = path.resolve(src);
      const packs = await readdir(inputDir);
      for (const pack of packs) {
        //go through each subdirectory
        let dbContentString = '';
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
          dbContentString += JSON.stringify(content);
          dbContentString += '\n';
        }

        //check if the output directory exists, and create it if necessary
        const outputDir = path.resolve(dest);
        if (!existsSync(outputDir)) await mkdir(outputDir);

        //write the contents to the pack file
        await writeFile(
          `${path.resolve(outputDir, pack)}.db`,
          dbContentString,
          { flag: 'w' },
        );
      }
    },
  };
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
