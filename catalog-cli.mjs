#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const DEFAULT_REMOTE_BASE = 'https://raw.githubusercontent.com/openassetsarchive/open-assets/main'
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))

function printUsage() {
  console.log(`Usage: node catalog-cli.mjs <command> [options]

Portable CLI for the public open-assets catalog.

Commands:
  search <query?>        Search compact asset summaries
  get-asset <assetId>    Get one asset by id
  get-pack <packId>      Get one pack by id

Options:
  --catalog-root <dir>   Read a local catalog directory instead of using the script directory
  --base <url>           Read from a raw GitHub-style HTTP base instead of local files
  --help                 Show this help

search options:
  --query <text>         Optional loose text query
  --tag <tag>            Require tag. Repeatable
  --any-tag <tag>        Match at least one tag. Repeatable
  --not-tag <tag>        Exclude tag. Repeatable
  --kind <kind>          Require kind. Repeatable
  --format <format>      Require format. Repeatable
  --pack <packId>        Require pack. Repeatable
  --license <text>       Require license. Repeatable
  --animated             Require animated assets
  --rigged               Require rigged assets
  --limit <n>            Result count. Defaults to 10
  --ids-only             Only return asset ids

get-asset options:
  --summary              Return compact summary from all-assets.json
  --expanded             Return expanded detail from details-expanded.json

get-pack options:
  --assets               Include compact per-pack asset list
  --expanded-assets      Include expanded per-pack asset list
  --details              Include compact per-pack detail bundle
  --expanded-details     Include expanded per-pack detail bundle
  --asset-limit <n>      Cap pack asset arrays when using --assets or --expanded-assets

Examples:
  node catalog-cli.mjs search --tag pirate --kind model --limit 5
  node catalog-cli.mjs search "pirate realistic" --kind model --not-tag stylized
  node catalog-cli.mjs get-asset quaternius-pirate-kit-characters-captain-barbarossa
  node catalog-cli.mjs get-pack kenney-new-platformer-pack --assets --asset-limit 20

If this script is next to manifest.json and all-assets.json, it reads the local repo files directly.
Otherwise it falls back to ${DEFAULT_REMOTE_BASE}
`)
}

function resolvePath(value, fallback) {
  const target = value ?? fallback
  return path.isAbsolute(target) ? target : path.resolve(process.cwd(), target)
}

function toSlug(value) {
  return String(value ?? '').trim().toLowerCase()
}

function tokenize(value) {
  return Array.from(
    new Set(
      String(value ?? '')
        .toLowerCase()
        .match(/[a-z0-9]+/g) ?? [],
    ),
  )
}

function normalizeBase(base) {
  return String(base ?? DEFAULT_REMOTE_BASE).replace(/\/+$/g, '')
}

function parseBooleanFlag(value, flag) {
  if (value === undefined) {
    return true
  }

  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  throw new Error(`Expected true/false for ${flag}, received: ${value}`)
}

function pushOption(options, key, value, transform = (input) => input) {
  const list = options[key] ?? []
  list.push(transform(value))
  options[key] = list
}

function uniqueSorted(values) {
  return Array.from(new Set(values)).sort((left, right) => String(left).localeCompare(String(right)))
}

