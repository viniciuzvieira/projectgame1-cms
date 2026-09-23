export interface GameRegisterRequest {
    username: string;
    email: string;
    password: string;
    passwordConfirm: string;
    gender: string;
    race: string;
    className: string;
    look: string;
}

export interface GameRegisterResponse {
    success: boolean;
    message?: string;
    sso?: string;
    username?: string;
}

export const GameRegister = async (
    request: GameRegisterRequest,
): Promise<GameRegisterResponse> => {
    const response = await fetch("/api/game/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(request),
    });

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
        return {
            success: false,
            message: `O servidor respondeu de forma inesperada (${response.status}).`,
        };
    }

    const data = await response.json();

    if (response.ok) {
        return data;
    }

    const validationMessage = Object.values(data.errors || {})
        .flat()
        .find((message) => typeof message === "string");

    return {
        success: false,
        message:
            (validationMessage as string) ||
            data.message ||
            "Não foi possível criar a conta.",
    };
};
