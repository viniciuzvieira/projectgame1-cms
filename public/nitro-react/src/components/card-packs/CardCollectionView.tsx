import { t, useGameLocale } from '../game-shell/GameLocale';
import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { FC, MouseEvent, useDeferredValue, useEffect, useRef, useState } from 'react';
import { AddEventLinkTracker, RemoveLinkEventTracker } from '../../api';
import { LayoutAvatarImageView, NitroCardContentView, NitroCardView } from '../../common';
import { closeGameContextMenu, openGameContextMenu } from '../game-context-menu/GameContextMenu';
import { CardCollection, CardCollectionError, CollectionCard, CollectionPack, createCardDeck, createOpeningRequestId, loadCardCollection, openCollectionPack, setCardDeckQuantity } from './CardCollectionApi';
import { CardDecksView, CardDeckTrashView, RunDeckMutation } from './CardDecksView';
import { CollectionCardArtView } from './CollectionCardArtView';
import { CollectionOrbView } from './CollectionOrbView';
import { CardPackOpeningView } from './CardPackOpeningView';
import { CardPackThumbnailView } from './CardPackThumbnailView';
import { GameIcon } from '../game-shell/GameIcon';
import { DeviceCardControls } from './DeviceCardControls';

const searchable = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const collectionTabs = ['packs', 'cards', 'decks', 'shop'] as const;
type CoreCollectionTab = typeof collectionTabs[number];
type CollectionTab = CoreCollectionTab | 'trash' | `new-${ number }`;

const tabDetails: Record<CoreCollectionTab, { label: string; icon: string }> = {
    packs: { label: 'Pacotes', icon: 'packs' },
    cards: { label: 'Cartas', icon: 'cards' },
    decks: { label: 'Decks', icon: 'decks' },
    shop: { label: 'Shop', icon: 'shop' }
};

