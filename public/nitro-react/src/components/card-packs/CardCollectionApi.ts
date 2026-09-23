import { t } from '../game-shell/GameLocale';
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
    decks: CollectionDeck[];
    csrf_token?: string;
}

export interface CollectionDeck
{
    id: number;
    name: string;
    is_primary: boolean;
    cards: CollectionCard[];
}

export interface DeckMutationResult
{
    decks: CollectionDeck[];
    deck_id?: number;
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

const request = async <T,>(url: string, body?: unknown, method = body ? 'POST' : 'GET'): Promise<T> =>
{
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);

    try
    {
        const response = await fetch(url, {
            method, credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
            headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(method !== 'GET' ? { 'X-CSRF-TOKEN': csrfToken } : {}) },
            body: body ? JSON.stringify(body) : undefined
        });
        if(response.redirected || !response.headers.get('content-type')?.includes('application/json'))
            throw new CardCollectionError(t("Sua sessão precisa ser verificada. Entre novamente no jogo."), 401);
        const data = await response.json().catch(() => ({}));

        if(!response.ok)
        {
            const validation = Object.values(data.errors || {}).flat().find(value => typeof value === 'string');
            throw new CardCollectionError(response.status === 401 ? t("Entre novamente no jogo para acessar sua coleção.") :
                response.status === 419 ? t("Sua sessão expirou. Atualize a coleção e tente novamente.") :
                    response.status === 404 ? t("Este item não está mais disponível. Atualize a coleção.") :
                        response.status === 429 ? t("Aguarde alguns instantes antes de tentar novamente.") :
                            response.status >= 500 ? (url.endsWith('/open') ? t("O servidor não confirmou a abertura. Tente novamente para verificar sem gastar outro pacote.") : t("O servidor não confirmou a operação. Atualize a coleção para verificar.")) :
                                (validation as string) || data.message || t("Não foi possível acessar a coleção."), response.status);
        }

        return data as T;
    }
    catch(error)
    {
        if(error instanceof CardCollectionError) throw error;
        throw new CardCollectionError(url.endsWith('/open') ? t("A conexão foi interrompida. Tente novamente para confirmar a mesma abertura.") : t("A conexão foi interrompida. Atualize a coleção para verificar se a alteração foi salva."), 0);
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

const mutateDeck = async (path: string, method: string, body?: unknown): Promise<DeckMutationResult> =>
{
    if(!csrfToken) await loadCardCollection();
    // IIS blocks native PUT/PATCH/DELETE; Laravel restores the verb before routing.
    const payload = { ...(body as Record<string, unknown> || {}), ...(method !== 'POST' ? { _method: method } : {}) };
    return request<DeckMutationResult>(`/api/game/collection/decks${ path }`, payload, 'POST');
};

export const createCardDeck = (name: string) => mutateDeck('', 'POST', { name });
export const renameCardDeck = (id: number, name: string) => mutateDeck(`/${ id }`, 'PATCH', { name });
export const deleteCardDeck = (id: number) => mutateDeck(`/${ id }`, 'DELETE');
export const makePrimaryCardDeck = (id: number) => mutateDeck(`/${ id }/primary`, 'PUT');
export const setCardDeckQuantity = (id: number, cardId: number, quantity: number) => mutateDeck(`/${ id }/cards/${ cardId }`, 'PUT', { quantity });

export const createOpeningRequestId = (): string =>
{
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
    return `${ hex.slice(0, 8) }-${ hex.slice(8, 12) }-${ hex.slice(12, 16) }-${ hex.slice(16, 20) }-${ hex.slice(20) }`;
};
