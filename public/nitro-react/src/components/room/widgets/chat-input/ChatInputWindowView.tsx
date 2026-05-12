import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { AddEventLinkTracker, GetRoomSession, RemoveLinkEventTracker } from '../../../../api';
import { DraggableWindowPosition, NitroCardContentView, NitroCardHeaderView, NitroCardView } from '../../../../common';
import { ChatInputView } from './ChatInputView';

export const ChatInputWindowView: FC<{}> = props => {
    const [isVisible, setIsVisible] = useState<boolean>(false);

    const isTypingTarget = useCallback((el: EventTarget) => {
        if (!el) return false;

        const node = (el as HTMLElement);

        if (node instanceof HTMLInputElement) return true;
        if (node instanceof HTMLTextAreaElement) return true;
        if ((node as any).isContentEditable === true) return true;

        return false;
    }, []);

    const focusChatInput = useCallback(() => {
        const input = document.querySelector('.nitro-chat-input-window input.chat-input') as HTMLInputElement;

        if (!input) return;

        input.focus();
        input.setSelectionRange((input.value.length * 2), (input.value.length * 2));
    }, []);

    const toggleVisible = useCallback(() => {
        setIsVisible(prev => !prev);
    }, []);

    useEffect(() => {
        // (opcional) igual FriendsList: chat-input/show|hide|toggle
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        toggleVisible();
                        return;
                }
            },
            eventUrlPrefix: 'chat-input/'
        };

        AddEventLinkTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [toggleVisible]);

    useEffect(() => {
        if (GetRoomSession().isSpectator) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey || event.altKey || event.metaKey) return;

            // se estiver digitando em qualquer input/textarea/contenteditable, não intercepta
            if (isTypingTarget(event.target)) return;

            if (event.code === 'KeyC') {
                event.preventDefault();
                event.stopPropagation();

                setIsVisible(prev => !prev);
                return;
            }

            if (event.code === 'Escape' && isVisible) {
                setIsVisible(false);
            }
        };

        document.addEventListener('keydown', onKeyDown, true);

        return () => document.removeEventListener('keydown', onKeyDown, true);
    }, [isVisible, isTypingTarget]);

    useEffect(() => {
        if (!isVisible) return;

        const t = window.setTimeout(() => focusChatInput(), 0);

        return () => window.clearTimeout(t);
    }, [isVisible, focusChatInput]);

    if (GetRoomSession().isSpectator) return null;
    if (!isVisible) return null;

    return (
        <NitroCardView
            uniqueKey="nitro-chat-input-window"
            className="nitro-chat-input-window"
            theme="primary-slim"
            windowPosition={DraggableWindowPosition.CENTER}
            offsetLeft={260}  /* quanto maior, mais pra esquerda */
            offsetTop={170}>
            <NitroCardHeaderView headerText="Chat" onCloseClick={() => setIsVisible(false)} />
            <NitroCardContentView overflow="visible" className="p-2">
                <ChatInputView
                    usePortal={false}
                    closeOnEnter={true}
                    onRequestClose={() => setIsVisible(false)}
                />
            </NitroCardContentView>
        </NitroCardView>
    );
};
