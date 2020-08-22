/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const gulp = require('gulp');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const archiver = require('archiver');
const stringify = require('json-stringify-pretty-compact');
const typescript = require('typescript');
const mergeStream = require('merge-stream');
const through2 = require('through2');

const ts = require('gulp-typescript');
const less = require('gulp-less');
const sass = require('gulp-sass');
const git = require('gulp-git');
const gyaml = require('gulp-yaml');
const debug = require('gulp-debug');
const concat = require('gulp-concat');
const rename = require('gulp-rename');

const argv = require('yargs').argv;

sass.compiler = require('sass');

function getConfig() {
  const configPath = path.resolve(process.cwd(), 'foundryconfig.json');
  let config;

  if (fs.existsSync(configPath)) {
    config = fs.readJSONSync(configPath);
    return config;
  } else {
    return;
  }
}

function getManifest() {
  const json = {};

  if (fs.existsSync('src')) {
    json.root = 'src';
  } else {
    json.root = 'dist';
  }

  const modulePath = path.join(json.root, 'module.yml');
  const systemPath = path.join(json.root, 'system.yml');

  if (fs.existsSync(modulePath)) {
    json.file = fs.readJSONSync(modulePath);
    json.name = 'module.yml';
  } else if (fs.existsSync(systemPath)) {
    json.file = fs.readJSONSync(systemPath);
    json.name = 'system.yml';
  } else {
    return;
  }

  return json;
}

/**
 * TypeScript transformers
 * @returns {typescript.TransformerFactory<typescript.SourceFile>}
 */
function createTransformer() {
  /**
   * @param {typescript.Node} node
   */
  function shouldMutateModuleSpecifier(node) {
    if (
      !typescript.isImportDeclaration(node) &&
      !typescript.isExportDeclaration(node)
    )
      return false;
    if (node.moduleSpecifier === undefined) return false;
    if (!typescript.isStringLiteral(node.moduleSpecifier)) return false;
    if (
      !node.moduleSpecifier.text.startsWith('./') &&
      !node.moduleSpecifier.text.startsWith('../')
    )
      return false;
    if (path.extname(node.moduleSpecifier.text) !== '') return false;
    return true;
  }

  /**
   * Transforms import/export declarations to append `.js` extension
   * @param {typescript.TransformationContext} context
   */
  function importTransformer(context) {
    return (node) => {
      /**
       * @param {typescript.Node} node
       */
      function visitor(node) {
        if (shouldMutateModuleSpecifier(node)) {
          if (typescript.isImportDeclaration(node)) {
            const newModuleSpecifier = typescript.createLiteral(
              `${node.moduleSpecifier.text}.js`,
            );
            return typescript.updateImportDeclaration(
              node,
              node.decorators,
              node.modifiers,
              node.importClause,
              newModuleSpecifier,
            );
          } else if (typescript.isExportDeclaration(node)) {
            const newModuleSpecifier = typescript.createLiteral(
              `${node.moduleSpecifier.text}.js`,
            );
            return typescript.updateExportDeclaration(
              node,
              node.decorators,
              node.modifiers,
              node.exportClause,
              newModuleSpecifier,
            );
          }
        }
        return typescript.visitEachChild(node, visitor, context);
      }

      return typescript.visitNode(node, visitor);
    };
  }

  return importTransformer;
}

const tsConfig = ts.createProject('tsconfig.json', {
  getCustomTransformers: (_program) => ({
    after: [createTransformer()],
  }),
});

/********************/
/*		BUILD		*/
/********************/

/**
 * Build TypeScript
 */
function buildTS() {
  return gulp.src('src/**/*.ts').pipe(tsConfig()).pipe(gulp.dest('dist'));
}

/**
 * Build YAML to json
 */
function buildYaml() {
  return gulp
    .src(['src/**/*.yml', '!src/packs/**/*.yml'])
    .pipe(gyaml({ space: 2, safe: true }))
    .pipe(gulp.dest('dist'));
}

/**
 * Build Less
 */
function buildLess() {
  return gulp.src('src/*.less').pipe(less()).pipe(gulp.dest('dist'));
}

/**
 * Build SASS
 */
