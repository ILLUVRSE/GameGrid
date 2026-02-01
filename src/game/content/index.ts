import type { AssetManifest, CharacterData, StageData } from '../types';
import { AssetManifestSchema, CharacterSchema, StageSchema } from './schemas';
import { AssetRegistry, CharacterRegistry, StageRegistry } from './registries';
import manifestData from '../../content/assets/manifest.json';

const characterModules = import.meta.glob('../../content/characters/*.json', { eager: true });
const stageModules = import.meta.glob('../../content/stages/*.json', { eager: true });
const assetModules = import.meta.glob('../../content/assets/**/*', {
  eager: true,
  query: '?url',
  import: 'default'
});

const formatZodIssues = (issues: { path: (string | number)[]; message: string }[]) =>
  issues
    .map((issue) => `${issue.path.length ? issue.path.join('.') : 'root'}: ${issue.message}`)
    .join('\n');

const loadCharacters = () => {
  const characters: CharacterData[] = [];
  Object.entries(characterModules).forEach(([path, module]) => {
    const payload = (module as { default?: unknown }).default ?? module;
    const parsed = CharacterSchema.safeParse(payload);
    if (!parsed.success) {
      // eslint-disable-next-line no-console
      console.error(
        `[ContentValidation] Character JSON failed for ${path}:\n${formatZodIssues(parsed.error.issues)}`
      );
      return;
    }
    characters.push(parsed.data);
  });
  return characters.sort((a, b) => a.id.localeCompare(b.id));
};

const loadStages = () => {
  const stages: StageData[] = [];
  Object.entries(stageModules).forEach(([path, module]) => {
    const payload = (module as { default?: unknown }).default ?? module;
    const parsed = StageSchema.safeParse(payload);
    if (!parsed.success) {
      // eslint-disable-next-line no-console
      console.error(
        `[ContentValidation] Stage JSON failed for ${path}:\n${formatZodIssues(parsed.error.issues)}`
      );
      return;
    }
    stages.push(parsed.data);
  });
  return stages.sort((a, b) => a.id.localeCompare(b.id));
};

const loadManifest = () => {
  const parsed = AssetManifestSchema.safeParse(manifestData);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error(
      `[ContentValidation] Asset manifest failed:\n${formatZodIssues(parsed.error.issues)}`
    );
    return { sprites: {}, ui: {}, sfx: {}, vfx: {} } as AssetManifest;
  }
  return parsed.data;
};

const buildAssetMap = () => {
  const resolved: Record<string, string> = {};
  Object.entries(assetModules).forEach(([path, url]) => {
    const normalized = path.replace('../../content/assets/', '');
    resolved[normalized] = url as string;
  });
  return resolved;
};

const characters = loadCharacters();
const stages = loadStages();
const manifest = loadManifest();
const assetMap = buildAssetMap();

export const characterRegistry = new CharacterRegistry(characters);
export const stageRegistry = new StageRegistry(stages);
export const assetRegistry = new AssetRegistry(manifest, assetMap);
