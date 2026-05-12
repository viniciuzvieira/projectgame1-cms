import { FC, useState } from 'react';
import { Button, Column, Flex, FormGroup, Text } from '../../common';

interface LoginViewProps {
    statusMessage: string;
    onLogin: (usernameOrEmail: string, password: string) => void;
    onSteam: () => void;
    onGoRegister: () => void;
}

export const LoginView: FC<LoginViewProps> = props => {
    const { statusMessage = '', onLogin = null, onSteam = null, onGoRegister = null } = props;
    const [usernameOrEmail, setUsernameOrEmail] = useState('');
    const [password, setPassword] = useState('');

    return (
        <Column gap={3} className="guest-auth-form">
            <Text className="guest-auth-copy">Entre com sua conta para acessar o hotel.</Text>

            <Column gap={3}>
                <FormGroup column>
                    <label className="form-label">Usuário ou e-mail</label>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        value={usernameOrEmail}
                        onChange={event => setUsernameOrEmail(event.target.value)} />
                </FormGroup>

                <FormGroup column>
                    <label className="form-label">Senha</label>
                    <input
                        type="password"
                        className="form-control form-control-sm"
                        value={password}
                        onChange={event => setPassword(event.target.value)} />
                </FormGroup>

                {statusMessage.length > 0 &&
                    <Text className="guest-auth-copy">{statusMessage}</Text>}

                <Flex gap={2}>
                    <Button variant="success" onClick={() => onLogin(usernameOrEmail.trim(), password)}>
                        Entrar
                    </Button>
                    <Button variant="primary" onClick={onSteam}>
                        Entrar com Steam
                    </Button>
                </Flex>

                <Flex gap={2} justifyContent="between" alignItems="center">
                    <Text className="guest-auth-copy">Ainda não tem conta?</Text>
                    <Button variant="secondary" onClick={onGoRegister}>
                        Criar conta
                    </Button>
                </Flex>
            </Column>
        </Column>
    );
}