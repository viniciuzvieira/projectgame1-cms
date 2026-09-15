export interface CollectionPack
{
    id: number;
    code: string;
    name: string;
    description: string;
    design_key: string;
    quantity: number;
}

export interface CollectionCard
{
    id: number;
    code: string;
    name: string;
    description: string;
    rarity: string;
    series: string;
    design_key: string;
    figure: string;
    power: number;
    quantity?: number;
}

export interface CardCollection
{
    packs: CollectionPack[];
    cards: CollectionCard[];
    csrf_token?: string;
}

export interface CollectionOpening
{
    opening_id: number;
    request_id: string;
    card: CollectionCard;
    collection: CardCollection;
}

export class CardCollectionError extends Error
{
    constructor(message: string, public status: number)
    {
        super(message);
    }
}

let csrfToken = '';

const request = async <T,>(url: string, body?: unknown): Promise<T> =>
{
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);

    try
    {
        const response = await fetch(url, {
            method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
            headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(body ? { 'X-CSRF-TOKEN': csrfToken } : {}) },
            body: body ? JSON.stringify(body) : undefined
        });
        if(response.redirected || !response.headers.get('content-type')?.includes('application/json'))
            throw new CardCollectionError('Sua sessao precisa ser verificada. Entre novamente no jogo.', 401);
        const data = await response.json().catch(() => ({}));

        if(!response.ok)
        {
            const validation = Object.values(data.errors || {}).flat().find(value => typeof value === 'string');
            throw new CardCollectionError(response.status === 401 ? 'Entre novamente no jogo para acessar sua colecao.' :
                response.status === 419 ? 'Sua sessao expirou. Atualize a colecao e tente novamente.' :
                    response.status === 404 ? 'Este pacote nao esta mais disponivel.' :
                        response.status === 429 ? 'Aguarde alguns instantes antes de tentar novamente.' :
                            response.status >= 500 ? 'O servidor nao confirmou a abertura. Tente novamente para verificar sem gastar outro pacote.' :
                                (validation as string) || data.message || 'Nao foi possivel acessar a colecao.', response.status);
        }

        return data as T;
    }
    catch(error)
    {
        if(error instanceof CardCollectionError) throw error;
        throw new CardCollectionError('A conexao foi interrompida. Tente novamente para confirmar a mesma abertura.', 0);
    }
    finally { window.clearTimeout(timeout); }
};

export const loadCardCollection = async (): Promise<CardCollection> =>
{
    const collection = await request<CardCollection>('/api/game/collection');
    csrfToken = collection.csrf_token || '';
    return collection;
};

export const openCollectionPack = async (packId: number, requestId: string): Promise<CollectionOpening> =>
{
    if(!csrfToken) await loadCardCollection();
    return request<CollectionOpening>(`/api/game/collection/packs/${ packId }/open`, { request_id: requestId });
};

export const createOpeningRequestId = (): string =>
{
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
    return `${ hex.slice(0, 8) }-${ hex.slice(8, 12) }-${ hex.slice(12, 16) }-${ hex.slice(16, 20) }-${ hex.slice(20) }`;
};
