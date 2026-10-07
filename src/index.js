#!/usr/bin/env node
const minimist = require('minimist'); const { NFTGalleryMax } = require('./nftgallerymax');
const help = `NFTGalleryMax — build a static gallery from an NFTForger collection

Usage:
  nftgallerymax build --source ./collection-build --output ./gallery [--force]

Serve the result with any static host, for example:
  python3 -m http.server --directory ./gallery 8080`;
async function main() {
  const args = minimist(process.argv.slice(2), { string: ['source','output'], boolean: ['force','help'], alias: { h: 'help' } });
  if (args.help || !args._[0]) { console.log(help); return; }
  if (args._[0] !== 'build' || !args.source || !args.output) throw new GalleryError('build requires --source and --output', 'INPUT');
  console.log(JSON.stringify(await new NFTGalleryMax().build(args.source, args.output, { force: args.force }), null, 2));
}
const { GalleryError } = require('./nftgallerymax');
if (require.main === module) main().catch(error => { console.error(JSON.stringify({ error: error.message, code: error.code || 'INTERNAL' })); process.exitCode = 1; });
module.exports = { main };
