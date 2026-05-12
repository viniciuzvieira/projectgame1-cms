export interface GameLoginResponse
{
    success: boolean;
    message?: string;
    sso?: string;
    username?: string;
}

export const GameLogin = async (usernameOrEmail: string, password: string): Promise<GameLoginResponse> =>
{
    const response = await fetch('/api/game/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
            usernameOrEmail,
            password
        })
    });

    const data = await response.json();

    return data;
}