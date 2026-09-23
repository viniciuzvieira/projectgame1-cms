import { t } from '../game-shell/GameLocale';
import { FC, KeyboardEvent, MouseEvent, useEffect, useRef, useState } from 'react';
import { openGameContextMenu } from '../game-context-menu/GameContextMenu';
import { CollectionCard, CollectionDeck, createCardDeck, DeckMutationResult, deleteCardDeck, makePrimaryCardDeck, renameCardDeck, restoreCardDeck, setCardDeckQuantity } from './CardCollectionApi';
import { CollectionCardArtView } from './CollectionCardArtView';
import { GameIcon } from '../game-shell/GameIcon';

export type RunDeckMutation = (operation: () => Promise<DeckMutationResult>, message: string) => Promise<DeckMutationResult>;

interface CardDecksViewProps
{
    decks: CollectionDeck[];
    cards: CollectionCard[];
    query: string;
    selectedDeck?: CollectionDeck;
    onSelectDeck: (id: number) => void;
    onOpenTrash: () => void;
    disabled: boolean;
    mutate: RunDeckMutation;
}

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const cardCountLabel = (deck: CollectionDeck) =>
{
    const count = deck.cards.length;
    return t(count === 1 ? '1 carta' : '{count} cartas', { count });
};

const DeckEditor: FC<{ deck: CollectionDeck } & Pick<CardDecksViewProps, 'cards' | 'query' | 'onSelectDeck' | 'disabled' | 'mutate'>> = ({ deck, cards, query, onSelectDeck, disabled, mutate }) =>
{
    const [ name, setName ] = useState(deck.name);
    const [ confirmDelete, setConfirmDelete ] = useState(false);
    const filtered = cards.filter(card => normalize(t(card.name)).includes(normalize(query)));
    const hasCard = (cardId: number) => deck.cards.some(card => card.id === cardId);
    const update = (card: CollectionCard, count: number) => mutate(() => setCardDeckQuantity(deck.id, card.id, count), count === 0 ? t("Carta removida apenas deste deck.") : t("Deck atualizado. Sua coleção permanece intacta."));
    const removeDeck = async () =>
    {
        const result = await mutate(() => deleteCardDeck(deck.id), t("Deck movido para a lixeira. Nenhuma carta foi perdida."));
        if(result) onSelectDeck(null);
    };
    const menu = (event: MouseEvent<HTMLElement>, card: CollectionCard) =>
    {
        event.preventDefault(); event.stopPropagation();
        if(disabled) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        openGameContextMenu({ x: event.clientX || bounds.left, y: event.clientY || bounds.bottom, title: t(card.name), items: [
            { id: 'remove-card', icon: 'trash', label: t("Remover do deck"), action: () => { update(card, 0); } }
        ] });
    };
    return <section className="collection-deck-editor" aria-label={ t('Editar deck {name}', { name: deck.name }) }>
        <header className="collection-deck-controls">
            <div className="collection-deck-heading">
                <button type="button" className="btn btn-secondary collection-deck-back" disabled={ disabled } onClick={ () => onSelectDeck(null) }><span aria-hidden="true">{ '<' }</span>{ t("Voltar aos decks") }</button>
                <span className="collection-eyebrow">{ deck.is_primary ? t("DECK PRINCIPAL") : t("MONTAGEM DE DECK") }</span>
                <span>{ cardCountLabel(deck) }</span>
            </div>
            <div className="collection-deck-settings">
                <form className="collection-deck-name" onSubmit={ event => { event.preventDefault(); mutate(() => renameCardDeck(deck.id, name.trim()), t("Nome do deck atualizado.")); } }>
                    <label className="visually-hidden" htmlFor="deck-name">{ t("Nome do deck") }</label>
                    <input id="deck-name" className="form-control" value={ name } onChange={ event => setName(event.target.value) } maxLength={ 60 } required disabled={ disabled } />
                    <button type="submit" className="btn btn-secondary" disabled={ disabled || !name.trim() || name.trim() === deck.name }>{ t("Salvar nome") }</button>
                </form>
                <div className="collection-deck-actions">
                    <button type="button" className="btn btn-success" disabled={ disabled || deck.is_primary } onClick={ () => mutate(() => makePrimaryCardDeck(deck.id), t("Deck principal definido.")) }>{ deck.is_primary ? t("Seu deck principal") : t("Usar como principal") }</button>
                    <button type="button" className="btn btn-secondary" disabled={ disabled } onClick={ () => setConfirmDelete(value => !value) }>{ t("Excluir deck") }</button>
                </div>
            </div>
            { confirmDelete && <div className="collection-deck-confirm" role="alert"><p>{ t("Excluir este deck? Todas as cartas continuam na sua coleção.") }</p><button type="button" className="btn btn-danger" disabled={ disabled } onClick={ removeDeck }>{ t("Confirmar exclusão") }</button><button type="button" className="btn btn-secondary" disabled={ disabled } onClick={ () => setConfirmDelete(false) }>{ t("Cancelar") }</button></div> }
        </header>
        <div className="collection-deck-workspace">
            <section className="collection-deck-source" aria-label={ t("Cartas da coleção para adicionar") }>
                <div className="collection-section-heading"><strong>{ t("SUA COLEÇÃO") }</strong><span>{ t('{count} modelos', { count: filtered.length }) }</span></div>
                <div className="collection-deck-scroll">
                    <div className="collection-deck-cards">
                        { filtered.map(card =>
                        {
                            const added = hasCard(card.id);
                            return <button key={ card.id } type="button" className={ `collection-deck-pick collection-tile card-tile${ added ? ' is-full' : '' }` } disabled={ disabled || added } aria-label={ added ? `${ t(card.name) }, ${ t('já adicionado') }` : `Adicionar ${ t(card.name) } ao deck ${ deck.name }` } onClick={ () => update(card, 1) }>
                                <CollectionCardArtView card={ card } />
                                <strong>{ t(card.name) }</strong><small>{ added ? t('já adicionado') : t('Disponível') }</small>
                                <span className="collection-deck-add-label">{ added ? t('já adicionado') : t("+ Adicionar") }</span>
                            </button>;
                        }) }
                    </div>
                    { !filtered.length && <div className="collection-empty"><h3>{ query ? t("Nenhuma carta com esse nome.") : t("Sua coleção ainda está vazia.") }</h3><p>{ query ? t("Tente outro nome na busca.") : t("Abra pacotes para descobrir cartas e montar seu deck.") }</p></div> }
                </div>
                <footer className="collection-deck-footer">{ t("Clique na carta para adicionar uma cópia ao deck.") }</footer>
            </section>
            <section className="collection-deck-destination" aria-label={ t('Cartas no deck {name}', { name: deck.name }) }>
                <div className="collection-section-heading"><strong>{ t("NO SEU DECK") }</strong><span>{ cardCountLabel(deck) }</span></div>
                <div className="collection-deck-scroll">
                    <div className="collection-deck-cards">
                        { deck.cards.map(card => <div key={ card.id } className="collection-deck-card card-tile" onContextMenu={ event => menu(event, card) }>
                            <CollectionCardArtView card={ card } /><strong>{ t(card.name) }</strong><small>{ t(card.series) }</small>
                            <div className="collection-deck-card-actions">
                                <button type="button" aria-label={ `Opcoes de ${ t(card.name) } no deck` } disabled={ disabled } onClick={ event => menu(event, card) }>...</button>
                            </div>
                        </div>) }
                    </div>
                    { !deck.cards.length && <div className="collection-empty"><span className="collection-empty-symbol" aria-hidden="true">+</span><h3>{ t("Seu deck começa com uma carta.") }</h3><p>{ t("Escolha na coleção. As cartas adicionadas aparecem aqui.") }</p></div> }
                </div>
                <footer className="collection-deck-footer">{ t("Remover daqui altera apenas o deck. Suas cartas continuam na coleção.") }</footer>
            </section>
        </div>
    </section>;
};