function parseArgs(argv) {
  const options = {
    command: null,
    positionals: [],
    catalogRoot: null,
    base: null,
    query: null,
    tagsAll: [],
    tagsAny: [],
    tagsNot: [],
    kinds: [],
    formats: [],
    packs: [],
    licenses: [],
    animated: null,
    rigged: null,
    limit: 10,
    idsOnly: false,
    assetLimit: null,
    summary: false,
    expanded: false,
    assets: false,
    expandedAssets: false,
    details: false,
    expandedDetails: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--') {
      continue
    }

    if (arg === '--help' || arg === '-h') {
      printUsage()
      process.exit(0)
    }

    if (!options.command && !arg.startsWith('-')) {
      options.command = arg
      continue
    }

    const nextValue = argv[index + 1]

    switch (arg) {
      case '--catalog-root':
        options.catalogRoot = resolvePath(nextValue)
        index += 1
        break
      case '--base':
        options.base = normalizeBase(nextValue)
        index += 1
        break
      case '--query':
        options.query = nextValue
        index += 1
        break
      case '--tag':
        pushOption(options, 'tagsAll', nextValue, toSlug)
        index += 1
        break
      case '--any-tag':
        pushOption(options, 'tagsAny', nextValue, toSlug)
        index += 1
        break
      case '--not-tag':
        pushOption(options, 'tagsNot', nextValue, toSlug)
        index += 1
        break
      case '--kind':
        pushOption(options, 'kinds', nextValue, toSlug)
        index += 1
        break
      case '--format':
        pushOption(options, 'formats', nextValue, toSlug)
        index += 1
        break
      case '--pack':
        pushOption(options, 'packs', nextValue, toSlug)
        index += 1
        break
      case '--license':
        pushOption(options, 'licenses', nextValue, toSlug)
        index += 1
        break
      case '--animated':
        options.animated = parseBooleanFlag(nextValue?.startsWith('-') || nextValue === undefined ? undefined : nextValue, '--animated')
        if (nextValue && !nextValue.startsWith('-')) {
          index += 1
        }
        break
      case '--rigged':
        options.rigged = parseBooleanFlag(nextValue?.startsWith('-') || nextValue === undefined ? undefined : nextValue, '--rigged')
        if (nextValue && !nextValue.startsWith('-')) {
          index += 1
        }
        break
      case '--limit':
        options.limit = Number.parseInt(nextValue, 10)
        index += 1
        break
      case '--ids-only':
        options.idsOnly = true
        break
      case '--asset-limit':
        options.assetLimit = Number.parseInt(nextValue, 10)
        index += 1
        break
      case '--summary':
        options.summary = true
        break
      case '--expanded':
        options.expanded = true
        break
      case '--assets':
        options.assets = true
        break
      case '--expanded-assets':
        options.expandedAssets = true
        break
      case '--details':
        options.details = true
        break
      case '--expanded-details':
        options.expandedDetails = true
        break
      default:
        if (arg.startsWith('-')) {
          throw new Error(`Unknown argument: ${arg}`)
        }
        options.positionals.push(arg)
        break
    }
  }

  if (!options.command) {
    throw new Error('Missing command. Use search, get-asset, or get-pack.')
  }

  if (options.command === 'search' && !options.query && options.positionals.length > 0) {
    options.query = options.positionals.join(' ')
    options.positionals = []
  }

  if (!Number.isFinite(options.limit) || options.limit <= 0) {
    throw new Error(`Invalid --limit value: ${options.limit}`)
  }

  if (options.assetLimit !== null && (!Number.isFinite(options.assetLimit) || options.assetLimit <= 0)) {
    throw new Error(`Invalid --asset-limit value: ${options.assetLimit}`)
  }

  options.tagsAll = uniqueSorted(options.tagsAll)
  options.tagsAny = uniqueSorted(options.tagsAny)
  options.tagsNot = uniqueSorted(options.tagsNot)
  options.kinds = uniqueSorted(options.kinds)
  options.formats = uniqueSorted(options.formats)
  options.packs = uniqueSorted(options.packs)
  options.licenses = uniqueSorted(options.licenses)
  return options
}

async function exists(absolutePath) {
  try {
    await fs.access(absolutePath)
    return true
  } catch {
    return false
  }
}

async function detectSource(options) {
  if (options.catalogRoot) {
    return {
      mode: 'local',
      label: options.catalogRoot,
      root: options.catalogRoot,
    }
  }

  if (options.base) {
    return {
      mode: 'remote',
      label: options.base,
      base: normalizeBase(options.base),
    }
  }

  const localManifestPath = path.join(SCRIPT_DIR, 'manifest.json')
  const localAssetsPath = path.join(SCRIPT_DIR, 'all-assets.json')

  if ((await exists(localManifestPath)) && (await exists(localAssetsPath))) {
    return {
      mode: 'local',
      label: SCRIPT_DIR,
      root: SCRIPT_DIR,
    }
  }

  return {
    mode: 'remote',
    label: DEFAULT_REMOTE_BASE,
    base: DEFAULT_REMOTE_BASE,
  }
}

async function readJsonFromLocal(root, relativePath) {
  const absolutePath = path.join(root, relativePath)
  const text = await fs.readFile(absolutePath, 'utf8')
  return JSON.parse(text)
}

