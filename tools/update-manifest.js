import chalk from 'chalk';
import { readFile, writeFile } from 'node:fs/promises';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const manifestPath = 'src/system.json';

const argv = await yargs(hideBin(process.argv))
  .option('systemVersion')
  .option('manifest')
  .option('download')
  .help()
  .parse();

const manifestRaw = await readFile(manifestPath, 'utf-8');
const manifest = JSON.parse(manifestRaw);

const newManifestData = {
  version: getSystemVersion(),
  manifest: argv.manifest ?? manifest.manifest,
  download: argv.download ?? manifest.download,
};

console.log(chalk.blue.bold('Updating system.json with following data:'));
console.table(newManifestData);

manifest.version = newManifestData.systemVersion;
manifest.manifest = newManifestData.manifest;
manifest.download = newManifestData.download;

await writeFile(manifestPath, JSON.stringify(manifest, null, 2), {
  encoding: 'utf-8',
});

function getSystemVersion() {
  const commitSha = process.env.CI_COMMIT_SHORT_SHA;
  const tag = process.env.CI_COMMIT_TAG;
  if (!tag && commitSha) {
    return `${manifest.version}-${commitSha}`;
  } else if (tag) {
    return argv.systemVersion;
  }
  return manifest.version;
}
