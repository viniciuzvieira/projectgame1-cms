import { FC, useEffect } from 'react';
import { ChatMessageTypeEnum } from '../../../../api';
import { useChatInputWidget, useSessionInfo } from '../../../../hooks';

export const KbChatBridgeView: FC<{}> = () => {
    const { chatStyleId = 0 } = useSessionInfo();
    const { sendChat = null, setIsTyping = null, setIsIdle = null } = useChatInputWidget();

    useEffect(() => {
        (window as any).__kbSendChatBridge = (text: string, shout: boolean = false, whisperTo: string = '') => {
            if (!sendChat) return false;

            const msg = (text ?? '').toString().trim();
            if (!msg.length) return false;

            setIsTyping?.(false);
            setIsIdle?.(false);

            const chatType =
                whisperTo?.length
                    ? ChatMessageTypeEnum.CHAT_WHISPER
                    : (shout ? ChatMessageTypeEnum.CHAT_SHOUT : ChatMessageTypeEnum.CHAT_DEFAULT);

            sendChat(msg, chatType, whisperTo || '', chatStyleId);

            return true;
        };

        return () => {
            try { delete (window as any).__kbSendChatBridge; } catch { }
        };
    }, [sendChat, chatStyleId, setIsTyping, setIsIdle]);

    return null;
}