async function readJsonFromRemote(base, relativePath) {
  const url = `${normalizeBase(base)}/${relativePath.replace(/^\/+/g, '')}`
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
      'User-Agent': 'open-assets-public-cli',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

async function loadCatalogJson(source, relativePath) {
  return source.mode === 'local'
    ? readJsonFromLocal(source.root, relativePath)
    : readJsonFromRemote(source.base, relativePath)
}

function matchesFilterSet(values, required) {
  if (required.length === 0) {
    return true
  }

  const set = new Set((values ?? []).map(toSlug))
  return required.every((value) => set.has(value))
}

function matchesAnyFilter(values, allowed) {
  if (allowed.length === 0) {
    return true
  }

  const set = new Set((values ?? []).map(toSlug))
  return allowed.some((value) => set.has(value))
}

function matchesNoneFilter(values, blocked) {
  if (blocked.length === 0) {
    return true
  }

  const set = new Set((values ?? []).map(toSlug))
  return blocked.every((value) => !set.has(value))
}

function filterAsset(asset, options) {
  const tags = (asset.tags ?? []).map(toSlug)
  const kinds = [toSlug(asset.kind)]
  const formats = [toSlug(asset.format)]
  const packs = [toSlug(asset.packId)]
  const licenses = [toSlug(asset.license)]

  if (!matchesFilterSet(tags, options.tagsAll)) {
    return false
  }

  if (!matchesAnyFilter(tags, options.tagsAny)) {
    return false
  }

  if (!matchesNoneFilter(tags, options.tagsNot)) {
    return false
  }

  if (!matchesAnyFilter(kinds, options.kinds)) {
    return false
  }

  if (!matchesAnyFilter(formats, options.formats)) {
    return false
  }

  if (!matchesAnyFilter(packs, options.packs)) {
    return false
  }

  if (!matchesAnyFilter(licenses, options.licenses)) {
    return false
  }

  if (options.animated !== null && Boolean(asset.animated) !== options.animated) {
    return false
  }

  if (options.rigged !== null && Boolean(asset.rigged) !== options.rigged) {
    return false
  }

  return true
}

function scoreAsset(asset, options) {
  const query = String(options.query ?? '').trim().toLowerCase()
  const terms = tokenize(query)
  const tags = (asset.tags ?? []).map(toSlug)
  const aliases = (asset.aliases ?? []).map(toSlug)
  const name = String(asset.name ?? '').toLowerCase()
  const description = String(asset.description ?? '').toLowerCase()
  const packName = String(asset.packName ?? '').toLowerCase()
  const id = String(asset.id ?? '').toLowerCase()
  const reasons = []
  let score = 0
  let matchedQueryTerms = 0

  if (options.tagsAll.length > 0) {
    reasons.push(`required tags: ${options.tagsAll.join(', ')}`)
    score += options.tagsAll.length * 4
  }

  if (query.length > 0 && name.includes(query)) {
    score += 40
    reasons.push(`name contains "${query}"`)
  }

  for (const term of terms) {
    let matched = false

    if (tags.includes(term)) {
      score += 18
      matched = true
    }

    if (aliases.includes(term)) {
      score += 16
      matched = true
    }

    if (tokenize(name).includes(term)) {
      score += 14
      matched = true
    } else if (name.includes(term)) {
      score += 10
      matched = true
    }

    if (id.includes(term)) {
      score += 8
      matched = true
    }

    if (description.includes(term)) {
      score += 6
      matched = true
    }

    if (packName.includes(term)) {
      score += 4
      matched = true
    }

    if (matched) {
      matchedQueryTerms += 1
    }
  }

  if (options.query && terms.length > 0 && matchedQueryTerms === 0) {
    return null
  }

  if (options.tagsAny.length > 0) {
    const matchedAnyTags = options.tagsAny.filter((tag) => tags.includes(tag))
    if (matchedAnyTags.length > 0) {
      reasons.push(`matched optional tags: ${matchedAnyTags.join(', ')}`)
      score += matchedAnyTags.length * 5
    }
  }

  if (options.kinds.length > 0) {
    reasons.push(`kind: ${asset.kind}`)
    score += 3
  }

  if (options.formats.length > 0) {
    reasons.push(`format: ${asset.format}`)
    score += 2
  }

  if (options.packs.length > 0) {
    reasons.push(`pack: ${asset.packId}`)
    score += 2
  }

  return {
    score,
    matchedQueryTerms,
    reasons: uniqueSorted(reasons),
  }
}

async function handleSearch(options, source) {
  const assets = await loadCatalogJson(source, 'all-assets.json')
  const matches = []

  for (const asset of assets) {
    if (!filterAsset(asset, options)) {
      continue
    }

    const ranking = scoreAsset(asset, options)
    if (ranking === null) {
      continue
    }

    matches.push({
      score: ranking.score,
      matchedQueryTerms: ranking.matchedQueryTerms,
      reasons: ranking.reasons,
      asset,
    })
  }

  matches.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score
    }

    if (right.matchedQueryTerms !== left.matchedQueryTerms) {
      return right.matchedQueryTerms - left.matchedQueryTerms
    }

    return String(left.asset.name ?? left.asset.id).localeCompare(String(right.asset.name ?? right.asset.id))
  })

  const limited = matches.slice(0, options.limit)

  return {
    version: 1,
    catalogSource: source.label,
    sourceMode: source.mode,
    command: 'search',
    query: {
      text: options.query ?? null,
      tagsAll: options.tagsAll,
      tagsAny: options.tagsAny,
      tagsNot: options.tagsNot,
      kinds: options.kinds,
      formats: options.formats,
      packs: options.packs,
      licenses: options.licenses,
      animated: options.animated,
      rigged: options.rigged,
      limit: options.limit,
    },
    totalMatches: matches.length,
    results: options.idsOnly
      ? limited.map((entry) => entry.asset.id)
      : limited.map((entry) => ({
          score: entry.score,
          reasons: entry.reasons,
          asset: entry.asset,
        })),
  }
}

