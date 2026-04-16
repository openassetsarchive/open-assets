# open-assets

Static public asset catalog for agents, tools, and games.

No auth is required to read the catalog files.

## Start Here

List all packs:

- `https://raw.githubusercontent.com/openassetsarchive/open-assets/main/packs.json`

Search all assets:

- `https://raw.githubusercontent.com/openassetsarchive/open-assets/main/all-assets.json`

Get one asset by id:

- `https://raw.githubusercontent.com/openassetsarchive/open-assets/main/assets/by-id/<assetId>.json`

## Simplest Search Flow

1. Fetch `all-assets.json`.
2. Filter by `name`, `description`, `tags`, `aliases`, `kind`, and `format`.
3. Return the chosen asset's `publicUrl`.
4. If needed, fetch `assets/by-id/<assetId>.json` for more metadata.

The direct URL to use in a project is `publicUrl`.

## Lower-Bandwidth Search

If you do not want to load `all-assets.json`, use token files:

1. split the query into lowercase words
2. fetch `search/tokens/<token>.json`
3. merge the returned `assetIds`
4. fetch `assets/by-id/<assetId>.json`

Example token file:

- `https://raw.githubusercontent.com/openassetsarchive/open-assets/main/search/tokens/pirate.json`

## URL Behavior

`publicUrl` points to a GitHub Release asset URL.

These URLs are immutable for a given pack snapshot.

If a pack changes later, the catalog will point to a new versioned release URL. Old versioned URLs remain valid.

## Current Scope

Current priority:

- 3D assets (`.glb`, `.gltf`)

Planned next:

- 2D sprites and sprite sheets

The search flow and `publicUrl` pattern are intended to stay the same across asset types.
