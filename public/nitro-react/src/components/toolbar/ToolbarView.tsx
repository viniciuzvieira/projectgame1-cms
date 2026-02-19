import { Dispose, DropBounce, EaseOut, JumpBy, Motions, NitroToolbarAnimateIconEvent, PerkAllowancesMessageEvent, PerkEnum, Queue, Wait } from '@nitrots/nitro-renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { CreateLinkEvent, GetSessionDataManager, MessengerIconState, OpenMessengerChat, VisitDesktop } from '../../api';
import { Base, Flex, LayoutAvatarImageView, LayoutItemCountView, TransitionAnimation, TransitionAnimationTypes } from '../../common';
import { useAchievements, useFriends, useInventoryUnseenTracker, useMessageEvent, useMessenger, useRoomEngineEvent, useSessionInfo } from '../../hooks';
import { ToolbarMeView } from './ToolbarMeView';

// 🔥 Troque esse texto sempre que quiser “provar” que o build mudou
const TOOLBAR_DEBUG_BUILD = 'DEBUG_BUILD__2026-02-16__A';

// ✅ Loga 1x quando o arquivo (módulo) é importado/carregado
console.log(`[ToolbarView] module loaded => ${TOOLBAR_DEBUG_BUILD}`);

export const ToolbarView: FC<{ isInRoom: boolean }> = props => {
    const { isInRoom } = props;

    const [isMeExpanded, setMeExpanded] = useState(false);
    const [useGuideTool, setUseGuideTool] = useState(false);
    const { userFigure = null } = useSessionInfo();
    const { getFullCount = 0 } = useInventoryUnseenTracker();
    const { getTotalUnseen = 0 } = useAchievements();
    const { requests = [] } = useFriends();
    const { iconState = MessengerIconState.HIDDEN } = useMessenger();
    const isMod = GetSessionDataManager().isModerator;

    // ✅ Loga mount/unmount do componente
    useEffect(() => {
        console.log(`TESTEEEE => ${TOOLBAR_DEBUG_BUILD}`, { isInRoom });

        return () => {
            console.log(`[ToolbarView] unmounted => ${TOOLBAR_DEBUG_BUILD}`);
        };
    }, []);

    // ✅ Loga mudanças importantes
    useEffect(() => {
        console.log(`[ToolbarView] isInRoom changed => ${TOOLBAR_DEBUG_BUILD}`, isInRoom);
    }, [isInRoom]);

    useEffect(() => {
        console.log(`[ToolbarView] isMeExpanded changed => ${TOOLBAR_DEBUG_BUILD}`, isMeExpanded);
    }, [isMeExpanded]);

    useMessageEvent<PerkAllowancesMessageEvent>(PerkAllowancesMessageEvent, event => {
        const parser = event.getParser();
        const allowed = parser.isAllowed(PerkEnum.USE_GUIDE_TOOL);

        console.log(`[ToolbarView] PerkAllowancesMessageEvent => ${TOOLBAR_DEBUG_BUILD}`, { allowed });

        setUseGuideTool(allowed);
    });

    const animationIconToToolbar = useCallback((iconName: string, image: HTMLImageElement, x: number, y: number) => {
        console.log(`[ToolbarView] animationIconToToolbar() => ${TOOLBAR_DEBUG_BUILD}`, { iconName, x, y });

        const target = (document.body.getElementsByClassName(iconName)[0] as HTMLElement);

        if (!target) {
            console.log(`[ToolbarView] target NOT FOUND => ${TOOLBAR_DEBUG_BUILD}`, { iconName });
            return;
        }

        image.className = 'toolbar-icon-animation';
        image.style.visibility = 'visible';
        image.style.left = (x + 'px');
        image.style.top = (y + 'px');

        document.body.append(image);

        const targetBounds = target.getBoundingClientRect();
        const imageBounds = image.getBoundingClientRect();

        const left = (imageBounds.x - targetBounds.x);
        const top = (imageBounds.y - targetBounds.y);
        const squared = Math.sqrt(((left * left) + (top * top)));
        const wait = (500 - Math.abs(((((1 / squared) * 100) * 500) * 0.5)));
        const height = 20;

        const motionName = (`ToolbarBouncing[${iconName}]`);

        if (!Motions.getMotionByTag(motionName)) {
            Motions.runMotion(new Queue(new Wait((wait + 8)), new DropBounce(target, 400, 12))).tag = motionName;
        }

        const motion = new Queue(
            new EaseOut(
                new JumpBy(image, wait, ((targetBounds.x - imageBounds.x) + height), (targetBounds.y - imageBounds.y), 100, 1),
                1
            ),
            new Dispose(image)
        );

        Motions.runMotion(motion);
    }, []);

    useRoomEngineEvent<NitroToolbarAnimateIconEvent>(NitroToolbarAnimateIconEvent.ANIMATE_ICON, event => {
        console.log(`[ToolbarView] NitroToolbarAnimateIconEvent.ANIMATE_ICON => ${TOOLBAR_DEBUG_BUILD}`, { x: event.x, y: event.y });
        animationIconToToolbar('icon-inventory', event.image, event.x, event.y);
    });

    return (
        <>
            <TransitionAnimation type={TransitionAnimationTypes.FADE_IN} inProp={isMeExpanded} timeout={300}>
                <ToolbarMeView useGuideTool={useGuideTool} unseenAchievementCount={getTotalUnseen} setMeExpanded={setMeExpanded} />
            </TransitionAnimation>

            <Flex alignItems="center" justifyContent="between" gap={2} className="nitro-toolbar py-1 px-3">
                <Flex gap={2} alignItems="center">
                    <Flex alignItems="center" gap={2}>
                        <Flex
                            center
                            pointer
                            className={'navigation-item item-avatar ' + (isMeExpanded ? 'active ' : '')}
                            onClick={event => {
                                console.log(`[ToolbarView] click: avatar => ${TOOLBAR_DEBUG_BUILD}`, { next: !isMeExpanded });
                                setMeExpanded(!isMeExpanded);
                            }}>
                            <LayoutAvatarImageView figure={userFigure} direction={2} position="absolute" />
                            {(getTotalUnseen > 0) && <LayoutItemCountView count={getTotalUnseen} />}
                        </Flex>

                        {isInRoom && (
                            <Base
                                pointer
                                className="navigation-item icon icon-habbo"
                                onClick={event => {
                                    console.log(`[ToolbarView] click: VisitDesktop => ${TOOLBAR_DEBUG_BUILD}`);
                                    VisitDesktop();
                                }} />
                        )}

                        {!isInRoom && (
                            <Base
                                pointer
                                className="navigation-item icon icon-house"
                                onClick={event => {
                                    console.log(`[ToolbarView] click: navigator/goto/home => ${TOOLBAR_DEBUG_BUILD}`);
                                    CreateLinkEvent('navigator/goto/home');
                                }} />
                        )}

                        <Base pointer className="navigation-item icon icon-rooms" onClick={event => { console.log(`[ToolbarView] click: navigator/toggle => ${TOOLBAR_DEBUG_BUILD}`); CreateLinkEvent('navigator/toggle'); }} />
                        <Base pointer className="navigation-item icon icon-catalog" onClick={event => { console.log(`[ToolbarView] click: catalog/toggle => ${TOOLBAR_DEBUG_BUILD}`); CreateLinkEvent('catalog/toggle'); }} />
                        <Base pointer className="navigation-item icon icon-catalog" onClick={event => { console.log(`[ToolbarView] click: catalog/toggle (dup) => ${TOOLBAR_DEBUG_BUILD}`); CreateLinkEvent('catalog/toggle'); }} />
                        <Base pointer className="navigation-item icon icon-inventory" onClick={event => { console.log(`[ToolbarView] click: prompt/toggle => ${TOOLBAR_DEBUG_BUILD}`); CreateLinkEvent('prompt/toggle'); }} />

                        <Base pointer className="navigation-item icon icon-friendall" onClick={event => { console.log(`[ToolbarView] click: friends/toggle => ${TOOLBAR_DEBUG_BUILD}`); CreateLinkEvent('friends/toggle'); }}>
                            {(requests.length > 0) && <LayoutItemCountView count={requests.length} />}
                        </Base>

                        <Base pointer className="navigation-item icon icon-inventory" onClick={event => { console.log(`[ToolbarView] click: inventory/toggle => ${TOOLBAR_DEBUG_BUILD}`); CreateLinkEvent('inventory/toggle'); }}>
                            {(getFullCount > 0) && <LayoutItemCountView count={getFullCount} />}
                        </Base>

                        {isInRoom && <Base pointer className="navigation-item icon icon-camera" onClick={event => { console.log(`[ToolbarView] click: camera/toggle => ${TOOLBAR_DEBUG_BUILD}`); CreateLinkEvent('camera/toggle'); }} />}
                        {isMod && <Base pointer className="navigation-item icon icon-modtools" onClick={event => { console.log(`[ToolbarView] click: mod-tools/toggle => ${TOOLBAR_DEBUG_BUILD}`); CreateLinkEvent('mod-tools/toggle'); }} />}
                    </Flex>

                    <Flex alignItems="center" id="toolbar-chat-input-container" />
                </Flex>

                <Flex alignItems="center" gap={2}>
                    <Flex gap={2}>
                        <Base pointer className="navigation-item icon icon-friendall" onClick={event => { console.log(`[ToolbarView] click: friends/toggle (right) => ${TOOLBAR_DEBUG_BUILD}`); CreateLinkEvent('friends/toggle'); }}>
                            {(requests.length > 0) && <LayoutItemCountView count={requests.length} />}
                        </Base>

                        {((iconState === MessengerIconState.SHOW) || (iconState === MessengerIconState.UNREAD)) && (
                            <Base
                                pointer
                                className={`navigation-item icon icon-message ${(iconState === MessengerIconState.UNREAD) && 'is-unseen'}`}
                                onClick={event => {
                                    console.log(`[ToolbarView] click: OpenMessengerChat => ${TOOLBAR_DEBUG_BUILD}`, { iconState });
                                    OpenMessengerChat();
                                }} />
                        )}
                    </Flex>

                    <Base id="toolbar-friend-bar-container" className="d-none d-lg-block" />
                </Flex>
            </Flex>
        </>
    );
}