export const CardCollectionView: FC = () =>
{
    useGameLocale();
    const [ visible, setVisible ] = useState(false);
    const [ tab, setTab ] = useState<CollectionTab>('packs');
    const [ customTabs, setCustomTabs ] = useState<CollectionTab[]>([]);
    const [ data, setData ] = useState<CardCollection>({ packs: [], cards: [], decks: [], trashed_decks: [] });
    const [ selectedPackId, setSelectedPackId ] = useState<number>(null);
    const [ selectedCardId, setSelectedCardId ] = useState<number>(null);
    const [ selectedDeckId, setSelectedDeckId ] = useState<number>(null);
    const [ query, setQuery ] = useState('');
    const [ loading, setLoading ] = useState(false);
    const [ busy, setBusy ] = useState(false);
    const [ error, setError ] = useState('');
    const [ notice, setNotice ] = useState('');
    const [ savingDeck, setSavingDeck ] = useState(false);
    const [ newDeckCard, setNewDeckCard ] = useState<CollectionCard>(null);
    const [ newDeckName, setNewDeckName ] = useState('Novo deck');
    const newDeckInput = useRef<HTMLInputElement>(null);
    const customTabId = useRef(0);
    const deckRequest = useRef(false);
    const interactionBusy = useRef(false);
    interactionBusy.current = busy || savingDeck;
    const requests = useRef<Record<number, string>>({});
    const loadVersion = useRef(0);
    const deferredQuery = useDeferredValue(searchable(query));

    useEffect(() =>
    {
        if(!newDeckCard) return;
        requestAnimationFrame(() => { newDeckInput.current?.focus(); newDeckInput.current?.select(); });
    }, [ newDeckCard ]);

    const refresh = async () =>
    {
        const version = ++loadVersion.current;
        setLoading(true);
        setError('');
        setNotice('');
        try
        {
            const result = await loadCardCollection();
            if(version !== loadVersion.current) return;
            setData(result);
            setSelectedPackId(previous => result.packs.some(pack => pack.id === previous) ? previous : result.packs[0]?.id || null);
        }
        catch(loadError)
        {
            if(version === loadVersion.current) setError(loadError instanceof Error ? loadError.message : t("Não foi possível carregar sua coleção."));
        }
        finally { if(version === loadVersion.current) setLoading(false); }
    };

    useEffect(() =>
    {
        const tracker: ILinkEventTracker = {
            eventUrlPrefix: 'card-collection/',
            linkReceived: url =>
            {
                const action = url.split('/')[1];
                if(collectionTabs.includes(action as CoreCollectionTab))
                {
                    setVisible(true);
                    if(!interactionBusy.current) { setTab(action as CoreCollectionTab); setQuery(''); setSelectedDeckId(null); }
                    return;
                }
                switch(action)
                {
                    case 'toggle': setVisible(value => !value); break;
                    case 'show': setVisible(true); break;
                    case 'hide': setVisible(false); break;
                }
            }
        };
        AddEventLinkTracker(tracker);
        return () => RemoveLinkEventTracker(tracker);
    }, []);

    useEffect(() =>
    {
        const version = loadVersion;
        if(visible) refresh();
        return () => { version.current++; closeGameContextMenu(); };
    }, [ visible ]);

    const openPack = async (pack: CollectionPack): Promise<CollectionCard> =>
    {
        // Retain the same key after an uncertain response; a retry must not spend a second pack.
        const requestId = requests.current[pack.id] || createOpeningRequestId();
        requests.current[pack.id] = requestId;
        try
        {
            const result = await openCollectionPack(pack.id, requestId);
            delete requests.current[pack.id];
            loadVersion.current++;
            setData(result.collection);
            setLoading(false);
            setError('');
            setSelectedCardId(result.card.id);
            return result.card;
        }
        catch(openError)
        {
            if(openError instanceof CardCollectionError && openError.status >= 400 && openError.status < 500 && ![408, 429].includes(openError.status))
                delete requests.current[pack.id];
            throw openError;
        }
    };

    const mutateDeck: RunDeckMutation = async (operation, message) =>
    {
        if(deckRequest.current) return null;
        deckRequest.current = true;
        loadVersion.current++;
        closeGameContextMenu();
        setSavingDeck(true);
        setLoading(false);
        setError('');
        setNotice('');
        try
        {
            const result = await operation();
            loadVersion.current++;
            setLoading(false);
            setData(current => ({ ...current, decks: result.decks, trashed_decks: result.trashed_decks }));
            setNotice(message);
            return result;
        }
        catch(saveError)
        {
            setError(saveError instanceof Error ? saveError.message : t("Não foi possível salvar o deck."));
            return null;
        }
        finally { deckRequest.current = false; setSavingDeck(false); }
    };

    if(!visible) return null;

    const selectedPack = data.packs.find(pack => pack.id === selectedPackId);
    const selectedCard = data.cards.find(card => card.id === selectedCardId) || data.cards[0];
    const packs = data.packs.filter(pack => searchable(t(pack.name)).includes(deferredQuery));
    const cards = data.cards.filter(card => searchable(t(card.name)).includes(deferredQuery));
    const packCount = data.packs.reduce((sum, pack) => sum + pack.quantity, 0);
    const cardCount = data.cards.reduce((sum, card) => sum + (card.quantity || 0), 0);
    const decks = data.decks || [];
    const trashedDecks = data.trashed_decks || [];
    const selectedDeck = decks.find(deck => deck.id === selectedDeckId);
    const activeTabs = [ ...collectionTabs, ...customTabs ];
    const tabPath = tab.startsWith('new-') ? 'new-tab' : tab;
    const searchLabel = tab === 'packs' ? t("Buscar pacote pelo nome") : tab === 'cards' || selectedDeck ? t("Buscar carta pelo nome") : tab === 'decks' ? t("Buscar deck pelo nome") : tab === 'shop' ? t('Buscar na loja') : tab === 'trash' ? t('Pesquisar na lixeira') : t('Pesquisar nesta aba');
    const disabled = busy || savingDeck;

    const changeTab = (next: CollectionTab) =>
    {
        if(disabled) return;
        closeGameContextMenu();
        setTab(next);
        setQuery('');
        setSelectedDeckId(null);
    };

    const addTab = () =>
    {
        if(disabled) return;
        const next = `new-${ ++customTabId.current }` as CollectionTab;
        setCustomTabs(current => [ ...current, next ]);
        changeTab(next);
    };

    const openTrash = () =>
    {
        if(disabled) return;
        setCustomTabs(current => current.includes('trash') ? current : [ ...current, 'trash' ]);
        changeTab('trash');
    };

    const closeTab = (closing: CollectionTab) =>
    {
        if(disabled || !customTabs.includes(closing)) return;
        setCustomTabs(current => current.filter(item => item !== closing));
        if(tab !== closing) return;
        const index = activeTabs.indexOf(closing);
        changeTab(closing === 'trash' ? 'decks' : activeTabs[index - 1] || 'packs');
    };

    const selectDeck = (id: number) =>
    {
        closeGameContextMenu();
        setSelectedDeckId(id);
        setQuery('');
        setNotice('');
    };

    const cardMenu = (event: MouseEvent<HTMLElement>, card: CollectionCard) =>
    {
        event.preventDefault(); event.stopPropagation();
        if(disabled || loading) return;
        setSelectedCardId(card.id);
        const bounds = event.currentTarget.getBoundingClientRect();
        const deckItems = decks.map(deck =>
        {
            const added = deck.cards.some(item => item.id === card.id);
            return {
                id: String(deck.id), label: `${ deck.name }${ added ? ` (${ t('já adicionado') })` : '' }${ deck.is_primary ? ` / ${ t('Principal') }` : '' }`,
                icon: 'folder',
                disabled: added,
                action: added ? undefined : () => { mutateDeck(() => setCardDeckQuantity(deck.id, card.id, 1), t('Carta adicionada ao deck {name}.', { name: deck.name })); }
            };
        });
        deckItems.push({ id: 'new-deck', label: t('Novo deck'), icon: 'create', disabled: decks.length >= 50, action: () => { setNewDeckName(t('Novo deck')); setNewDeckCard(card); } });
        openGameContextMenu({ x: event.clientX || bounds.left, y: event.clientY || bounds.bottom, title: t(card.name), items: [
            { id: 'add', icon: 'add', label: t("Adicionar deck"), children: deckItems },
            { id: 'market', icon: 'shop', label: t('Mercado'), disabled: true },
            { id: 'about', icon: 'about', label: t('Sobre'), action: () => { setTab('cards'); setSelectedCardId(card.id); } }
        ] });
    };

    const packMenu = (event: MouseEvent<HTMLElement>, pack: CollectionPack) =>
    {
        event.preventDefault(); event.stopPropagation();
        if(disabled || loading) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        openGameContextMenu({ x: event.clientX || bounds.left, y: event.clientY || bounds.bottom, title: t(pack.name), items: [
            { id: 'open', icon: 'open', label: t('Abrir'), disabled: pack.quantity < 1, action: () => { setTab('packs'); setSelectedPackId(pack.id); } },
            { id: 'market', icon: 'shop', label: t('Mercado'), disabled: true },
            { id: 'about', icon: 'about', label: t('Sobre'), action: () => { setTab('packs'); setSelectedPackId(pack.id); } }
        ] });
    };

    const createDeckForCard = async () =>
    {
        const name = newDeckName.trim();
        if(!name || !newDeckCard) return;
        const card = newDeckCard;
        const result = await mutateDeck(async () =>
        {
            const created = await createCardDeck(name);
            return created.deck_id ? setCardDeckQuantity(created.deck_id, card.id, 1) : created;
        }, t('Carta adicionada ao deck {name}.', { name }));
        if(result) setNewDeckCard(null);
    };

    return <NitroCardView uniqueKey="card-collection" className="nitro-card-collection" theme="primary-slim">
        <NitroCardContentView overflow="hidden" gap={ 0 }>
            <div className="collection-browser-tabs drag-handler">
                <div className="collection-tabs" role="tablist" aria-label={ t("Tipo de coleção") } onKeyDown={ event =>
                {
                    if(!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || disabled) return;
                    event.preventDefault();
                    const index = activeTabs.indexOf(tab);
                    const next = event.key === 'Home' ? activeTabs[0] : event.key === 'End' ? activeTabs[activeTabs.length - 1] : activeTabs[(index + (event.key === 'ArrowRight' ? 1 : activeTabs.length - 1)) % activeTabs.length];
                    changeTab(next);
                    document.getElementById(`collection-tab-${ next }`)?.focus();
                } }>
                    { activeTabs.map(item =>
                    {
                        const closable = item === 'trash' || item.startsWith('new-');
                        const details = item === 'trash' ? { label: 'Lixeira', icon: 'trash' } : item.startsWith('new-') ? { label: 'Nova aba', icon: 'new-tab' } : tabDetails[item as CoreCollectionTab];
                        const count = item === 'packs' ? packCount : item === 'cards' ? cardCount : item === 'decks' ? decks.length : item === 'trash' ? trashedDecks.length : null;
                        return <div key={ item } className={ `collection-tab-shell${ closable ? ' is-closable' : '' }` }>
                            <button className="collection-tab-button" id={ `collection-tab-${ item }` } role="tab" aria-controls="collection-panel" aria-selected={ tab === item } tabIndex={ tab === item ? 0 : -1 } disabled={ disabled } onMouseDown={ event => event.stopPropagation() } onClick={ () => changeTab(item) }>
                                <GameIcon name={ details.icon } /><span className="collection-tab-label">{ t(details.label) }</span>{ count !== null && <span className="collection-tab-count">{ count }</span> }
                            </button>
                            { closable && <button type="button" className="collection-tab-close" disabled={ disabled } aria-label={ `${ t('Fechar') } ${ t(details.label) }` } onMouseDown={ event => event.stopPropagation() } onClick={ () => closeTab(item) }>×</button> }
                        </div>;
                    }) }
                </div>
                <button type="button" className="collection-new-tab" disabled={ disabled } onMouseDown={ event => event.stopPropagation() } onClick={ addTab } aria-label={ t('Nova aba') }>+</button>
                <button type="button" className="collection-browser-close" onMouseDown={ event => event.stopPropagation() } onClick={ () => setVisible(false) } aria-label={ t('Fechar') }>×</button>
            </div>
            <div id="collection-panel" role="tabpanel" aria-labelledby={ `collection-tab-${ tab }` } className="collection-browser-panel">
                <form className="collection-tools" onSubmit={ event => { event.preventDefault(); document.getElementById('collection-search')?.focus(); } }>
                    <button type="button" className="collection-refresh browser-reload" disabled={ disabled || loading } onClick={ refresh } title={ t('Atualizar coleção') } aria-label={ t('Atualizar coleção') }><span aria-hidden="true">↻</span></button>
                    <div className="collection-address"><GameIcon name={ tab === 'cards' ? 'cards' : tab === 'shop' ? 'shop' : tab === 'trash' ? 'trash' : tab === 'packs' ? 'packs' : 'folder' } /><label className="collection-search-field" htmlFor="collection-search"><span className="collection-address-prefix">ch://{ tabPath }/</span><input id="collection-search" type="search" aria-label={ searchLabel } placeholder={ `${ searchLabel }...` } value={ query } onChange={ event => setQuery(event.target.value) } /></label><CollectionOrbView /><button type="submit" className="collection-search-button" title={ t('Pesquisar') } aria-label={ t('Pesquisar') }><span className="collection-search-icon" aria-hidden="true" /></button></div>
                </form>
                { error && <div role="alert" className="collection-error">{ error } <button onClick={ refresh } disabled={ loading || disabled }>{ t("Atualizar coleção") }</button></div> }
                { notice && <div className="collection-feedback" role="status">{ notice }</div> }
                { tab === 'decks' ? <CardDecksView decks={ decks } cards={ data.cards } query={ deferredQuery } selectedDeck={ selectedDeck } onSelectDeck={ selectDeck } onOpenTrash={ openTrash } disabled={ disabled || loading } mutate={ mutateDeck } /> : tab === 'trash' ? <CardDeckTrashView decks={ trashedDecks } query={ deferredQuery } disabled={ disabled || loading } mutate={ mutateDeck } /> : (tab === 'packs' || tab === 'cards') ? <div className="collection-columns">
                    <section className="collection-library" aria-busy={ loading }>
                        <div className="collection-section-heading"><strong>{ tab === 'packs' ? t("SEUS PACOTES") : t("SUAS CARTAS") }</strong><span>{ tab === 'packs' ? t('{count} modelos', { count: packs.length }) : t('{count} descobertas', { count: cards.length }) }</span></div>
                        { loading && <p className="collection-notice" role="status">{ t("Carregando sua coleção...") }</p> }
                        <div className="collection-grid">
                            { tab === 'packs' && packs.map(pack => <button key={ pack.id } className={ `collection-tile pack-tile ${ selectedPackId === pack.id ? 'is-selected' : '' } ${ pack.quantity < 1 ? 'is-empty' : '' }` } disabled={ busy } aria-pressed={ selectedPackId === pack.id } aria-label={ `${ t(pack.name) }, ${ pack.quantity } pacotes` } onClick={ () => setSelectedPackId(pack.id) } onContextMenu={ event => packMenu(event, pack) }>
                                <div className="collection-tile-art"><CardPackThumbnailView designKey={ pack.design_key } />{ pack.quantity > 1 && <span className="collection-quantity" aria-label={ `${ pack.quantity } unidades` }>x{ pack.quantity }</span> }</div>
                                <strong>{ t(pack.name) }</strong><small>{ pack.quantity > 0 ? t("1 carta por pacote") : t("ESGOTADO") }</small>
                            </button>) }
                            { tab === 'cards' && cards.map(card => <button key={ card.id } className={ `collection-tile card-tile ${ selectedCard?.id === card.id ? 'is-selected' : '' }` } aria-pressed={ selectedCard?.id === card.id } onClick={ () => setSelectedCardId(card.id) } onContextMenu={ event => cardMenu(event, card) }>
                                <CollectionCardArtView card={ card } />
                                <strong>{ t(card.name) }</strong><small>{ t(card.series) }</small>
                            </button>) }
                        </div>
                        { !loading && (tab === 'packs' ? packs.length === 0 : cards.length === 0) && <div className="collection-empty"><span className="collection-empty-symbol" aria-hidden="true">?</span><h3>{ query ? t("Nenhum resultado") : tab === 'cards' ? t("Sua primeira carta espera por você.") : t("Nenhum pacote na coleção.") }</h3><p>{ query ? t("Tente outro nome na busca.") : t("As descobertas dos pacotes ficam guardadas aqui.") }</p>{ !query && tab === 'cards' && <button onClick={ () => changeTab('packs') }>{ t("Escolher um pacote") }</button> }</div> }
                        <footer className="collection-library-footer">{ busy ? t("Aguarde a revelação para escolher outro pacote.") : tab === 'cards' ? t("Botão direito na carta para adicionar a um deck.") : t("Selecione uma miniatura para ver de perto.") }</footer>
                    </section>
                    <section className="collection-preview" aria-label={ tab === 'packs' ? t("Abrir pacote selecionado") : t("Carta selecionada") }>
                        { tab === 'packs' && selectedPack && <>
                            <CardPackOpeningView key={ selectedPack.id } embedded pack={ selectedPack } onOpen={ () => openPack(selectedPack) } onBusyChange={ setBusy } />
                            <div className="collection-preview-caption"><span>{ t('{count} disponíveis', { count: selectedPack.quantity }) }</span><p>{ t(selectedPack.description) }</p></div>
                        </> }
                        { tab === 'cards' && selectedCard && <div className="collection-card-detail">
                            <span className="collection-eyebrow">{ t("DESCOBERTA REGISTRADA") }</span>
                            <div className={ `card-pack-reward reward-theme-${ selectedCard.design_key }` }>
                                <div className="card-pack-reward-rarity">{ t(selectedCard.rarity) }</div>
                                <div className="card-pack-reward-art"><span className="card-pack-reward-halo" /><LayoutAvatarImageView figure={ selectedCard.figure } direction={ 2 } classNames={ ['card-pack-reward-avatar'] } /></div>
                                <div className="card-pack-reward-name">{ t(selectedCard.name) }</div>
                                <div className="card-pack-reward-stats"><span><b>{ selectedCard.power }</b> { t("PODER") }</span><span>{ t(selectedCard.series) }</span></div>
                                { selectedCard.design_key === 'arcade' && <DeviceCardControls /> }
                            </div>
                            <h3>{ t(selectedCard.name) }</h3><p>{ t(selectedCard.description) }</p><span className="collection-owned">{ t('{count} na sua coleção', { count: selectedCard.quantity }) }</span>
                            <button type="button" className="btn btn-primary" disabled={ disabled || loading } onClick={ event => cardMenu(event, selectedCard) }>{ t("Adicionar ao deck...") }</button>
                        </div> }
                        { (tab === 'packs' ? !selectedPack : !selectedCard) && <div className="collection-preview-placeholder"><div className="collection-placeholder-card" aria-hidden="true">CH</div><strong>{ t("O próximo capítulo é seu.") }</strong><p>{ tab === 'packs' ? t("Escolha um pacote para começar.") : t("Abra um pacote para revelar sua primeira carta.") }</p></div> }
                    </section>
                </div> : <div className="collection-blank-tab" aria-label={ tab === 'shop' ? t('Shop') : t('Nova aba') }><GameIcon name={ tab === 'shop' ? 'shop' : 'new-tab' } /><span>{ tab === 'shop' ? t('Shop') : t('Nova aba') }</span></div> }
            </div>
            { newDeckCard && <div className="collection-dialog-layer" role="presentation" onMouseDown={ event => { if(event.target === event.currentTarget && !savingDeck) setNewDeckCard(null); } }>
                <form className="collection-new-deck-dialog" role="dialog" aria-modal="true" aria-labelledby="collection-new-deck-title" onSubmit={ event => { event.preventDefault(); createDeckForCard(); } }>
                    <header id="collection-new-deck-title"><GameIcon name="folder" />{ t('Novo deck') }</header>
                    <p>{ t('Criar deck com a carta {name}', { name: t(newDeckCard.name) }) }</p>
                    <input ref={ newDeckInput } className="form-control" value={ newDeckName } maxLength={ 60 } required disabled={ savingDeck } onChange={ event => setNewDeckName(event.target.value) } onKeyDown={ event => { if(event.key === 'Escape' && !savingDeck) setNewDeckCard(null); } } />
                    <footer><button type="button" className="btn btn-secondary" disabled={ savingDeck } onClick={ () => setNewDeckCard(null) }>{ t('Cancelar') }</button><button type="submit" className="btn btn-primary" disabled={ savingDeck || !newDeckName.trim() }>{ t('Criar deck') }</button></footer>
                </form>
            </div> }
        </NitroCardContentView>
    </NitroCardView>;
};
