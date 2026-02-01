import type { CharacterData } from './types';
import volt from '../characters/volt.json';
import forge from '../characters/forge.json';
import nova from '../characters/nova.json';
import rizzle from '../characters/rizzle.json';

export const characterList: CharacterData[] = [volt, forge, nova, rizzle];

export const characterMap = new Map(characterList.map((character) => [character.id, character]));
