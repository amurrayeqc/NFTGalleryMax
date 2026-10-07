const { createHash, randomBytes } = require('node:crypto');
const { mkdir, readFile, rename, rm, stat, writeFile, copyFile } = require('node:fs/promises');
const { dirname, isAbsolute, join, normalize, relative, resolve, sep } = require('node:path');

class GalleryError extends Error { constructor(message, code = 'GALLERY_ERROR') { super(message); this.name = 'GalleryError'; this.code = code; } }
async function sha256(path) { const hash = createHash('sha256'); hash.update(await readFile(path)); return hash.digest('hex'); }
function safeRelative(value) {
  if (typeof value !== 'string' || !value || isAbsolute(value)) throw new GalleryError(`Unsafe path: ${value}`, 'UNSAFE_PATH');
  const cleaned = normalize(value); if (cleaned === '..' || cleaned.startsWith(`..${sep}`)) throw new GalleryError(`Unsafe path: ${value}`, 'UNSAFE_PATH'); return cleaned;
}
async function exists(path) { try { await stat(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } }

class NFTGalleryMax {
  constructor({ templateDir = join(__dirname, 'site') } = {}) { this.templateDir = templateDir; }

  async build(sourceDir, outputDir, { force = false } = {}) {
    sourceDir = resolve(sourceDir); outputDir = resolve(outputDir);
    if (sourceDir === outputDir || outputDir.startsWith(`${sourceDir}${sep}`)) throw new GalleryError('Output must be outside the source collection', 'INVALID_OUTPUT');
    if (await exists(outputDir) && !force) throw new GalleryError(`Output already exists: ${outputDir}; pass --force to replace it`, 'OUTPUT_EXISTS');
    const manifest = await this.loadManifest(sourceDir); await this.verifyManifest(sourceDir, manifest);
    const staging = `${outputDir}.${process.pid}.${randomBytes(5).toString('hex')}.tmp`;
    try {
      await mkdir(join(staging, 'assets'), { recursive: true });
      const items = [];
      for (const token of [...manifest.tokens].sort((a, b) => Number(a.token_id) - Number(b.token_id))) {
        const metadataPath = safeRelative(token.metadata); const imagePath = safeRelative(token.image);
        const metadata = JSON.parse(await readFile(join(sourceDir, metadataPath), 'utf8'));
        if (!metadata || typeof metadata.name !== 'string' || !metadata.name.trim() || !Array.isArray(metadata.attributes)) throw new GalleryError(`Invalid metadata for token ${token.token_id}`, 'INVALID_METADATA');
        const assetRelative = relative('images', imagePath); if (assetRelative.startsWith('..')) throw new GalleryError(`Token ${token.token_id} image is outside images/`, 'UNSAFE_PATH');
        const destination = join(staging, 'assets', assetRelative); await mkdir(dirname(destination), { recursive: true }); await copyFile(join(sourceDir, imagePath), destination);
        items.push({ tokenId: token.token_id, name: metadata.name, description: typeof metadata.description === 'string' ? metadata.description : '', image: `assets/${assetRelative.split(sep).join('/')}`, attributes: metadata.attributes.map(attr => ({ trait_type: String(attr.trait_type), value: attr.value })), ...(metadata.external_url ? { externalUrl: String(metadata.external_url) } : {}) });
      }
      const gallery = { schema: 1, collection: manifest.collection, items };
      await writeFile(join(staging, 'gallery.json'), `${JSON.stringify(gallery, null, 2)}\n`);
      for (const name of ['index.html', 'styles.css', 'app.js']) await copyFile(join(this.templateDir, name), join(staging, name));
      if (await exists(outputDir)) await rm(outputDir, { recursive: true });
      await rename(staging, outputDir);
      return { output: outputDir, collection: manifest.collection.name, items: items.length, gallerySha256: await sha256(join(outputDir, 'gallery.json')) };
    } catch (error) { await rm(staging, { recursive: true, force: true }); throw error; }
  }

  async loadManifest(sourceDir) {
    try { const manifest = JSON.parse(await readFile(join(sourceDir, 'manifest.json'), 'utf8')); if (manifest.schema !== 1 || !manifest.collection || !Array.isArray(manifest.tokens) || !manifest.files) throw new Error('unsupported schema'); return manifest; }
    catch (error) { throw new GalleryError(`Unable to load NFTForger manifest: ${error.message}`, 'INVALID_MANIFEST'); }
  }

  async verifyManifest(sourceDir, manifest) {
    const failures = [];
    for (const [name, expected] of Object.entries(manifest.files)) {
      let path; try { path = join(sourceDir, safeRelative(name)); } catch (error) { failures.push({ file: name, error: error.message }); continue; }
      if (!(await exists(path))) failures.push({ file: name, error: 'missing' }); else if (await sha256(path) !== expected) failures.push({ file: name, error: 'hash mismatch' });
    }
    if (failures.length) throw new GalleryError(`Collection integrity check failed: ${JSON.stringify(failures)}`, 'INTEGRITY');
    return true;
  }
}

module.exports = { NFTGalleryMax, GalleryError, safeRelative, sha256 };
