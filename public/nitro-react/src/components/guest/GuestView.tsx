import { FC, useCallback, useMemo, useState } from "react";
import {
    Base,
    DraggableWindowPosition,
    NitroCardContentView,
    NitroCardHeaderView,
    NitroCardView,
} from "../../common";
import { GameLogin } from "./GameLogin";
import { GameRegister, GameRegisterRequest } from "./GameRegister";
import { LoginView } from "./LoginView";
import { RegisterCharacterView } from "./RegisterCharacterView";
import "./GuestView.scss";

export const GuestView: FC<{}> = () => {
    const [loginStatusMessage, setLoginStatusMessage] = useState("");
    const [registerStatusMessage, setRegisterStatusMessage] = useState("");
    const [isRegisterSubmitting, setIsRegisterSubmitting] = useState(false);
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

    const onRegister = useCallback(
        async (data: GameRegisterRequest) => {
            setRegisterStatusMessage("");

            if (
                !data.username ||
                !data.email ||
                !data.password ||
                !data.passwordConfirm
            ) {
                setRegisterStatusMessage("Preencha os dados da conta.");
                return;
            }

            if (data.password !== data.passwordConfirm) {
                setRegisterStatusMessage("As senhas não coincidem.");
                return;
            }

            setIsRegisterSubmitting(true);
            setRegisterStatusMessage("Criando sua conta...");

            try {
                const response = await GameRegister(data);

                if (!response.success || !response.sso) {
                    setRegisterStatusMessage(
                        response.message || "Não foi possível criar a conta.",
                    );
                    return;
                }

                window.location.href = `/game/nitro?sso=${encodeURIComponent(response.sso)}`;
            } catch {
                setRegisterStatusMessage("Erro ao tentar criar a conta.");
            } finally {
                setIsRegisterSubmitting(false);
            }
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
                        isRegisterOpen
                            ? "Criação de Personagem"
                            : "Central de Acesso"
                    }
                    noCloseButton={!isRegisterOpen}
                    onCloseClick={isRegisterOpen ? onCloseRegister : () => null}
                />
                <div className="guest-auth-console-bar">
                    <div className="guest-auth-console-emblem" aria-hidden="true">
                        <span />
                    </div>
                    <div className="guest-auth-console-heading">
                        <span>
                            {isRegisterOpen
                                ? "PROTOCOLO DE RECRUTAMENTO"
                                : "REDE CYBER HEROIC"}
                        </span>
                        <strong>
                            {isRegisterOpen
                                ? "FORJE SEU HERÓI"
                                : "PORTAL DO HOTEL"}
                        </strong>
                    </div>
                    <div className="guest-auth-console-status">
                        <i aria-hidden="true" />
                        {isRegisterOpen ? "MODO CRIAÇÃO" : "SISTEMA ONLINE"}
                    </div>
                    {isRegisterOpen && (
                        <button
                            type="button"
                            className="guest-auth-console-back"
                            onClick={onCloseRegister}
                        >
                            <span aria-hidden="true">&#8592;</span>
                            Voltar ao acesso
                        </button>
                    )}
                </div>
                <NitroCardContentView className="guest-auth-content">
                    {!isRegisterOpen && (
                        <div className="guest-auth-login-layout">
                            <aside className="guest-auth-login-welcome">
                                <span className="guest-auth-login-kicker">
                                    NOVA TRANSMISSÃO
                                </span>
                                <div
                                    className="guest-auth-login-sigil"
                                    aria-hidden="true"
                                >
                                    <span />
                                </div>
                                <h1>Seu próximo capítulo começa aqui.</h1>
                                <p>
                                    Entre no hotel, encontre sua equipe e construa
                                    sua história nesse universo.
                                </p>
                                <div className="guest-auth-login-signal">
                                    <span>CONEXÃO</span>
                                    <b>ESTÁVEL</b>
                                </div>
                            </aside>
                            <div className="guest-auth-login-panel">
                                <LoginView
                                    statusMessage={loginStatusMessage}
                                    onLogin={onLogin}
                                    onSteam={onSteam}
                                    onGoRegister={onOpenRegister}
                                />
                            </div>
                        </div>
                    )}

                    {isRegisterOpen && (
                        <RegisterCharacterView
                            statusMessage={registerStatusMessage}
                            isSubmitting={isRegisterSubmitting}
                            onRegister={onRegister}
                            onGoLogin={onCloseRegister}
                        />
                    )}
                </NitroCardContentView>
            </NitroCardView>
        </Base>
    );
};
