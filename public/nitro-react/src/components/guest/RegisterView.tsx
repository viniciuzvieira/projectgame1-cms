import { FC, useState } from 'react';
import { Button, Column, Flex, FormGroup, Text } from '../../common';

interface RegisterViewProps {
    statusMessage: string;
    onRegister: (data: {
        username: string;
        email: string;
        password: string;
        passwordConfirm: string;
        gender: string;
        race: string;
        className: string;
    }) => void;
    onGoLogin: () => void;
}

export const RegisterView: FC<RegisterViewProps> = props => {
    const { statusMessage = '', onRegister = null, onGoLogin = null } = props;
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [gender, setGender] = useState('M');
    const [race, setRace] = useState('Android');
    const [className, setClassName] = useState('Minerador');

    return (
        <Column gap={3} className="guest-auth-form">
            <Text className="guest-auth-copy">Crie sua conta para entrar no hotel.</Text>

            <Column gap={3}>
                <FormGroup column>
                    <label className="form-label">Usuário</label>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        value={username}
                        onChange={event => setUsername(event.target.value)} />
                </FormGroup>

                <FormGroup column>
                    <label className="form-label">E-mail</label>
                    <input
                        type="email"
                        className="form-control form-control-sm"
                        value={email}
                        onChange={event => setEmail(event.target.value)} />
                </FormGroup>

                <FormGroup column>
                    <label className="form-label">Senha</label>
                    <input
                        type="password"
                        className="form-control form-control-sm"
                        value={password}
                        onChange={event => setPassword(event.target.value)} />
                </FormGroup>

                <FormGroup column>
                    <label className="form-label">Confirmar senha</label>
                    <input
                        type="password"
                        className="form-control form-control-sm"
                        value={passwordConfirm}
                        onChange={event => setPasswordConfirm(event.target.value)} />
                </FormGroup>

                <FormGroup column>
                    <label className="form-label">Sexo</label>
                    <select
                        className="form-select form-select-sm"
                        value={gender}
                        onChange={event => setGender(event.target.value)}>
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                    </select>
                </FormGroup>

                <FormGroup column>
                    <Flex alignItems="center" gap={1}>
                        <label className="form-label">Raça</label>
                        <select
                            className="form-select form-select-sm"
                            value={race}
                            onChange={event => setRace(event.target.value)}>
                            <option value="Android">Android</option>
                            <option value="Ciclope">Ciclope</option>
                            <option value="Bionic">Bionic</option>
                            <option value="Basalts">Basalts</option>
                            <option value="Hammer">Hammer</option>
                        </select>
                    </Flex>
                </FormGroup>

                <FormGroup column>
                    <label className="form-label">Classe</label>
                    <select
                        className="form-select form-select-sm"
                        value={className}
                        onChange={event => setClassName(event.target.value)}>
                        <option value="Minerador">Minerador</option>
                        <option value="Hacker">Hacker</option>
                        <option value="Químico">Químico</option>
                        <option value="Mecânico">Mecânico</option>
                        <option value="Médico">Médico</option>
                        <option value="Programador">Programador</option>
                    </select>
                </FormGroup>

                {statusMessage.length > 0 &&
                    <Text className="guest-auth-copy">{statusMessage}</Text>}

                <Flex gap={2}>
                    <Button
                        variant="success"
                        onClick={() => onRegister({
                            username: username.trim(),
                            email: email.trim(),
                            password,
                            passwordConfirm,
                            gender,
                            race,
                            className
                        })}>
                        Criar conta
                    </Button>

                    <Button variant="secondary" onClick={onGoLogin}>
                        Voltar
                    </Button>
                </Flex>
            </Column>
        </Column>
    );
}