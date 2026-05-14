import { FC, useCallback, useEffect, useMemo, useState } from "react";
import {
    AvatarEditorGridColorItem,
    AvatarEditorGridPartItem,
    FigureData,
    GetAvatarPalette,
    GetAvatarRenderManager,
    GetAvatarSetType,
} from "../../api";
import { generateRandomFigure } from "../../api/avatar/FigureGenerator";
import { Button, Column, Flex, FormGroup, Text } from "../../common";
import { AvatarEditorIcon } from "../avatar-editor/views/AvatarEditorIcon";
import { AvatarEditorFigurePreviewView } from "../avatar-editor/views/AvatarEditorFigurePreviewView";
import { AvatarEditorFigureSetItemView } from "../avatar-editor/views/figure-set/AvatarEditorFigureSetItemView";
import { AvatarEditorPaletteSetItem } from "../avatar-editor/views/palette-set/AvatarEditorPaletteSetItemView";

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
    const [race, setRace] = useState("Android");
    const [className, setClassName] = useState("Minerador");
    const [figureData, setFigureData] = useState<FigureData | null>(null);
    const [activeCustomizationTab, setActiveCustomizationTab] =
        useState<CustomizationTab>("full");
    const [activePartSetType, setActivePartSetType] = useState<string>(
        FigureData.FACE,
    );
    const avatarRenderManager = GetAvatarRenderManager();
    const isAvatarStructureReady = !!(
        avatarRenderManager && avatarRenderManager.structureData
    );

    const raceDescriptions: Record<string, string> = {
        Android: "Corpos sinteticos com foco em precisao e resistencia.",
        Ciclope: "Visao singular e presenca intimidadora em combate e exploracao.",
        Bionic: "Mistura de carne e maquina, com adaptabilidade elevada.",
        Basalts: "Estrutura pesada e robusta, otima para suportar dano.",
        Hammer: "Perfil agressivo e tecnico, ideal para avancar ofensivamente.",
    };

    const classDescriptions: Record<string, string> = {
        Minerador: "Especialista em coleta, exploracao e recursos.",
        Hacker: "Voltado para tecnologia, invasao e suporte digital.",
        Quimico: "Domina compostos, efeitos e utilidades taticas.",
        Mecanico: "Focado em manutencao, construcao e equipamentos.",
        Medico: "Especialista em cura, suporte e recuperacao.",
        Programador: "Logica, automacao e controle de sistemas.",
    };

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

    const buildFigureData = useCallback((nextGender: string): FigureData => {
        const normalizedGender =
            nextGender === FigureData.FEMALE
                ? FigureData.FEMALE
                : FigureData.MALE;
        const fallbackFigure =
            normalizedGender === FigureData.FEMALE
                ? DEFAULT_FEMALE_FIGURE
                : DEFAULT_MALE_FIGURE;

        const seedFigure = new FigureData();
        seedFigure.loadAvatarData(fallbackFigure, normalizedGender);

        let initialFigure = fallbackFigure;

        if (isAvatarStructureReady) {
            try {
                initialFigure = generateRandomFigure(
                    seedFigure,
                    normalizedGender,
                    0,
                    [],
                    [],
                );
            } catch {
                initialFigure = fallbackFigure;
            }
        }

        const figure = new FigureData();
        figure.loadAvatarData(initialFigure, normalizedGender);

        return figure;
    }, [isAvatarStructureReady]);

    useEffect(() => {
        setFigureData(buildFigureData(gender));
    }, [gender, buildFigureData]);

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
    }, [activeSetTypes, isAvatarStructureReady]);

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

                return partItem;
            });
    }, [figureData, activePartSetType, gender, isAvatarStructureReady]);

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
    }, [figureData, activePartSetType, isAvatarStructureReady]);

    useEffect(() => {
        return () => {
            for (const colorItem of visualColorItems) {
                colorItem.dispose();
            }
        };
    }, [visualColorItems]);
    const previewNode = useMemo(() => {
        if (!figureData) {
            return null;
        }

        return <AvatarEditorFigurePreviewView figureData={figureData} />;
    }, [figureData]);

    const statusNode = useMemo(() => {
        if (!statusMessage.length) {
            return null;
        }

        return <Text className="guest-auth-copy">{statusMessage}</Text>;
    }, [statusMessage]);

    const customizerDescription = useMemo(() => {
        const setLabel = SET_LABEL[activePartSetType] || "Item";

        return `Selecione ${setLabel.toLowerCase()} para montar o visual.`;
    }, [activePartSetType]);

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

            setFigureData(nextFigure);
        },
        [figureData, activePartSetType, gender],
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


    const raceOptions = ["Android", "Ciclope", "Bionic", "Basalts", "Hammer"];
    const classOptions = [
        "Minerador",
        "Hacker",
        "Quimico",
        "Mecanico",
        "Medico",
        "Programador",
    ];

    return (
        <Column gap={3} className="guest-auth-register-character">
            <Text className="guest-auth-copy">
                Crie sua conta para entrar no hotel.
            </Text>

            <div className="guest-auth-register-character-layout">
                <div className="guest-auth-register-character-left">
                    <div className="guest-auth-register-character-left-fallback">
                        <div className="guest-auth-register-character-info-title">
                            Customizacao visual
                        </div>

                        <Text className="guest-auth-copy">
                            {customizerDescription}
                        </Text>

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

                    <div className="guest-auth-register-character-info-panel">
                        <div className="guest-auth-register-character-info-box">
                            <div className="guest-auth-register-character-info-title">
                                Race Description
                            </div>
                            <Text className="guest-auth-copy">
                                {raceDescriptions[race]}
                            </Text>
                        </div>

                        <div className="guest-auth-register-character-info-box">
                            <div className="guest-auth-register-character-info-title">
                                Class Info
                            </div>
                            <Text className="guest-auth-copy">
                                {classDescriptions[className]}
                            </Text>
                        </div>
                    </div>
                </div>

                <div className="guest-auth-register-character-right">
                    <div className="guest-auth-register-character-fields">
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
                            <label className="form-label">Senha</label>
                            <input
                                type="password"
                                className="form-control form-control-sm"
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                            />
                        </FormGroup>

                        <FormGroup column>
                            <label className="form-label">Confirmar senha</label>
                            <input
                                type="password"
                                className="form-control form-control-sm"
                                value={passwordConfirm}
                                onChange={(event) =>
                                    setPasswordConfirm(event.target.value)
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
                                    <option key={raceOption} value={raceOption}>
                                        {raceOption}
                                    </option>
                                ))}
                            </select>
                        </FormGroup>

                        <FormGroup column>
                            <label className="form-label">Classe</label>
                            <select
                                className="form-select form-select-sm"
                                value={className}
                                onChange={(event) =>
                                    setClassName(event.target.value)
                                }
                            >
                                {classOptions.map((classOption) => (
                                    <option key={classOption} value={classOption}>
                                        {classOption}
                                    </option>
                                ))}
                            </select>
                        </FormGroup>
                    </div>
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








