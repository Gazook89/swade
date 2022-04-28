import chalk from 'chalk';
import { readFile, writeFile } from 'node:fs/promises';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const manifestPath = 'src/system.json';

const argv = await yargs(hideBin(process.argv))
  .option('systemVersion')
  .option('url')
  .option('manifest')
  .option('download')
  .help()
  .parse();

const manifestRaw = await readFile(manifestPath, 'utf-8');
const manifest = JSON.parse(manifestRaw);

console.log(chalk.blue.bold('Updating system.json with following data:'));
console.table({
  version: argv.systemVersion,
  url: argv.url,
  manifest: argv.manifest,
  download: argv.download,
});

manifest.version = argv.systemVersion ?? manifest.version;
manifest.url = argv.url ?? manifest.url;
manifest.manifest = argv.manifest ?? manifest.manifest;
manifest.download = argv.download ?? manifest.manifest;

await writeFile(manifestPath, JSON.stringify(manifest, null, 2), {
  encoding: 'utf-8',
});