async function handleGetAsset(options, source) {
  const assetId = options.positionals[0]

  if (!assetId) {
    throw new Error('Missing asset id. Usage: node catalog-cli.mjs get-asset <assetId>')
  }

  const locations = await loadCatalogJson(source, 'asset-locations.json')
  const location = locations?.assetsById?.[assetId]

  if (!location) {
    throw new Error(`Asset not found: ${assetId}`)
  }

  const packs = await loadCatalogJson(source, 'packs.json')
  const pack = packs.find((entry) => entry.id === location.packId) ?? null

  if (options.summary) {
    const allAssets = await loadCatalogJson(source, 'all-assets.json')
    const summary = allAssets.find((entry) => entry.id === assetId) ?? null

    if (!summary) {
      throw new Error(`Asset summary not found: ${assetId}`)
    }

    return {
      version: 1,
      catalogSource: source.label,
      sourceMode: source.mode,
      command: 'get-asset',
      mode: 'summary',
      location,
      pack,
      asset: summary,
    }
  }

  const detailsPath = options.expanded ? location.expandedDetailPath : location.detailPath
  const bundle = await loadCatalogJson(source, detailsPath)
  const entry = bundle?.assetsById?.[assetId]

  if (!entry) {
    throw new Error(`Asset detail not found in ${detailsPath}: ${assetId}`)
  }

  return {
    version: 1,
    catalogSource: source.label,
    sourceMode: source.mode,
    command: 'get-asset',
    mode: options.expanded ? 'expanded' : 'compact',
    location,
    pack: pack ?? bundle.pack ?? null,
    generatedAt: entry.generatedAt ?? bundle.generatedAt ?? null,
    asset: entry.asset,
  }
}

async function handleGetPack(options, source) {
  const packId = options.positionals[0]

  if (!packId) {
    throw new Error('Missing pack id. Usage: node catalog-cli.mjs get-pack <packId>')
  }

  const packs = await loadCatalogJson(source, 'packs.json')
  const pack = packs.find((entry) => entry.id === packId)

  if (!pack) {
    throw new Error(`Pack not found: ${packId}`)
  }

  const response = {
    version: 1,
    catalogSource: source.label,
    sourceMode: source.mode,
    command: 'get-pack',
    pack,
  }

  if (options.assets) {
    const assets = await loadCatalogJson(source, `packs/${packId}/assets.json`)
    response.assets = options.assetLimit ? assets.slice(0, options.assetLimit) : assets
  }

  if (options.expandedAssets) {
    const assetsExpanded = await loadCatalogJson(source, `packs/${packId}/assets-expanded.json`)
    response.assetsExpanded = options.assetLimit ? assetsExpanded.slice(0, options.assetLimit) : assetsExpanded
  }

  if (options.details) {
    response.details = await loadCatalogJson(source, `packs/${packId}/details.json`)
  }

  if (options.expandedDetails) {
    response.detailsExpanded = await loadCatalogJson(source, `packs/${packId}/details-expanded.json`)
  }

  return response
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const source = await detectSource(options)
  let result

  switch (options.command) {
    case 'search':
      result = await handleSearch(options, source)
      break
    case 'get-asset':
      result = await handleGetAsset(options, source)
      break
    case 'get-pack':
      result = await handleGetPack(options, source)
      break
    default:
      throw new Error(`Unknown command: ${options.command}`)
  }

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
