import {
    AvatarRenderEvent,
    AvatarScaleType,
    AvatarSetType,
} from "@nitrots/nitro-renderer";
import { CSSProperties, FC, useEffect, useMemo, useRef, useState } from "react";
import { GetAvatarRenderManager } from "../../api";
import { Base, BaseProps } from "../Base";
import { LayoutPixelLoadingSize, LayoutPixelLoadingView } from "./LayoutPixelLoadingView";

export interface LayoutAvatarImageViewProps extends BaseProps<HTMLDivElement> {
    figure: string;
    gender?: string;
    headOnly?: boolean;
    direction?: number;
    scale?: number;
    showLoading?: boolean;
    loadingSize?: LayoutPixelLoadingSize;
}

export const LayoutAvatarImageView: FC<LayoutAvatarImageViewProps> = (
    props,
) => {
    const {
        figure = "",
        gender = "M",
        headOnly = false,
        direction = 0,
        scale = 1,
        showLoading = false,
        loadingSize = "medium",
        classNames = [],
        style = {},
        ...rest
    } = props;
    const renderKey = `${figure}|${gender}|${headOnly ? 1 : 0}|${direction}|${scale}`;
    const [avatarImage, setAvatarImage] = useState<{ key: string; url: string }>(null);
    const [randomValue, setRandomValue] = useState(-1);
    const isDisposed = useRef(false);
    const DEBUG = true;
    const DEBUG_PREFIX = "[LayoutAvatarImageView:v2]";

    const getClassNames = useMemo(() => {
        const newClassNames: string[] = ["avatar-image"];

        if (classNames.length) newClassNames.push(...classNames);

        return newClassNames;
    }, [classNames]);

    const getStyle = useMemo(() => {
        let newStyle: CSSProperties = {};
        const avatarUrl = avatarImage && avatarImage.key === renderKey
            ? avatarImage.url
            : null;

        if (avatarUrl && avatarUrl.length)
            newStyle.backgroundImage = `url('${avatarUrl}')`;

        if (scale !== 1) {
            newStyle.transform = `scale(${scale})`;

            if (!(scale % 1)) newStyle.imageRendering = "pixelated";
        }

        if (Object.keys(style).length) newStyle = { ...newStyle, ...style };

        return newStyle;
    }, [avatarImage, renderKey, scale, style]);

    const isLoading = !avatarImage || avatarImage.key !== renderKey;

    useEffect(() => {
        isDisposed.current = false;

        return () => {
            isDisposed.current = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        const avatarRenderManager = GetAvatarRenderManager();

        if (!avatarRenderManager) {
            if (DEBUG) {
                console.log(DEBUG_PREFIX, "avatarRenderManager missing");
            }
            return () => {
                cancelled = true;
            };
        }

        if (DEBUG) {
            console.log(DEBUG_PREFIX, "effect start", {
                figure,
                gender,
                direction,
                headOnly,
                scale,
                isLoaded: avatarRenderManager.isLoaded,
                isLoading: avatarRenderManager.isLoading,
                isReady: (avatarRenderManager as any).isReady,
            });
        }

        const rerender = () => {
            if (isDisposed.current || cancelled) return;

            if (DEBUG) {
                console.log(DEBUG_PREFIX, "rerender requested");
            }
            setRandomValue(Math.random());
        };

        avatarRenderManager.events.addEventListener(
            AvatarRenderEvent.AVATAR_RENDER_READY,
            rerender,
        );

        if (!avatarRenderManager.isLoaded && !avatarRenderManager.isLoading) {
            if (DEBUG) {
                console.log(DEBUG_PREFIX, "calling avatarRenderManager.init()");
            }
            avatarRenderManager.init();
        }

        const renderAvatar = () => {
            if (cancelled || isDisposed.current) return;

            const figureContainer = avatarRenderManager.createFigureContainer(figure);
            const listener = {
                resetFigure: rerender,
                dispose: () => {},
                disposed: false,
            };

            if (!avatarRenderManager.isFigureContainerReady(figureContainer)) {
                avatarRenderManager.downloadAvatarFigure(figureContainer, listener);
                return;
            }

            const avatarImage = avatarRenderManager.createAvatarImage(
                figure,
                AvatarScaleType.LARGE,
                gender,
                listener,
                null,
            );

            if (!avatarImage) {
                if (DEBUG) {
                    console.log(DEBUG_PREFIX, "createAvatarImage returned null");
                }
                return;
            }

            let setType = AvatarSetType.FULL;

            if (headOnly) setType = AvatarSetType.HEAD;

            avatarImage.setDirection(setType, direction);

            const image = avatarImage.getCroppedImage(setType);

            if (image && image.src) {
                if (DEBUG) {
                    console.log(DEBUG_PREFIX, "image ready", {
                        srcLength: image.src.length,
                    });
                }
                setAvatarImage({ key: renderKey, url: image.src });
            } else if (DEBUG) {
                console.log(DEBUG_PREFIX, "cropped image missing");
            }

            avatarImage.dispose();
        };

        renderAvatar();

        return () => {
            cancelled = true;
            avatarRenderManager.events.removeEventListener(
                AvatarRenderEvent.AVATAR_RENDER_READY,
                rerender,
            );
        };
    }, [figure, gender, direction, headOnly, scale, randomValue, renderKey]);

    return (
        <Base classNames={getClassNames} style={getStyle} aria-busy={ showLoading && isLoading } { ...rest }>
            { showLoading && isLoading && (
                <LayoutPixelLoadingView size={ loadingSize } label="Carregando avatar" />
            ) }
        </Base>
    );
};