export const CardDecksView: FC<CardDecksViewProps> = ({ decks, cards, query, selectedDeck, onSelectDeck, onOpenTrash, disabled, mutate }) =>
{
    const [ creating, setCreating ] = useState(false);
    const [ name, setName ] = useState(t('Novo deck'));
    const nameInput = useRef<HTMLInputElement>(null);
    const filtered = decks.filter(deck => normalize(deck.name).includes(normalize(query)));
    useEffect(() =>
    {
        if(!creating) return;
        requestAnimationFrame(() => { nameInput.current?.focus(); nameInput.current?.select(); });
    }, [ creating ]);

    const create = async () =>
    {
        const result = await mutate(() => createCardDeck(name.trim()), t("Deck pronto. Adicione as cartas que quiser usar."));
        if(result)
        {
            setCreating(false);
            setName(t('Novo deck'));
            onSelectDeck(result.deck_id);
        }
    };
    const beginCreate = () =>
    {
        if(disabled || decks.length >= 50) return;
        setName(t('Novo deck'));
        setCreating(true);
    };
    const createKeys = (event: KeyboardEvent<HTMLInputElement>) =>
    {
        if(event.key !== 'Escape') return;
        event.preventDefault();
        setCreating(false);
        setName(t('Novo deck'));
    };
    const shareDeck = (deck: CollectionDeck) =>
    {
        const cardNames = deck.cards.map(card => t(card.name)).join(', ');
        const text = `${ deck.name }: ${ cardNames || t('Deck vazio') }`;
        if(navigator.share) navigator.share({ title: deck.name, text }).catch(() => {});
        else navigator.clipboard?.writeText(text).catch(() => {});
    };
    const deckMenu = (event: MouseEvent<HTMLElement>, deck: CollectionDeck) =>
    {
        event.preventDefault(); event.stopPropagation();
        if(disabled) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        openGameContextMenu({ x: event.clientX || bounds.left, y: event.clientY || bounds.bottom, title: deck.name, items: [
            { id: 'open', icon: 'open', label: t('Abrir'), action: () => onSelectDeck(deck.id) },
            { id: 'share', icon: 'share', label: t('Compartilhar'), action: () => shareDeck(deck) },
            { id: 'undo-deck', icon: 'trash', label: t('Desfazer deck'), action: () => { mutate(() => deleteCardDeck(deck.id), t('Deck movido para a lixeira. Nenhuma carta foi perdida.')); } }
        ] });
    };

    if(selectedDeck) return <DeckEditor key={ selectedDeck.id } deck={ selectedDeck } cards={ cards } query={ query } onSelectDeck={ onSelectDeck } disabled={ disabled } mutate={ mutate } />;

    return <div className="collection-decks-layout">
        <section className="collection-deck-library" aria-label={ t("SEUS DECKS") }>
            <div className="collection-deck-list">
                { filtered.map(deck => <button type="button" className="collection-deck-tile" key={ deck.id } disabled={ disabled } aria-label={ t('Editar deck {name}', { name: deck.name }) } onClick={ () => onSelectDeck(deck.id) } onContextMenu={ event => deckMenu(event, deck) }>
                    <div className="collection-deck-cover collection-folder" aria-hidden="true">
                        <GameIcon name="folder" />
                        <span className="collection-folder-count">{ deck.cards.reduce((sum, card) => sum + card.quantity, 0) }</span>
                        { deck.is_primary && <span className="collection-folder-primary">{ t('Principal') }</span> }
                    </div>
                    <strong>{ deck.name }</strong>
                </button>) }
                <form className="collection-deck-tile collection-deck-new-tile" onSubmit={ event => { event.preventDefault(); if(name.trim()) create(); } }>
                    <button type="button" className="collection-deck-new-trigger" disabled={ disabled || decks.length >= 50 } aria-label={ t('Novo deck') } onClick={ beginCreate }>
                        <div className="collection-deck-cover collection-folder" aria-hidden="true">
                            <GameIcon name="folder" />
                            <span className="collection-folder-count collection-folder-add">+</span>
                        </div>
                    </button>
                    { creating ? <input ref={ nameInput } className="collection-deck-inline-name" aria-label={ t('Nome do deck') } value={ name } maxLength={ 60 } required disabled={ disabled } onChange={ event => setName(event.target.value) } onKeyDown={ createKeys } onBlur={ () => { if(!disabled) setCreating(false); } } /> : <button type="button" className="collection-deck-new-name" disabled={ disabled || decks.length >= 50 } onClick={ beginCreate }>{ t('Novo deck') }</button> }
                </form>
            </div>
            { !filtered.length && query && <p className="collection-notice">{ t("Nenhum deck com esse nome.") }</p> }
            <button type="button" className="collection-deck-tile collection-deck-trash-tile" disabled={ disabled } aria-label={ t('Abrir Lixeira') } onClick={ onOpenTrash }>
                <div className="collection-deck-cover collection-trash" aria-hidden="true"><GameIcon name="trash" /></div>
                <strong>{ t('Lixeira') }</strong>
            </button>
        </section>
    </div>;
};