function buildSASS() {
  return gulp
    .src('src/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('dist'));
}

/**
 * Build Compendiums
 */
function buildPack() {
  const packFolders = fs.readdirSync('src/packs/').filter(function (file) {
    return fs.statSync(path.join('src/packs', file)).isDirectory();
  });
  function makeid(length) {
    var result = '';
    var characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  var packs = packFolders.map(function (folder) {
    return gulp
      .src(path.join('src/packs/', folder, '/**/*.yml'))
      .pipe(
        through2.obj((file, enc, cb) => {
          file.contents = Buffer.concat([
            Buffer.from(`_id: ${makeid(16)}\n`),
            file.contents,
          ]);
          cb(null, file);
        }),
      )
      .pipe(gyaml({ space: 0, safe: true, json: true }))
      .pipe(concat(folder + '.json'))
      .pipe(rename(folder + '.db'))
      .pipe(gulp.dest('dist/packs'));
  });
  return mergeStream.call(null, packs);
}

/**
 * Copy static files
 */
async function copyFiles() {
  const statics = [
    'fonts',
    'assets',
    'templates',
    'module.json',
    'system.json',
    'template.json',
  ];
  try {
    for (const file of statics) {
      if (fs.existsSync(path.join('src', file))) {
        await fs.copy(path.join('src', file), path.join('dist', file));
      }
    }
    return Promise.resolve();
  } catch (err) {
    Promise.reject(err);
  }
}

/**
 * Watch for changes for each build step
 */
function buildWatch() {
  gulp.watch('src/**/*.ts', { ignoreInitial: false }, buildTS);
  gulp.watch('src/**/*.less', { ignoreInitial: false }, buildLess);
  gulp.watch('src/**/*.scss', { ignoreInitial: false }, buildSASS);
  gulp.watch(
    ['src/**/*.yml', '!src/packs/**/*.yml'],
    { ignoreInitial: false },
    buildYaml,
  );
  gulp.watch(
    ['src/fonts', 'src/templates', 'src/packs', 'src/assets'],
    { ignoreInitial: false },
    copyFiles,
  );
}

/********************/
/*		CLEAN		*/
/********************/

/**
 * Remove built files from `dist` folder
 * while ignoring source files
 */
async function clean() {
  const name = path.basename(path.resolve('.'));
  const files = [];

  // If the project uses TypeScript
  if (fs.existsSync(path.join('src', `${name}.ts`))) {
    files.push(
      'lang',
      'templates',
      'assets',
      'module',
      'interfaces',
      `${name}.js`,
      'module.json',
      'system.json',
      'template.json',
    );
  }

  // If the project uses Less or SASS
  if (
    fs.existsSync(path.join('src', `${name}.less`)) ||
    fs.existsSync(path.join('src', `${name}.scss`))
  ) {
    files.push('fonts', `${name}.css`);
  }

  console.log(' ', chalk.yellow('Files to clean:'));
  console.log('   ', chalk.blueBright(files.join('\n    ')));

  // Attempt to remove the files
  try {
    for (const filePath of files) {
      await fs.remove(path.join('dist', filePath));
    }
    return Promise.resolve();
  } catch (err) {
    Promise.reject(err);
  }
}

/********************/
/*		LINK		*/
/********************/

/**
 * Link build to User Data folder
 */
async function linkUserData() {
  const name = path.basename(path.resolve('.'));
  const config = fs.readJSONSync('foundryconfig.json');

  let destDir;
  try {
    if (
      fs.existsSync(path.resolve('.', 'dist', 'module.yml')) ||
      fs.existsSync(path.resolve('.', 'src', 'module.yml'))
    ) {
      destDir = 'modules';
    } else if (
      fs.existsSync(path.resolve('.', 'dist', 'system.yml')) ||
      fs.existsSync(path.resolve('.', 'src', 'system.yml'))
    ) {
      destDir = 'systems';
    } else {
      throw Error(
        `Could not find ${chalk.blueBright('module.yml')} or ${chalk.blueBright(
          'system.yml',
        )}`,
      );
    }

    let linkDir;
    if (config.dataPath) {
      if (!fs.existsSync(path.join(config.dataPath, 'Data')))
        throw Error('User Data path invalid, no Data directory found');

      linkDir = path.join(config.dataPath, 'Data', destDir, name);
    } else {
      throw Error('No User Data path defined in foundryconfig.json');
    }

    if (argv.clean || argv.c) {
      console.log(
        chalk.yellow(`Removing build in ${chalk.blueBright(linkDir)}`),
      );

      await fs.remove(linkDir);
    } else if (!fs.existsSync(linkDir)) {
      console.log(chalk.green(`Copying build to ${chalk.blueBright(linkDir)}`));
      await fs.symlink(path.resolve('./dist'), linkDir);
    }
    return Promise.resolve();
  } catch (err) {
    Promise.reject(err);
  }
}

/*********************/
/*		PACKAGE		 */
/*********************/

/**
 * Package build
 */
async function packageBuild() {
  const manifest = getManifest();

  return new Promise((resolve, reject) => {
    try {
      // Remove the package dir without doing anything else
      if (argv.clean || argv.c) {
        console.log(chalk.yellow('Removing all packaged files'));
        fs.removeSync('package');
        return;
      }

      // Ensure there is a directory to hold all the packaged versions
      fs.ensureDirSync('package');

      // Initialize the zip file
      const zipName = `${manifest.file.name}-v${manifest.file.version}.zip`;
      const zipFile = fs.createWriteStream(path.join('package', zipName));
      const zip = archiver('zip', { zlib: { level: 9 } });

      zipFile.on('close', () => {
        console.log(chalk.green(zip.pointer() + ' total bytes'));
        console.log(chalk.green(`Zip file ${zipName} has been written`));
        return resolve();
      });

      zip.on('error', (err) => {
        throw err;
      });

      zip.pipe(zipFile);

      // Add the directory with the final code
      zip.directory('dist/', manifest.file.name);

      zip.finalize();
    } catch (err) {
      return reject(err);
    }
  });
}

/*********************/
/*		PACKAGE		 */
/*********************/

/**
 * Update version and URLs in the manifest JSON
 */
function updateManifest(cb) {
  const packageJson = fs.readJSONSync('package.json');
  const config = getConfig(),
    manifest = getManifest(),
    rawURL = config.rawURL,
    repoURL = config.repository,
    manifestRoot = manifest.root;

  if (!config) cb(Error(chalk.red('foundryconfig.json not found')));
  if (!manifest) cb(Error(chalk.red('Manifest JSON not found')));
  if (!rawURL || !repoURL)
    cb(
      Error(chalk.red('Repository URLs not configured in foundryconfig.json')),
    );

  try {
    const version = argv.update || argv.u;

    /* Update version */

    const versionMatch = /^(\d{1,}).(\d{1,}).(\d{1,})$/;
    const currentVersion = manifest.file.version;
    let targetVersion = '';

    if (!version) {
      cb(Error('Missing version number'));
    }

    if (versionMatch.test(version)) {
      targetVersion = version;
    } else {
      targetVersion = currentVersion.replace(
        versionMatch,
        (substring, major, minor, patch) => {
          console.log(
            substring,
            Number(major) + 1,
            Number(minor) + 1,
            Number(patch) + 1,
          );
          if (version === 'major') {
            return `${Number(major) + 1}.0.0`;
          } else if (version === 'minor') {
            return `${major}.${Number(minor) + 1}.0`;
          } else if (version === 'patch') {
            return `${major}.${minor}.${Number(patch) + 1}`;
          } else {
            return '';
          }
        },
      );
    }

    if (targetVersion === '') {
      return cb(Error(chalk.red('Error: Incorrect version arguments.')));
    }

    if (targetVersion === currentVersion) {
      return cb(
        Error(
          chalk.red('Error: Target version is identical to current version.'),
        ),
      );
    }
    console.log(`Updating version number to '${targetVersion}'`);

    packageJson.version = targetVersion;
    manifest.file.version = targetVersion;

    /* Update URLs */

    const result = `${rawURL}/v${manifest.file.version}/package/${manifest.file.name}-v${manifest.file.version}.zip`;

    manifest.file.url = repoURL;
    manifest.file.manifest = `${rawURL}/master/${manifestRoot}/${manifest.name}`;
    manifest.file.download = result;

    const prettyProjectJson = stringify(manifest.file, {
      maxLength: 35,
      indent: '\t',
    });

    fs.writeJSONSync('package.json', packageJson, { spaces: '\t' });
    fs.writeFileSync(
      path.join(manifest.root, manifest.name),
      prettyProjectJson,
      'utf8',
    );

    return cb();
  } catch (err) {
    cb(err);
  }
}

function gitAdd() {
  return gulp.src('package').pipe(git.add({ args: '--no-all' }));
}

function gitCommit() {
  return gulp.src('./*').pipe(
    git.commit(`v${getManifest().file.version}`, {
      args: '-a',
      disableAppendPaths: true,
    }),
  );
}

function gitTag() {
  const manifest = getManifest();
  return git.tag(
    `v${manifest.file.version}`,
    `Updated to ${manifest.file.version}`,
    (err) => {
      if (err) throw err;
    },
  );
}

const execGit = gulp.series(gitAdd, gitCommit, gitTag);

const execBuild = gulp.parallel(
  buildTS,
  buildLess,
  buildSASS,
  buildYaml,
  copyFiles,
  buildPack,
);

exports.build = gulp.series(clean, execBuild);
exports.watch = buildWatch;
exports.clean = clean;
exports.link = linkUserData;
exports.package = packageBuild;
exports.update = updateManifest;
exports.publish = gulp.series(
  clean,
  updateManifest,
  execBuild,
  packageBuild,
  execGit,
);
