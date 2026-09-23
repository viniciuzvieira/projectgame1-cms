import { ILinkEventTracker, NitroSettingsEvent, UserSettingsCameraFollowComposer, UserSettingsEvent, UserSettingsOldChatComposer, UserSettingsRoomInvitesComposer, UserSettingsSoundComposer } from '@nitrots/nitro-renderer';
import { FC, useEffect, useState } from 'react';
import { AddEventLinkTracker, DispatchMainEvent, DispatchUiEvent, RemoveLinkEventTracker, SendMessageComposer } from '../../api';
import { NitroCardContentView, NitroCardHeaderView, NitroCardView } from '../../common';
import { useCatalogPlaceMultipleItems, useCatalogSkipPurchaseConfirmation, useMessageEvent } from '../../hooks';
import { GameIcon } from '../game-shell/GameIcon';
import { useGameLocale } from '../game-shell/GameLocale';
import { GameTheme, keyLabel, loadGameProfile, saveGamePreferences, useGameProfile, validTerminalKey } from '../game-shell/GameProfile';

const tabs = [{ id: 'appearance', label: 'Aparência' }, { id: 'audio', label: 'Som' }, { id: 'controls', label: 'Teclas' }, { id: 'gameplay', label: 'Jogo' }];

export const UserSettingsView: FC = () =>
{
    const [ visible, setVisible ] = useState(false);
    const [ tab, setTab ] = useState('appearance');
    const [ settings, setSettings ] = useState<NitroSettingsEvent>(null);
    const [ capturing, setCapturing ] = useState(false);
    const [ message, setMessage ] = useState('');
    const [ placeMultiple, setPlaceMultiple ] = useCatalogPlaceMultipleItems();
    const [ skipConfirmation, setSkipConfirmation ] = useCatalogSkipPurchaseConfirmation();
    const profile = useGameProfile();
    const { t } = useGameLocale();

    useMessageEvent<UserSettingsEvent>(UserSettingsEvent, event =>
    {
        const parser = event.getParser();
        const next = new NitroSettingsEvent();
        next.volumeSystem = parser.volumeSystem; next.volumeFurni = parser.volumeFurni; next.volumeTrax = parser.volumeTrax;
        next.oldChat = parser.oldChat; next.roomInvites = parser.roomInvites; next.cameraFollow = parser.cameraFollow;
        next.flags = parser.flags; next.chatType = parser.chatType;
        setSettings(next); DispatchMainEvent(next);
    });
    useEffect(() =>
    {
        const tracker: ILinkEventTracker = { eventUrlPrefix: 'user-settings/', linkReceived: url =>
        {
            const action = url.split('/')[1];
            if(action === 'toggle') setVisible(value => !value);
            if(action === 'show') setVisible(true);
            if(action === 'hide') setVisible(false);
        } };
        AddEventLinkTracker(tracker);
        return () => RemoveLinkEventTracker(tracker);
    }, []);
    useEffect(() => { if(settings) DispatchUiEvent(settings); }, [ settings ]);
    useEffect(() => { if(visible) loadGameProfile(); else setCapturing(false); }, [ visible ]);
    useEffect(() =>
    {
        if(!capturing || !visible || tab !== 'controls') return;
        document.documentElement.dataset.keybindingCapture = 'true';
        const capture = (event: KeyboardEvent) =>
        {
            event.preventDefault(); event.stopImmediatePropagation();
            if(event.repeat) return;
            if(event.key === 'Escape') { setCapturing(false); return; }
            if(['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) { setMessage('WASD é reservado para movimentação.'); return; }
            if(event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || !validTerminalKey(event.code))
            { setMessage('Use uma letra, número ou pontuação, sem modificadores.'); return; }
            setCapturing(false); setMessage('');
            saveGamePreferences({ terminal_key: event.code });
        };
        window.addEventListener('keydown', capture, true);
        return () =>
        {
            delete document.documentElement.dataset.keybindingCapture;
            window.removeEventListener('keydown', capture, true);
        };
    }, [ capturing, visible, tab ]);

    const update = (field: string, value: boolean | number) =>
    {
        if(!settings) return;
        const next = settings.clone();
        next[field] = value;
        if(field === 'oldChat') SendMessageComposer(new UserSettingsOldChatComposer(value as boolean));
        if(field === 'roomInvites') SendMessageComposer(new UserSettingsRoomInvitesComposer(value as boolean));
        if(field === 'cameraFollow') SendMessageComposer(new UserSettingsCameraFollowComposer(value as boolean));
        setSettings(next); DispatchMainEvent(next);
    };
    const saveVolume = () =>
    {
        if(settings) SendMessageComposer(new UserSettingsSoundComposer(Math.round(settings.volumeSystem), Math.round(settings.volumeFurni), Math.round(settings.volumeTrax)));
    };
    if(!visible) return null;
    const disabled = !profile.loaded || profile.saving;
    const audio = [{ field: 'volumeSystem', label: 'Efeitos da interface' }, { field: 'volumeFurni', label: 'Objetos do quarto' }, { field: 'volumeTrax', label: 'Música' }];
    return <NitroCardView uniqueKey="user-settings" className="user-settings-window game-settings" theme="primary-slim">
        <NitroCardHeaderView headerText={ t('Configurações') } onCloseClick={ () => setVisible(false) } />
        <NitroCardContentView gap={ 0 }>
            <div className="game-settings-layout">
                <nav className="game-settings-nav" aria-label={ t('Configurações') } role="tablist" aria-orientation="vertical">
                    <div className="game-settings-mark" aria-hidden="true">CH<span>CONTROL CENTER</span></div>
                    { tabs.map(item => <button key={ item.id } role="tab" id={ `settings-tab-${ item.id }` } aria-selected={ tab === item.id } aria-controls="settings-panel" onClick={ () => { setTab(item.id); setCapturing(false); setMessage(''); } }><GameIcon name={ item.id } />{ t(item.label) }</button>) }
                </nav>
                <section className="game-settings-panel" id="settings-panel" role="tabpanel" aria-labelledby={ `settings-tab-${ tab }` }>
                    <span className="game-section-code">SYSTEM / { String(tabs.findIndex(item => item.id === tab) + 1).padStart(2, '0') }</span>
                    <h2>{ t(tabs.find(item => item.id === tab).label) }</h2>
                    { tab === 'appearance' && <>
                        <p>{ t('Personalize sua estação') }</p>
                        <fieldset disabled={ disabled }><legend>{ t('Tema da interface') }</legend>
                            <div className="theme-options">{ ([['dark', 'Escuro'], ['purple', 'Roxo'], ['light', 'Claro']] as [GameTheme, string][]).map(([theme, label]) => <button key={ theme } className={ `theme-choice theme-preview-${ theme }` } aria-pressed={ profile.preferences.theme === theme } onClick={ () => saveGamePreferences({ theme }) }><span className="theme-preview"><i /><b /><i /></span>{ t(label) }</button>) }</div>
                        </fieldset>
                        <label className="settings-row" htmlFor="game-locale">{ t('Idioma') }<select id="game-locale" disabled={ disabled } value={ profile.preferences.locale } onChange={ event => saveGamePreferences({ locale: event.target.value as 'pt' | 'en' | 'es' }) }><option value="pt">Português</option><option value="en">English</option><option value="es">Español</option></select></label>
                    </> }
                    { tab === 'audio' && (settings ? audio.map(item => <label key={ item.field } className="settings-volume" htmlFor={ item.field }><span><GameIcon name="audio" />{ t(item.label) }<output>{ Math.round(settings[item.field]) }%</output></span><input id={ item.field } type="range" min="0" max="100" step="1" value={ settings[item.field] } onChange={ event => update(item.field, Number(event.target.value)) } onPointerUp={ saveVolume } onKeyUp={ saveVolume } onBlur={ saveVolume } /></label>) : <p role="status">{ t('Carregando...') }</p>) }
                    { tab === 'controls' && <>
                        <div className="settings-key-row"><span><b>{ t('Terminal') }</b><small>{ t('Alterar tecla') }</small></span><button className={ capturing ? 'is-capturing' : '' } disabled={ disabled } onClick={ () => { setCapturing(true); setMessage(''); } }>{ capturing ? t('Pressione uma tecla. Esc cancela.') : <kbd>{ keyLabel(profile.preferences.terminal_key) }</kbd> }</button></div>
                        <div className="settings-key-row"><span><b>{ t('Movimentação') }</b><small>{ t('WASD é reservado para movimentação.') }</small></span><span className="movement-keys">{ ['W', 'A', 'S', 'D'].map(key => <kbd key={ key }>{ key }</kbd>) }</span></div>
                        { message && <p role="alert" className="settings-warning">{ t(message) }</p> }
                        <button className="btn btn-secondary" disabled={ disabled || capturing || profile.preferences.terminal_key === 'KeyC' } onClick={ () => saveGamePreferences({ terminal_key: 'KeyC' }) }>{ t('Restaurar C') }</button>
                    </> }
                    { tab === 'gameplay' && (settings ? <>
                        { [{ field: 'oldChat', label: 'Chat clássico' }, { field: 'roomInvites', label: 'Ignorar convites de quartos' }, { field: 'cameraFollow', label: 'Desativar câmera seguindo avatar' }].map(item => <label key={ item.field } className="settings-row"><span>{ t(item.label) }</span><input type="checkbox" checked={ settings[item.field] } onChange={ event => update(item.field, event.target.checked) } /></label>) }
                        <label className="settings-row">{ t('Colocar vários objetos') }<input type="checkbox" checked={ placeMultiple } onChange={ event => setPlaceMultiple(event.target.checked) } /></label>
                        <label className="settings-row">{ t('Pular confirmação de compra') }<input type="checkbox" checked={ skipConfirmation } onChange={ event => setSkipConfirmation(event.target.checked) } /></label>
                    </> : <p role="status">{ t('Carregando...') }</p>) }
                    <footer className="settings-status" role="status">{ profile.error ? <>{ t('Não foi possível salvar. Tente novamente.') } <button onClick={ loadGameProfile }>{ t('Tentar novamente') }</button></> : t(profile.saving ? 'Salvando...' : 'As alterações ficam salvas na sua conta.') }</footer>
                </section>
            </div>
        </NitroCardContentView>
    </NitroCardView>;
};
