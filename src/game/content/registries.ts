import type { AssetManifest, AssetManifestEntry, CharacterData, StageData } from '../types';

export class CharacterRegistry {
  private characters: CharacterData[];
  private characterMap: Map<string, CharacterData>;

  constructor(characters: CharacterData[]) {
    this.characters = characters;
    this.characterMap = new Map(characters.map((character) => [character.id, character]));
  }

  getAllCharacters() {
    return [...this.characters];
  }

  getCharacter(id: string) {
    return this.characterMap.get(id);
  }
}

export class StageRegistry {
  private stages: StageData[];
  private stageMap: Map<string, StageData>;

  constructor(stages: StageData[]) {
    this.stages = stages;
    this.stageMap = new Map(stages.map((stage) => [stage.id, stage]));
  }

  getAllStages() {
    return [...this.stages];
  }

  getStage(id: string) {
    return this.stageMap.get(id);
  }
}

export interface ResolvedAssetEntry extends AssetManifestEntry {
  url?: string;
}

export class AssetRegistry {
  private manifest: AssetManifest;
  private assets: Record<string, string>;

  constructor(manifest: AssetManifest, assets: Record<string, string>) {
    this.manifest = manifest;
    this.assets = assets;
  }

  private resolveEntry(entry?: AssetManifestEntry): ResolvedAssetEntry | undefined {
    if (!entry) {
      return undefined;
    }
    const url = this.assets[entry.path];
    return {
      ...entry,
      url
    };
  }

  getSpriteSheet(key: string) {
    return this.resolveEntry(this.manifest.sprites[key]);
  }

  getUiIcon(key: string) {
    return this.resolveEntry(this.manifest.ui[key]);
  }

  getFallbackUiIcon() {
    return this.resolveEntry(this.manifest.ui['ui-portrait-default']);
  }

  getSfx(key: string) {
    return this.resolveEntry(this.manifest.sfx[key]);
  }

  getVfx(key: string) {
    return this.resolveEntry(this.manifest.vfx[key]);
  }
}
