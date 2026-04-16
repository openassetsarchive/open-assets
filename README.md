# open-assets

Static public asset catalog for agents, tools, and games.

No auth is required to read the catalog files.

## Start Here

List all packs:

- `https://raw.githubusercontent.com/openassetsarchive/open-assets/main/packs.json`

Search all assets:

- `https://raw.githubusercontent.com/openassetsarchive/open-assets/main/all-assets.json`

Read the catalog manifest:

- `https://raw.githubusercontent.com/openassetsarchive/open-assets/main/manifest.json`

Get one asset by id:

- `https://raw.githubusercontent.com/openassetsarchive/open-assets/main/asset-locations.json`
- then `https://raw.githubusercontent.com/openassetsarchive/open-assets/main/packs/<packId>/details.json`

`asset-locations.json` maps each `assetId` to the pack detail file that contains its full metadata.

## Simplest Search Flow

1. Fetch `all-assets.json`.
2. Filter by `name`, `description`, `tags`, `aliases`, `kind`, and `format`.
3. Return the chosen asset's `publicUrl`.
4. If needed, use `asset-locations.json` to find the pack, then fetch `packs/<packId>/details.json` for more metadata.

The direct URL to use in a project is `publicUrl`.

## Structured Search

If you do not want to load `all-assets.json`, use the static indexes.

Search by tag:

- `https://raw.githubusercontent.com/openassetsarchive/open-assets/main/search/tags/<tag>.json`

Search by kind:

- `https://raw.githubusercontent.com/openassetsarchive/open-assets/main/search/kinds/<kind>.json`

Search by format:

- `https://raw.githubusercontent.com/openassetsarchive/open-assets/main/search/formats/<format>.json`

To search by multiple tags, fetch multiple tag files and intersect their `assetIds`.

Example:

1. fetch `search/tags/pirate.json`
2. fetch `search/tags/stylized.json`
3. fetch `search/kinds/model.json`
4. intersect the returned `assetIds`
5. use `asset-locations.json` to map each `assetId` to its pack
6. fetch `packs/<packId>/details.json`

Supported kinds today:

- `model`
- `sprite`
- `sprite-sheet`
- `tileset`
- `splat`
- `sfx`
- `music`

## Token Search

If you want loose text search instead of structured filtering, use token files:

1. split the query into lowercase words
2. fetch `search/tokens/<token>.json`
3. merge the returned `assetIds`
4. use `asset-locations.json` to map each `assetId` to its pack
5. fetch `packs/<packId>/details.json`

Example token file:

- `https://raw.githubusercontent.com/openassetsarchive/open-assets/main/search/tokens/pirate.json`

## URL Behavior

`publicUrl` points to a GitHub Release asset URL.

These URLs are immutable for a given pack snapshot.

If a pack changes later, the catalog will point to a new versioned release URL. Old versioned URLs remain valid.

## Current Scope

Current priority:

- 3D assets (`.glb`, `.gltf`)
- early 2D sprite and atlas support (`.png` + `.xml`)

Planned next:

- stronger 2D metadata and more pack coverage

The 2D path is intentionally still a fluid WIP. Expect the heuristics and schema to improve as more packs are ingested.

The search flow and `publicUrl` pattern are intended to stay the same across asset types.
