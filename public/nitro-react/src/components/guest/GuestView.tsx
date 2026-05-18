import { FC, useCallback, useMemo, useState } from "react";
import {
    Base,
    DraggableWindowPosition,
    NitroCardContentView,
    NitroCardHeaderView,
    NitroCardTabsItemView,
    NitroCardTabsView,
    NitroCardView,
} from "../../common";
import { GameLogin } from "./GameLogin";
import { LoginView } from "./LoginView";
import { RegisterCharacterView } from "./RegisterCharacterView";
import "./GuestView.scss";

export const GuestView: FC<{}> = () => {
    const [loginStatusMessage, setLoginStatusMessage] = useState("");
    const [registerStatusMessage, setRegisterStatusMessage] = useState("");
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);

    const uniqueKey = useMemo(() => {
        return isRegisterOpen
            ? "guest-auth-register-v5"
            : "guest-auth-login-v3";
    }, [isRegisterOpen]);

    const onOpenRegister = useCallback(() => {
        setRegisterStatusMessage("");
        setIsRegisterOpen(true);
    }, []);

    const onCloseRegister = useCallback(() => {
        setIsRegisterOpen(false);
        setRegisterStatusMessage("");
    }, []);

    const onLogin = useCallback(
        async (usernameOrEmail: string, password: string) => {
            setLoginStatusMessage("");

            if (!usernameOrEmail || !password) {
                setLoginStatusMessage("Preencha usuário e senha.");
                return;
            }

            try {
                const response = await GameLogin(usernameOrEmail, password);

                if (!response.success || !response.sso) {
                    setLoginStatusMessage(
                        response.message || "Não foi possível entrar.",
                    );
                    return;
                }

                window.location.href = `/game/nitro?sso=${encodeURIComponent(response.sso)}`;
            } catch {
                setLoginStatusMessage("Erro ao tentar entrar no hotel.");
            }
        },
        [],
    );

    const onRegisterPlaceholder = useCallback(
        (data: {
            username: string;
            email: string;
            password: string;
            passwordConfirm: string;
            gender: string;
            race: string;
            className: string;
            look: string;
        }) => {
            setRegisterStatusMessage("Cadastro será ligado na próxima fase.");
        },
        [],
    );

    const onSteam = useCallback(() => {
        window.location.href = "/auth/steam/redirect";
    }, []);

    return (
        <Base
            fit
            className={`position-relative guest-auth-root ${isRegisterOpen ? "register-mode" : "login-mode"}`}
        >
            <NitroCardView
                uniqueKey={uniqueKey}
                className={`guest-auth-card ${isRegisterOpen ? "guest-auth-card-expanded" : ""}`}
                windowPosition={DraggableWindowPosition.TOP_CENTER}
                offsetTop={34}
            >
                <NitroCardHeaderView
                    headerText={
                        isRegisterOpen ? "Criar Conta" : "Entrar no Hotel"
                    }
                    onCloseClick={isRegisterOpen ? onCloseRegister : () => null}
                />
                <NitroCardTabsView>
                    <NitroCardTabsItemView
                        isActive={!isRegisterOpen}
                        onClick={onCloseRegister}
                    >
                        Entrar
                    </NitroCardTabsItemView>
                    <NitroCardTabsItemView
                        isActive={isRegisterOpen}
                        onClick={onOpenRegister}
                    >
                        Cadastrar
                    </NitroCardTabsItemView>
                </NitroCardTabsView>
                <NitroCardContentView className="guest-auth-content">
                    {!isRegisterOpen && (
                        <LoginView
                            statusMessage={loginStatusMessage}
                            onLogin={onLogin}
                            onSteam={onSteam}
                            onGoRegister={onOpenRegister}
                        />
                    )}

                    {isRegisterOpen && (
                        <RegisterCharacterView
                            statusMessage={registerStatusMessage}
                            onRegister={onRegisterPlaceholder}
                            onGoLogin={onCloseRegister}
                        />
                    )}
                </NitroCardContentView>
            </NitroCardView>
        </Base>
    );
};
