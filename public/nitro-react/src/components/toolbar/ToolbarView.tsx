import { Dispose, DropBounce, EaseOut, JumpBy, Motions, NitroToolbarAnimateIconEvent, PerkAllowancesMessageEvent, PerkEnum, Queue, Wait } from '@nitrots/nitro-renderer';
import { FC, useCallback, useState } from 'react';
import { CreateLinkEvent, GetSessionDataManager, MessengerIconState, OpenMessengerChat, VisitDesktop } from '../../api';
import { Base, Flex, LayoutAvatarImageView, LayoutItemCountView, TransitionAnimation, TransitionAnimationTypes } from '../../common';
import { useAchievements, useFriends, useInventoryUnseenTracker, useMessageEvent, useMessenger, useRoomEngineEvent, useSessionInfo } from '../../hooks';
import { ToolbarMeView } from './ToolbarMeView';
import { ToolbarButtonView } from './ToolbarButtonView';
import { GameIcon } from '../game-shell/GameIcon';
import { useGameLocale } from '../game-shell/GameLocale';

export const ToolbarView: FC<{ isInRoom: boolean }> = props => {
    useGameLocale();
    const { isInRoom } = props;

    const [isMeExpanded, setMeExpanded] = useState(false);
    const [useGuideTool, setUseGuideTool] = useState(false);
    const { userFigure = null } = useSessionInfo();
    const { getFullCount = 0 } = useInventoryUnseenTracker();
    const { getTotalUnseen = 0 } = useAchievements();
    const { requests = [] } = useFriends();
    const { iconState = MessengerIconState.HIDDEN } = useMessenger();
    const isMod = GetSessionDataManager().isModerator;

    useMessageEvent<PerkAllowancesMessageEvent>(PerkAllowancesMessageEvent, event => {
        const parser = event.getParser();

        setUseGuideTool(parser.isAllowed(PerkEnum.USE_GUIDE_TOOL));
    });

    const animationIconToToolbar = useCallback((iconName: string, image: HTMLImageElement, x: number, y: number) => {
        const target = (document.body.getElementsByClassName(iconName)[0] as HTMLElement);

        if (!target) return;

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

        const motion = new Queue(new EaseOut(new JumpBy(image, wait, ((targetBounds.x - imageBounds.x) + height), (targetBounds.y - imageBounds.y), 100, 1), 1), new Dispose(image));

        Motions.runMotion(motion);
    }, []);

    useRoomEngineEvent<NitroToolbarAnimateIconEvent>(NitroToolbarAnimateIconEvent.ANIMATE_ICON, event => {
        animationIconToToolbar('icon-inventory', event.image, event.x, event.y);
    });

    return (
        <>
            <TransitionAnimation type={TransitionAnimationTypes.FADE_IN} inProp={isMeExpanded} timeout={300}>
                <ToolbarMeView useGuideTool={useGuideTool} unseenAchievementCount={getTotalUnseen} setMeExpanded={setMeExpanded} />
            </TransitionAnimation>
            <Flex alignItems="center" justifyContent="between" gap={2} className="nitro-toolbar py-1 px-3">
                <Flex gap={2} alignItems="center" className="cyber-toolbar-primary">
                    <div className="cyber-toolbar-brand" aria-hidden="true"><span>CH</span><small>SYS / 01</small></div>
                    <Flex alignItems="center" gap={2} className="cyber-toolbar-actions">
                        <ToolbarButtonView label="Meu personagem" className="item-avatar" active={isMeExpanded} onClick={() => setMeExpanded(!isMeExpanded)}>
                            <LayoutAvatarImageView figure={userFigure} direction={2} position="absolute" />
                            {(getTotalUnseen > 0) &&
                                <LayoutItemCountView count={getTotalUnseen} />}
                        </ToolbarButtonView>
                        {isInRoom &&
                            <ToolbarButtonView label="Voltar ao hotel" icon="icon-habbo" onClick={() => VisitDesktop()} />}
                        {!isInRoom &&
                            <ToolbarButtonView label="Meu quarto" icon="icon-house" onClick={() => CreateLinkEvent('navigator/goto/home')} />}
                        <ToolbarButtonView label="Navegador de quartos" icon="icon-rooms" onClick={() => CreateLinkEvent('navigator/toggle')} />
                        <ToolbarButtonView label="Catalogo" icon="icon-catalog" onClick={() => CreateLinkEvent('catalog/toggle')} />
                        <ToolbarButtonView label="Minha colecao de pacotes e cartas" onClick={() => CreateLinkEvent('card-collection/toggle')}>
                            <GameIcon name="folder" />
                        </ToolbarButtonView>
                        <ToolbarButtonView label="Evolução de skills" onClick={() => CreateLinkEvent('game-skills/toggle')}><GameIcon name="skills" /></ToolbarButtonView>
                        <ToolbarButtonView label="Configurações" onClick={() => CreateLinkEvent('user-settings/toggle')}><GameIcon name="settings" /></ToolbarButtonView>
                        <ToolbarButtonView label="Inventario" icon="icon-inventory" onClick={() => CreateLinkEvent('inventory/toggle')}>
                            {(getFullCount > 0) &&
                                <LayoutItemCountView count={getFullCount} />}
                        </ToolbarButtonView>
                        {isInRoom &&
                            <ToolbarButtonView label="Camera" icon="icon-camera" onClick={() => CreateLinkEvent('camera/toggle')} />}
                        {isMod &&
                            <ToolbarButtonView label="Moderacao" icon="icon-modtools" onClick={() => CreateLinkEvent('mod-tools/toggle')} />}
                    </Flex>
                    <Flex alignItems="center" id="toolbar-chat-input-container" />
                </Flex>
                <Flex alignItems="center" gap={2} className="cyber-toolbar-secondary">
                    <Flex gap={2} className="cyber-toolbar-actions">
                        <ToolbarButtonView label="Amigos" icon="icon-friendall" onClick={() => CreateLinkEvent('friends/toggle')}>
                            {(requests.length > 0) &&
                                <LayoutItemCountView count={requests.length} />}
                        </ToolbarButtonView>
                        {((iconState === MessengerIconState.SHOW) || (iconState === MessengerIconState.UNREAD)) &&
                            <ToolbarButtonView label="Mensagens" icon={`icon-message ${iconState === MessengerIconState.UNREAD ? 'is-unseen' : ''}`} onClick={() => OpenMessengerChat()} />}
                    </Flex>
                    <Base id="toolbar-friend-bar-container" className="d-none d-lg-block" />
                </Flex>
            </Flex>
        </>
    );
}
