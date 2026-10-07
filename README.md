# NFTGalleryMax

[![CI](https://github.com/centxyz/NFTGalleryMax/actions/workflows/ci.yml/badge.svg)](https://github.com/centxyz/NFTGalleryMax/actions/workflows/ci.yml)

NFTGalleryMax turns a verified [NFTForger](https://github.com/centxyz/NFTForger) collection build into a responsive static gallery. It rechecks every source hash, copies only declared collection assets, and emits a site with search, trait filters, sorting, item details, and no backend.

## Build a gallery

```bash
git clone https://github.com/centxyz/NFTGalleryMax.git
cd NFTGalleryMax
npm install

npm start -- build \
  --source ../NFTForger/build \
  --output ./gallery

python3 -m http.server --directory ./gallery 8080
```

The source directory must contain NFTForger's `manifest.json`, `metadata/`, and `images/`. Existing output is protected unless `--force` is explicit, and the completed gallery replaces it atomically.

## Security and deployment

- All manifest hashes are verified before generation.
- Traversal and absolute paths are rejected.
- Metadata is loaded from `gallery.json` and inserted with DOM `textContent`, not `innerHTML`.
- A restrictive Content Security Policy allows only same-origin scripts, styles, images, and data.
- External item links must use HTTPS and open with `noopener noreferrer`.

The generated directory can be deployed to GitHub Pages, IPFS, Netlify, any object store, or an ordinary static server.

## Test

```bash
npm test
```

Tests cover integrity verification, injection-safe output, unsafe paths, atomic replacement, and overwrite protection.

## License

MIT © cent
