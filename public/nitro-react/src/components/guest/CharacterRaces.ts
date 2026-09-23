export interface CharacterRaceSpritePart
{
    slot: string;
    figureType: string;
    figureSetId: number;
    nitroFile: string;
    colorIds: number[];
}

export interface CharacterRaceSpriteSet
{
    code: string;
    name: string;
    removedFigureTypes: string[];
    parts: CharacterRaceSpritePart[];
}

export interface CharacterRace
{
    code: string;
    name: string;
    description: string;
    look: string;
    spriteSet: CharacterRaceSpriteSet | null;
}

interface CharacterRaceResponse
{
    data: CharacterRace[];
}

export const FALLBACK_CHARACTER_RACES: CharacterRace[] = [
    {
        code: "android",
        name: "Android",
        description: "Corpos sinteticos com foco em precisao e resistencia.",
        look: "",
        spriteSet: null,
    },
    {
        code: "cyclops",
        name: "Ciclope",
        description: "Visao singular e presenca intimidadora em combate e exploracao.",
        look: "",
        spriteSet: null,
    },
    {
        code: "bionic",
        name: "Bionic",
        description: "Mistura de carne e maquina, com adaptabilidade elevada.",
        look: "",
        spriteSet: null,
    },
    {
        code: "basalt",
        name: "Basalts",
        description: "Estrutura pesada e robusta, otima para suportar dano.",
        look: "",
        spriteSet: null,
    },
    {
        code: "hammer",
        name: "Hammer",
        description: "Perfil agressivo e tecnico, ideal para avancar ofensivamente.",
        look: "",
        spriteSet: null,
    },
];

export const GetCharacterRaces = async (): Promise<CharacterRace[]> =>
{
    const response = await fetch("/api/game/character-races", {
        headers: {
            Accept: "application/json",
        },
        credentials: "same-origin",
    });

    if (!response.ok)
    {
        throw new Error(`Unable to load character races (${response.status}).`);
    }

    const payload = (await response.json()) as CharacterRaceResponse;

    return Array.isArray(payload.data) ? payload.data : [];
};
