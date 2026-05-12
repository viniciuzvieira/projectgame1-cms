import { FC, useCallback, useState } from 'react';
import { Base, NitroCardContentView, NitroCardHeaderView, NitroCardTabsItemView, NitroCardTabsView, NitroCardView } from '../../common';
import { GameLogin } from './GameLogin';
import { LoginView } from './LoginView';
import { RegisterView } from './RegisterView';
import './GuestView.scss';

type GuestTab = 'login' | 'register';

export const GuestView: FC<{}> = props => {
    const [activeTab, setActiveTab] = useState<GuestTab>('login');
    const [statusMessage, setStatusMessage] = useState('');

    const onLogin = useCallback(async (usernameOrEmail: string, password: string) => {
        setStatusMessage('');

        if (!usernameOrEmail || !password) {
            setStatusMessage('Preencha usuário e senha.');
            return;
        }

        try {
            const response = await GameLogin(usernameOrEmail, password);

            if (!response.success || !response.sso) {
                setStatusMessage(response.message || 'Não foi possível entrar.');
                return;
            }

            window.location.href = '/game/nitro?sso=' + encodeURIComponent(response.sso);
        }
        catch {
            setStatusMessage('Erro ao tentar entrar no hotel.');
        }
    }, []);

    const onRegisterPlaceholder = useCallback((data: {
        username: string;
        email: string;
        password: string;
        passwordConfirm: string;
        gender: string;
        race: string;
        className: string;
    }) => {
        setStatusMessage('Cadastro será ligado na próxima fase.');
    }, []);

    const onSteam = useCallback(() => {
        window.location.href = '/auth/steam/redirect';
    }, []);

    return (
        <Base fit className="position-relative">
            <NitroCardView uniqueKey="guest-auth" className="guest-auth-card">
                <NitroCardHeaderView headerText={activeTab === 'login' ? 'Entrar no Hotel' : 'Criar Conta'} onCloseClick={() => null} />
                <NitroCardTabsView>
                    <NitroCardTabsItemView isActive={activeTab === 'login'} onClick={() => setActiveTab('login')}>
                        Entrar
                    </NitroCardTabsItemView>
                    <NitroCardTabsItemView isActive={activeTab === 'register'} onClick={() => setActiveTab('register')}>
                        Cadastrar
                    </NitroCardTabsItemView>
                </NitroCardTabsView>
                <NitroCardContentView>
                    {activeTab === 'login' &&
                        <LoginView
                            statusMessage={statusMessage}
                            onLogin={onLogin}
                            onSteam={onSteam}
                            onGoRegister={() => setActiveTab('register')} />}
                    {activeTab === 'register' &&
                        <RegisterView
                            statusMessage={statusMessage}
                            onRegister={onRegisterPlaceholder}
                            onGoLogin={() => setActiveTab('login')} />}
                </NitroCardContentView>
            </NitroCardView>
        </Base>
    );
}