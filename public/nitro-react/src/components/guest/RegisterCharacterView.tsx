import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { AvatarRenderEvent, AvatarScaleType, AvatarSetType } from "@nitrots/nitro-renderer";
import {
    AvatarEditorGridColorItem,
    AvatarEditorGridPartItem,
    FigureData,
    GetAvatarPalette,
    GetAvatarRenderManager,
    GetAvatarSetType,
    GetConfiguration,
} from "../../api";
import {
    Button,
    Column,
    Flex,
    FormGroup,
    LayoutAvatarImageView,
    LayoutGridItem,
    LayoutPixelLoadingView,
    Text,
} from "../../common";
import { AvatarEditorIcon } from "../avatar-editor/views/AvatarEditorIcon";
import { AvatarEditorFigurePreviewView } from "../avatar-editor/views/AvatarEditorFigurePreviewView";
import { AvatarEditorFigureSetItemView } from "../avatar-editor/views/figure-set/AvatarEditorFigureSetItemView";
import { AvatarEditorPaletteSetItem } from "../avatar-editor/views/palette-set/AvatarEditorPaletteSetItemView";
import {
    CharacterRace,
    FALLBACK_CHARACTER_RACES,
    GetCharacterRaces,
} from "./CharacterRaces";

interface RegisterCharacterViewProps {
    statusMessage: string;
    onRegister: (data: {
        username: string;
        email: string;
        password: string;
        passwordConfirm: string;
        gender: string;
        race: string;
        className: string;
        look: string;
    }) => void;
    onGoLogin: () => void;
}

const DEFAULT_MALE_FIGURE =
    "hr-100.hd-180-7.ch-215-66.lg-270-79.sh-305-62.ha-1002-70.wa-2007";
const DEFAULT_FEMALE_FIGURE =
    "hr-515-33.hd-600-1.ch-635-70.lg-716-66-62.sh-735-68";

type CustomizationTab = "full" | "head" | "torso" | "legs";


const HEAD_SET_TYPES: string[] = [
    FigureData.FACE,
    FigureData.HAIR,
    FigureData.HAT,
    FigureData.HEAD_ACCESSORIES,
    FigureData.EYE_ACCESSORIES,
    FigureData.FACE_ACCESSORIES,
];

const TORSO_SET_TYPES: string[] = [
    FigureData.JACKET,
    FigureData.SHIRT,
    FigureData.CHEST_ACCESSORIES,
    FigureData.CHEST_PRINTS,
];

const LEG_SET_TYPES: string[] = [
    FigureData.TROUSERS,
    FigureData.SHOES,
    FigureData.TROUSER_ACCESSORIES,
];

const FULL_SET_TYPES: string[] = [
    FigureData.FACE,
    FigureData.HAIR,
    FigureData.SHIRT,
    FigureData.TROUSERS,
    FigureData.SHOES,
];


const SET_LABEL: Record<string, string> = {
    [FigureData.FACE]: "Face",
    [FigureData.HAIR]: "Hair",
    [FigureData.HAT]: "Hat",
    [FigureData.HEAD_ACCESSORIES]: "Head",
    [FigureData.EYE_ACCESSORIES]: "Eyes",
    [FigureData.FACE_ACCESSORIES]: "Acc",
    [FigureData.JACKET]: "Jacket",
    [FigureData.SHIRT]: "Shirt",
    [FigureData.CHEST_ACCESSORIES]: "Chest",
    [FigureData.CHEST_PRINTS]: "Print",
    [FigureData.TROUSERS]: "Legs",
    [FigureData.SHOES]: "Shoes",
    [FigureData.TROUSER_ACCESSORIES]: "Waist",
};

const SET_ICON: Record<string, string> = {
    [FigureData.FACE]: "he",
    [FigureData.HAIR]: "hr",
    [FigureData.HAT]: "ha",
    [FigureData.HEAD_ACCESSORIES]: "he",
    [FigureData.EYE_ACCESSORIES]: "ea",
    [FigureData.FACE_ACCESSORIES]: "fa",
    [FigureData.JACKET]: "cc",
    [FigureData.SHIRT]: "ch",
    [FigureData.CHEST_ACCESSORIES]: "ca",
    [FigureData.CHEST_PRINTS]: "cp",
    [FigureData.TROUSERS]: "lg",
    [FigureData.SHOES]: "sh",
    [FigureData.TROUSER_ACCESSORIES]: "wa",
};