export const CardDeckTrashView: FC<Pick<CardDecksViewProps, 'query' | 'disabled' | 'mutate'> & { decks: CollectionDeck[] }> = ({ decks, query, disabled, mutate }) =>
{
    const filtered = decks.filter(deck => normalize(deck.name).includes(normalize(query)));
    const menu = (event: MouseEvent<HTMLElement>, deck: CollectionDeck) =>
    {
        event.preventDefault(); event.stopPropagation();
        if(disabled) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        openGameContextMenu({ x: event.clientX || bounds.left, y: event.clientY || bounds.bottom, title: deck.name, items: [
            { id: 'restore-deck', icon: 'restore', label: t('Restaurar para a coleção'), action: () => { mutate(() => restoreCardDeck(deck.id), t('Deck restaurado para a coleção.')); } }
        ] });
    };

    return <section className="collection-deck-library collection-trash-library" aria-label={ t('Lixeira de decks') }>
        <div className="collection-section-heading"><strong>{ t('LIXEIRA DE DECKS') }</strong><span>{ t('{count} decks excluídos', { count: filtered.length }) }</span></div>
        <div className="collection-deck-list collection-trash-list">
            { filtered.map(deck => <button type="button" className="collection-deck-tile collection-trashed-deck" key={ deck.id } disabled={ disabled } aria-label={ t('Deck excluído {name}', { name: deck.name }) } onContextMenu={ event => menu(event, deck) }>
                <div className="collection-deck-cover collection-folder" aria-hidden="true">
                    <GameIcon name="folder" />
                    <span className="collection-folder-count">{ deck.cards.length }</span>
                </div>
                <strong>{ deck.name }</strong>
            </button>) }
        </div>
        { !filtered.length && <div className="collection-empty"><GameIcon name="trash" /><h3>{ query ? t('Nenhum deck com esse nome.') : t('A lixeira está vazia.') }</h3><p>{ query ? t('Tente outro nome na busca.') : t('Os decks desfeitos aparecerão aqui.') }</p></div> }
        { filtered.length > 0 && <footer className="collection-deck-footer collection-trash-footer">{ t('Use o botão direito em um deck para restaurá-lo.') }</footer> }
    </section>;
};
