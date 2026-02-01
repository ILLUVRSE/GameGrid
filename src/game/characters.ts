import { characterRegistry } from './content';

export const characterList = characterRegistry.getAllCharacters();

export const characterMap = new Map(
  characterList.map((character) => [character.id, character])
);