const CLASS_SKILL_SYMBOLS: Record<string, string> = {
    Minerador: "MN",
    Hacker: "HK",
    Quimico: "QM",
    Mecanico: "MC",
    Medico: "MD",
    Programador: "PG",
};

const CLASS_OPTIONS = [
    "Minerador",
    "Hacker",
    "Quimico",
    "Mecanico",
    "Medico",
    "Programador",
];
const FIGURE_NITRO_DEBUG = true;
const FIGURE_NITRO_LOG_PREFIX = "[RegisterCharacterView:FigureNitro]";

const isSetGenderAllowed = (setGender: string, selectedGender: string): boolean => {
    if (!setGender || !selectedGender) {
        return true;
    }

    const normalizedSetGender = setGender.toUpperCase();
    const normalizedSelectedGender = selectedGender.toUpperCase();

    return (
        normalizedSetGender === FigureData.UNISEX ||
        normalizedSetGender === normalizedSelectedGender
    );
};


const cloneFigureData = (source: FigureData, gender: string): FigureData => {
    const next = new FigureData();
    next.loadAvatarData(source.getFigureString(), gender);
    next.direction = source.direction;

    return next;
};

export const RegisterCharacterView: FC<RegisterCharacterViewProps> = (
    props,
) => {
    const { statusMessage = "", onRegister, onGoLogin } = props;

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [gender, setGender] = useState(FigureData.MALE);
    const [raceOptions, setRaceOptions] = useState<CharacterRace[]>(
        FALLBACK_CHARACTER_RACES,
    );
    const [racesLoaded, setRacesLoaded] = useState(false);
    const [race, setRace] = useState("android");
    const [className, setClassName] = useState("Minerador");
    const [figureData, setFigureData] = useState<FigureData | null>(null);
    const [activeCustomizationTab, setActiveCustomizationTab] =
        useState<CustomizationTab>("full");
    const [activePartSetType, setActivePartSetType] = useState<string>(
        FigureData.FACE,
    );
    const [avatarStructureVersion, setAvatarStructureVersion] = useState(0);
    const avatarRenderManager = GetAvatarRenderManager();
    const isAvatarStructureReady = !!(
        avatarRenderManager && avatarRenderManager.structureData
    );

    const classDescriptions: Record<string, string> = {
        Minerador: "Especialista em coleta, exploracao e recursos.",
        Hacker: "Voltado para tecnologia, invasao e suporte digital.",
        Quimico: "Domina compostos, efeitos e utilidades taticas.",
        Mecanico: "Focado em manutencao, construcao e equipamentos.",
        Medico: "Especialista em cura, suporte e recuperacao.",
        Programador: "Logica, automacao e controle de sistemas.",
    };

    const selectedRace = useMemo(
        () => raceOptions.find((option) => option.code === race) || raceOptions[0],
        [raceOptions, race],
    );

    useEffect(() => {
        let disposed = false;

        GetCharacterRaces()
            .then((availableRaces) => {
                if (disposed || !availableRaces.length) {
                    return;
                }

                setRaceOptions(availableRaces);
                setRace((currentRace) =>
                    availableRaces.some((option) => option.code === currentRace)
                        ? currentRace
                        : availableRaces[0].code,
                );
                setRacesLoaded(true);
            })
            .catch((error) => {
                console.error("Unable to load character races.", error);

                if (!disposed) {
                    setRacesLoaded(true);
                }
            });

        return () => {
            disposed = true;
        };
    }, []);

    const getTabTargetSets = useCallback((tab: CustomizationTab): string[] => {
        switch (tab) {
            case "head":
                return HEAD_SET_TYPES;
            case "torso":
                return TORSO_SET_TYPES;
            case "legs":
                return LEG_SET_TYPES;
            case "full":
            default:
                return FULL_SET_TYPES;
        }
    }, []);

    useEffect(() => {
        if (!avatarRenderManager) {
            return;
        }

        let disposed = false;
        const bumpStructureVersion = () => {
            if (disposed) {
                return;
            }

            setAvatarStructureVersion((prev) => prev + 1);
        };

        const onAvatarRenderReady = () => bumpStructureVersion();

        avatarRenderManager.events.addEventListener(
            AvatarRenderEvent.AVATAR_RENDER_READY,
            onAvatarRenderReady,
        );

        if (!avatarRenderManager.isLoaded && !avatarRenderManager.isLoading) {
            avatarRenderManager.init();
        }

        bumpStructureVersion();

        const warmupTimeout = window.setTimeout(() => {
            if (!disposed) {
                bumpStructureVersion();
            }
        }, 200);

        return () => {
            disposed = true;
            window.clearTimeout(warmupTimeout);
            avatarRenderManager.events.removeEventListener(
                AvatarRenderEvent.AVATAR_RENDER_READY,
                onAvatarRenderReady,
            );
        };
    }, [avatarRenderManager]);

    const buildFigureData = useCallback(
        (nextGender: string, nextRace: CharacterRace): FigureData => {
            const normalizedGender =
                nextGender === FigureData.FEMALE
                    ? FigureData.FEMALE
                    : FigureData.MALE;
            const fallbackFigure =
                normalizedGender === FigureData.FEMALE
                    ? DEFAULT_FEMALE_FIGURE
                    : DEFAULT_MALE_FIGURE;

            const figure = new FigureData();
            figure.loadAvatarData(fallbackFigure, normalizedGender);

            for (const figureType of nextRace?.spriteSet?.removedFigureTypes || []) {
                figure.savePartData(figureType, -1, [], false);
            }

            for (const part of nextRace?.spriteSet?.parts || []) {
                figure.savePartData(
                    part.figureType,
                    Number(part.figureSetId),
                    part.colorIds || [],
                    false,
                );
            }

            return figure;
        },
        [],
    );

    useEffect(() => {
        if (!racesLoaded) {
            setFigureData(null);
            return;
        }

        setFigureData(buildFigureData(gender, selectedRace));
    }, [gender, selectedRace, buildFigureData, racesLoaded]);

    const racePreviewFigures = useMemo(() => {
        const previews: Record<string, string> = {};

        if (!racesLoaded) {
            return previews;
        }

        for (const option of raceOptions) {
            if (!option.spriteSet) {
                continue;
            }

            previews[option.code] = buildFigureData(gender, option).getFigureString();
        }

        return previews;
    }, [raceOptions, gender, buildFigureData, racesLoaded]);

    const activeSetTypes = useMemo(
        () => getTabTargetSets(activeCustomizationTab),
        [activeCustomizationTab, getTabTargetSets],
    );

    const availableSetTypes = useMemo(() => {
        if (!isAvatarStructureReady) {
            return [] as string[];
        }

        return activeSetTypes.filter((setType) => {
            const setTypeData = GetAvatarSetType(setType) as any;

            return !!(setTypeData && setTypeData.partSets);
        });
    }, [activeSetTypes, isAvatarStructureReady, avatarStructureVersion]);

    useEffect(() => {
        if (!availableSetTypes.length) {
            return;
        }

        if (availableSetTypes.indexOf(activePartSetType) === -1) {
            setActivePartSetType(availableSetTypes[0]);
        }
    }, [availableSetTypes, activePartSetType]);

    const visualPartItems = useMemo<AvatarEditorGridPartItem[]>(() => {
        if (!figureData || !activePartSetType || !isAvatarStructureReady) {
            return [];
        }

        const setTypeData = GetAvatarSetType(activePartSetType) as any;

        if (!setTypeData || !setTypeData.partSets) {
            return [];
        }

        const currentGender =
            gender === FigureData.FEMALE ? FigureData.FEMALE : FigureData.MALE;
        const selectedPartSetId = figureData.getPartSetId(activePartSetType);
        const selectedColorIds = figureData.getColorIds(activePartSetType) || [];

        let selectedPartColors: any[] = [];

        if (setTypeData.paletteID >= 0) {
            const palette = GetAvatarPalette(setTypeData.paletteID) as any;
            const paletteColors =
                palette && palette.colors && typeof palette.colors.getValues === "function"
                    ? (palette.colors.getValues() as any[])
                    : [];

            selectedPartColors = selectedColorIds.map((colorId) => {
                const matchedColor = paletteColors.find(
                    (color) => Number(color.id) === Number(colorId),
                );

                return matchedColor || null;
            });
        }

        const rawPartSets =
            typeof setTypeData.partSets.getValues === "function"
                ? (setTypeData.partSets.getValues() as any[])
                : [];

        return rawPartSets
            .filter((partSet) => {
                if (!partSet || !partSet.isSelectable) {
                    return false;
                }

                return isSetGenderAllowed(partSet.gender, currentGender);
            })
            .sort((a, b) => Number(b.id) - Number(a.id))
            .slice(0, 42)
            .map((partSet) => {
                const partItem = new AvatarEditorGridPartItem(
                    partSet,
                    selectedPartColors,
                    activePartSetType !== FigureData.FACE,
                    false,
                );

                partItem.isSelected = Number(partSet.id) === selectedPartSetId;
                partItem.init();

                if (activePartSetType === FigureData.FACE && figureData) {
                    const resetFigure = (_figure: string) => {
                        const figureString = figureData.getFigureStringWithFace(
                            Number(partSet.id),
                        );
                        const avatarImage = avatarRenderManager.createAvatarImage(
                            figureString,
                            AvatarScaleType.LARGE,
                            null,
                            { resetFigure, dispose: () => {}, disposed: false } as any,
                        );

                        if (!avatarImage) {
                            return;
                        }

                        const sprite = avatarImage.getImageAsSprite(AvatarSetType.HEAD);

                        if (sprite) {
                            sprite.y = 10;
                            partItem.thumbContainer = sprite;
                        }

                        setTimeout(() => avatarImage.dispose(), 0);
                    };

                    resetFigure("");
                }

                return partItem;
            });
    }, [
        avatarRenderManager,
        figureData,
        activePartSetType,
        gender,
        isAvatarStructureReady,
        avatarStructureVersion,
    ]);

    useEffect(() => {
        return () => {
            for (const partItem of visualPartItems) {
                partItem.dispose();
            }
        };
    }, [visualPartItems]);

    const visualColorItems = useMemo<AvatarEditorGridColorItem[]>(() => {
        if (!figureData || !activePartSetType || !isAvatarStructureReady) {
            return [];
        }

        const setTypeData = GetAvatarSetType(activePartSetType) as any;

        if (!setTypeData || setTypeData.paletteID < 0) {
            return [];
        }

        const palette = GetAvatarPalette(setTypeData.paletteID) as any;

        if (!palette || !palette.colors || typeof palette.colors.getValues !== "function") {
            return [];
        }

        const selectedColorIds = figureData.getColorIds(activePartSetType) || [];
        const selectedColorId = selectedColorIds.length ? selectedColorIds[0] : -1;

        return (palette.colors.getValues() as any[])
            .filter((color) => !!(color && color.isSelectable))
            .slice(0, 42)
            .map((color) => {
                const colorItem = new AvatarEditorGridColorItem(color, false);
                colorItem.isSelected = Number(color.id) === selectedColorId;

                return colorItem;
            });
    }, [figureData, activePartSetType, isAvatarStructureReady, avatarStructureVersion]);

    useEffect(() => {
        return () => {
            for (const colorItem of visualColorItems) {
                colorItem.dispose();
            }
        };
    }, [visualColorItems]);

    const previewNode = useMemo(() => {
        if (!figureData) {
            return (
                <div className="guest-auth-avatar-loading-stage">
                    <LayoutPixelLoadingView size="large" label="Carregando avatar" />
                </div>
            );
        }

        return (
            <AvatarEditorFigurePreviewView
                figureData={figureData}
                showAvatarLoading
            />
        );
    }, [figureData]);

    const resolveSetNitroLibraries = useCallback(
        (setType: string, targetFigure: FigureData = figureData) => {
            if (!targetFigure || !avatarRenderManager || !isAvatarStructureReady) {
                return null;
            }

            const structureData = avatarRenderManager.structureData as any;
            const setTypeData =
                structureData && typeof structureData.getSetType === "function"
                    ? structureData.getSetType(setType)
                    : null;

            if (!setTypeData || typeof setTypeData.getPartSet !== "function") {
                return null;
            }

            const setId = Number(targetFigure.getPartSetId(setType));

            if (!(setId >= 0)) {
                return {
                    setType,
                    setId,
                    partKeys: [] as string[],
                    libraries: [] as string[],
                    files: [] as string[],
                };
            }

            const partSet = setTypeData.getPartSet(setId);

            if (!partSet || !Array.isArray(partSet.parts)) {
                return {
                    setType,
                    setId,
                    partKeys: [] as string[],
                    libraries: [] as string[],
                    files: [] as string[],
                };
            }

            const downloadManager = avatarRenderManager.downloadManager as any;
            const figureMap =
                downloadManager && downloadManager._figureMap
                    ? downloadManager._figureMap
                    : null;

            const partKeys = (partSet.parts as any[])
                .filter((part) => !!part)
                .map((part) => `${part.type}:${part.id}`);
            const libraryNames = new Set<string>();
            const assetUrlTemplate = GetConfiguration<string>("avatar.asset.url", "");

            for (const partKey of partKeys) {
                const libraries =
                    figureMap && typeof figureMap.get === "function"
                        ? figureMap.get(partKey)
                        : null;

                if (!libraries || !Array.isArray(libraries)) {
                    continue;
                }

                for (const library of libraries) {
                    if (!library) {
                        continue;
                    }

                    if (typeof library.libraryName === "string" && library.libraryName.length) {
                        libraryNames.add(library.libraryName);
                        continue;
                    }

                    if (typeof library._libraryName === "string" && library._libraryName.length) {
                        libraryNames.add(library._libraryName);
                    }
                }
            }

            return {
                setType,
                setId,
                partKeys,
                libraries: Array.from(libraryNames),
                files: Array.from(libraryNames).map((libraryName) =>
                    assetUrlTemplate.replace(/%libname%/gi, libraryName),
                ),
            };
        },
        [avatarRenderManager, figureData, isAvatarStructureReady],
    );

    useEffect(() => {
        if (!FIGURE_NITRO_DEBUG || !figureData) {
            return;
        }

        const look = figureData.getFigureString();
        const torso = resolveSetNitroLibraries(FigureData.SHIRT);
        const legs = resolveSetNitroLibraries(FigureData.TROUSERS);
        const shoes = resolveSetNitroLibraries(FigureData.SHOES);

        console.log(FIGURE_NITRO_LOG_PREFIX, {
            look,
            torso,
            legs,
            shoes,
        });
    }, [figureData, resolveSetNitroLibraries]);

    const statusNode = useMemo(() => {
        if (!statusMessage.length) {
            return null;
        }

        return <Text className="guest-auth-copy">{statusMessage}</Text>;
    }, [statusMessage]);

    const handleSelectPart = useCallback(
        (partItem: AvatarEditorGridPartItem) => {
            if (!figureData || !activePartSetType || !partItem || partItem.id < 0) {
                return;
            }

            const normalizedGender =
                gender === FigureData.FEMALE
                    ? FigureData.FEMALE
                    : FigureData.MALE;
            const nextFigure = cloneFigureData(figureData, normalizedGender);
            const existingColorIds = nextFigure.getColorIds(activePartSetType) || [];

            nextFigure.savePartData(
                activePartSetType,
                partItem.id,
                existingColorIds.length ? existingColorIds : [0],
                true,
            );

            if (FIGURE_NITRO_DEBUG) {
                const selectedPart = resolveSetNitroLibraries(
                    activePartSetType,
                    nextFigure,
                );

                console.groupCollapsed(
                    `${FIGURE_NITRO_LOG_PREFIX} ${activePartSetType}-${partItem.id}`,
                );
                console.log("Peça selecionada", {
                    category: activePartSetType,
                    setId: partItem.id,
                    look: nextFigure.getFigureString(),
                });
                console.log("Arquivos .nitro", selectedPart?.files || []);
                console.log("Detalhes", selectedPart);
                console.groupEnd();
            }

            setFigureData(nextFigure);
        },
        [
            figureData,
            activePartSetType,
            gender,
            resolveSetNitroLibraries,
        ],
    );

    const handleSelectColor = useCallback(
        (colorItem: AvatarEditorGridColorItem) => {
            if (
                !figureData ||
                !activePartSetType ||
                !colorItem ||
                !colorItem.partColor
            ) {
                return;
            }

            const normalizedGender =
                gender === FigureData.FEMALE
                    ? FigureData.FEMALE
                    : FigureData.MALE;
            const nextFigure = cloneFigureData(figureData, normalizedGender);
            const existingColorIds = nextFigure.getColorIds(activePartSetType) || [];
            const nextColorIds = existingColorIds.length
                ? [...existingColorIds]
                : [Number(colorItem.partColor.id)];

            nextColorIds[0] = Number(colorItem.partColor.id);
            nextFigure.savePartSetColourId(activePartSetType, nextColorIds, true);

            setFigureData(nextFigure);
        },
        [figureData, activePartSetType, gender],
    );
    const handleRegister = useCallback(() => {
        onRegister({
            username: username.trim(),
            email: email.trim(),
            password,
            passwordConfirm,
            gender,
            race,
            className,
            look: figureData ? figureData.getFigureString() : "",
        });
    }, [
        onRegister,
        username,
        email,
        password,
        passwordConfirm,
        gender,
        race,
        className,
        figureData,
    ]);


    return (
        <Column gap={3} className="guest-auth-register-character">
            <div className="guest-auth-register-character-layout">
                <div className="guest-auth-register-character-left">
                    <div className="guest-auth-register-character-left-fallback">
                        <div className="guest-auth-customizer-tabs">
                            <button
                                type="button"
                                className={`guest-auth-customizer-tab ${activeCustomizationTab === "full" ? "is-active" : ""}`}
                                onClick={() => setActiveCustomizationTab("full")}
                            >
                                Face & Body
                            </button>
                            <button
                                type="button"
                                className={`guest-auth-customizer-tab ${activeCustomizationTab === "head" ? "is-active" : ""}`}
                                onClick={() => setActiveCustomizationTab("head")}
                            >
                                Head
                            </button>
                            <button
                                type="button"
                                className={`guest-auth-customizer-tab ${activeCustomizationTab === "torso" ? "is-active" : ""}`}
                                onClick={() => setActiveCustomizationTab("torso")}
                            >
                                Torso
                            </button>
                            <button
                                type="button"
                                className={`guest-auth-customizer-tab ${activeCustomizationTab === "legs" ? "is-active" : ""}`}
                                onClick={() => setActiveCustomizationTab("legs")}
                            >
                                Legs
                            </button>
                        </div>

                        <div className="guest-auth-customizer-workspace">
                            <div className="guest-auth-customizer-main">
                                <div className="guest-auth-customizer-side">
                                    <button
                                        type="button"
                                        className={`guest-auth-customizer-icon-btn ${gender === FigureData.MALE ? "is-active" : ""}`}
                                        onClick={() => setGender(FigureData.MALE)}
                                        title="Masculino"
                                        aria-label="Masculino"
                                    >
                                        <AvatarEditorIcon
                                            icon="male"
                                            selected={gender === FigureData.MALE}
                                        />
                                    </button>
                                    <button
                                        type="button"
                                        className={`guest-auth-customizer-icon-btn ${gender === FigureData.FEMALE ? "is-active" : ""}`}
                                        onClick={() => setGender(FigureData.FEMALE)}
                                        title="Feminino"
                                        aria-label="Feminino"
                                    >
                                        <AvatarEditorIcon
                                            icon="female"
                                            selected={gender === FigureData.FEMALE}
                                        />
                                    </button>

                                    <div className="guest-auth-customizer-side-divider" />

                                    {availableSetTypes.map((setType) => (
                                        <button
                                            key={`set-${setType}`}
                                            type="button"
                                            className={`guest-auth-customizer-icon-btn ${activePartSetType === setType ? "is-active" : ""}`}
                                            onClick={() => setActivePartSetType(setType)}
                                            title={SET_LABEL[setType] || setType}
                                            aria-label={SET_LABEL[setType] || setType}
                                        >
                                            <AvatarEditorIcon
                                                icon={SET_ICON[setType] || setType}
                                                selected={activePartSetType === setType}
                                            />
                                            {!SET_ICON[setType] && (
                                                <span className="guest-auth-customizer-icon-label">
                                                    {SET_LABEL[setType] || setType}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                <div className="guest-auth-customizer-item-grid">
                                    {visualPartItems.map((partItem, index) => (
                                        <AvatarEditorFigureSetItemView
                                            key={`part-${activePartSetType}-${partItem.id}-${index}`}
                                            partItem={partItem}
                                            className="guest-auth-customizer-grid-item"
                                            onClick={() => handleSelectPart(partItem)}
                                            title={`${SET_LABEL[activePartSetType] || activePartSetType} #${partItem.id}`}
                                        />
                                    ))}
                                </div>

                                <div className="guest-auth-customizer-color-grid">
                                    {visualColorItems.map((colorItem, index) => (
                                        <AvatarEditorPaletteSetItem
                                            key={`color-${activePartSetType}-${colorItem.partColor.id}-${index}`}
                                            colorItem={colorItem}
                                            className="guest-auth-customizer-color-item clear-bg"
                                            onClick={() => handleSelectColor(colorItem)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="guest-auth-register-character-center">
                    <div className="guest-auth-register-character-preview-card">
                        <div className="guest-auth-register-character-info-title">
                            Preview
                        </div>
                        <div className="guest-auth-register-character-preview-inner">
                            {previewNode}
                        </div>
                    </div>

                    <div className="guest-auth-race-choice-panel">
                        <div className="guest-auth-race-choice-buttons">
                            {raceOptions.map((option) => {
                                const racePreviewFigure = racePreviewFigures[option.code];

                                if (!racesLoaded) {
                                    return (
                                        <LayoutGridItem
                                            key={`race-btn-${option.code}`}
                                            disabled
                                            className="guest-auth-race-grid-item guest-auth-race-grid-loading"
                                            aria-label={`Carregando ${option.name}`}
                                        >
                                            <LayoutPixelLoadingView
                                                size="small"
                                                label={`Carregando ${option.name}`}
                                            />
                                        </LayoutGridItem>
                                    );
                                }

                                if (racePreviewFigure) {
                                    return (
                                        <LayoutGridItem
                                            key={`race-btn-${option.code}`}
                                            itemActive={race === option.code}
                                            className="guest-auth-race-grid-item"
                                            title={option.name}
                                            onClick={() => setRace(option.code)}
                                        >
                                            <LayoutAvatarImageView
                                                figure={racePreviewFigure}
                                                gender={gender}
                                                direction={4}
                                                headOnly
                                                showLoading
                                                loadingSize="small"
                                                className="guest-auth-race-skin-head"
                                            />
                                        </LayoutGridItem>
                                    );
                                }

                                return (
                                    <LayoutGridItem
                                        key={`race-btn-${option.code}`}
                                        itemActive={race === option.code}
                                        className="guest-auth-race-grid-item guest-auth-race-grid-unavailable"
                                        title={option.name}
                                        onClick={() => setRace(option.code)}
                                    >
                                        {option.name.slice(0, 2).toUpperCase()}
                                    </LayoutGridItem>
                                );
                            })}
                        </div>
                    </div>

                    <div className="guest-auth-register-character-info-box guest-auth-race-info-box">
                        <div className="guest-auth-register-character-info-title">
                            Race Description
                        </div>
                        <Text className="guest-auth-copy">
                            {selectedRace?.description || ""}
                        </Text>
                    </div>
                </div>

                <div className="guest-auth-register-character-right">
                    <div className="guest-auth-register-character-right-panel">
                        <div className="guest-auth-register-character-preview-card guest-auth-register-character-skills-card">
                            <div className="guest-auth-register-character-info-title">
                                Class & Skills
                            </div>

                            <div className="guest-auth-skills-map">
                                <svg
                                    viewBox="0 0 360 188"
                                    className="guest-auth-skills-map-svg"
                                    aria-hidden="true"
                                >
                                    <line x1="42" y1="32" x2="130" y2="32" />
                                    <line x1="130" y1="32" x2="238" y2="32" />
                                    <line x1="42" y1="32" x2="42" y2="96" />
                                    <line x1="42" y1="96" x2="118" y2="96" />
                                    <line x1="118" y1="96" x2="162" y2="136" />
                                    <line x1="118" y1="96" x2="146" y2="74" />
                                    <line x1="130" y1="32" x2="146" y2="74" />
                                    <line x1="146" y1="74" x2="186" y2="74" />
                                    <line x1="186" y1="74" x2="300" y2="74" />
                                    <line x1="186" y1="74" x2="250" y2="138" />
                                    <line x1="238" y1="32" x2="238" y2="138" />
                                    <line x1="42" y1="138" x2="162" y2="136" />
                                    <line x1="130" y1="32" x2="130" y2="136" />

                                    <rect x="26" y="18" width="32" height="24" />
                                    <rect x="114" y="18" width="32" height="24" />
                                    <rect x="222" y="18" width="32" height="24" />
                                    <rect x="26" y="86" width="32" height="22" />
                                    <rect x="20" y="126" width="42" height="28" />
                                    <rect x="144" y="126" width="42" height="28" />
                                    <rect x="130" y="64" width="18" height="18" />
                                    <rect x="170" y="60" width="34" height="28" />
                                    <rect x="286" y="60" width="42" height="28" />
                                    <rect x="224" y="126" width="44" height="30" />
                                </svg>
                            </div>
                        </div>

                        <div className="guest-auth-class-choice-panel">
                            <div className="guest-auth-class-skill-buttons">
                                {CLASS_OPTIONS.map((option) => (
                                    <button
                                        key={`class-btn-${option}`}
                                        type="button"
                                        className={`guest-auth-class-skill-btn ${className === option ? "is-active" : ""}`}
                                        title={option}
                                        aria-label={option}
                                        onClick={() => setClassName(option)}
                                    >
                                        {CLASS_SKILL_SYMBOLS[option] || "CL"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="guest-auth-register-character-info-box guest-auth-class-info-box">
                            <div className="guest-auth-register-character-info-title">
                                Class Info
                            </div>
                            <Text className="guest-auth-copy">
                                {classDescriptions[className]}
                            </Text>
                        </div>
                    </div>
                </div>
            </div>

            <div className="guest-auth-register-form-panel">
                <div className="guest-auth-register-character-fields guest-auth-register-character-fields-bottom">
                    <FormGroup column>
                        <label className="form-label">Usuario</label>
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            value={username}
                            onChange={(event) =>
                                setUsername(event.target.value)
                            }
                        />
                    </FormGroup>

                    <FormGroup column>
                        <label className="form-label">E-mail</label>
                        <input
                            type="email"
                            className="form-control form-control-sm"
                            value={email}
                            onChange={(event) =>
                                setEmail(event.target.value)
                            }
                        />
                    </FormGroup>

                    <FormGroup column>
                        <label className="form-label">Sexo</label>
                        <select
                            className="form-select form-select-sm"
                            value={gender}
                            onChange={(event) =>
                                setGender(event.target.value)
                            }
                        >
                            <option value={FigureData.MALE}>Masculino</option>
                            <option value={FigureData.FEMALE}>Feminino</option>
                        </select>
                    </FormGroup>

                    <FormGroup column>
                        <label className="form-label">Raca</label>
                        <select
                            className="form-select form-select-sm"
                            value={race}
                            onChange={(event) =>
                                setRace(event.target.value)
                            }
                        >
                            {raceOptions.map((raceOption) => (
                                <option key={raceOption.code} value={raceOption.code}>
                                    {raceOption.name}
                                </option>
                            ))}
                        </select>
                    </FormGroup>
                </div>
            </div>

            {statusNode}

            <Flex gap={2} className="guest-auth-register-character-actions">
                <Button variant="success" onClick={handleRegister}>
                    Criar conta
                </Button>
                <Button variant="secondary" onClick={onGoLogin}>
                    Voltar para login
                </Button>
            </Flex>
        </Column>
    );
};








