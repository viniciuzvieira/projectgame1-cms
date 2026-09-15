import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { FC, useDeferredValue, useEffect, useRef, useState } from 'react';
import { AddEventLinkTracker, RemoveLinkEventTracker } from '../../api';
import { LayoutAvatarImageView, NitroCardContentView, NitroCardHeaderView, NitroCardView } from '../../common';
import { CardCollection, CardCollectionError, CollectionCard, CollectionPack, createOpeningRequestId, loadCardCollection, openCollectionPack } from './CardCollectionApi';
import { CardPackOpeningView } from './CardPackOpeningView';
import { CardPackThumbnailView } from './CardPackThumbnailView';

const searchable = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const CardCollectionView: FC = () =>
{
    const [ visible, setVisible ] = useState(false);
    const [ tab, setTab ] = useState<'packs' | 'cards'>('packs');
    const [ data, setData ] = useState<CardCollection>({ packs: [], cards: [] });
    const [ selectedPackId, setSelectedPackId ] = useState<number>(null);
    const [ selectedCardId, setSelectedCardId ] = useState<number>(null);
    const [ query, setQuery ] = useState('');
    const [ loading, setLoading ] = useState(false);
    const [ busy, setBusy ] = useState(false);
    const [ error, setError ] = useState('');
    const requests = useRef<Record<number, string>>({});
    const loadVersion = useRef(0);
    const deferredQuery = useDeferredValue(searchable(query));

    const refresh = async () =>
    {
        const version = ++loadVersion.current;
        setLoading(true);
        setError('');
        try
        {
            const result = await loadCardCollection();
            if(version !== loadVersion.current) return;
            setData(result);
            setSelectedPackId(previous => result.packs.some(pack => pack.id === previous) ? previous : result.packs[0]?.id || null);
        }
        catch(loadError)
        {
            if(version === loadVersion.current) setError(loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar sua colecao.');
        }
        finally { if(version === loadVersion.current) setLoading(false); }
    };

    useEffect(() =>
    {
        const tracker: ILinkEventTracker = {
            eventUrlPrefix: 'card-collection/',
            linkReceived: url =>
            {
                switch(url.split('/')[1])
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
        return () => { version.current++; };
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

    if(!visible) return null;

    const selectedPack = data.packs.find(pack => pack.id === selectedPackId);
    const selectedCard = data.cards.find(card => card.id === selectedCardId) || data.cards[0];
    const packs = data.packs.filter(pack => searchable(pack.name).includes(deferredQuery));
    const cards = data.cards.filter(card => searchable(card.name).includes(deferredQuery));
    const packCount = data.packs.reduce((sum, pack) => sum + pack.quantity, 0);
    const cardCount = data.cards.reduce((sum, card) => sum + (card.quantity || 0), 0);

    const changeTab = (next: 'packs' | 'cards') =>
    {
        if(busy) return;
        setTab(next);
        setQuery('');
    };

    return <NitroCardView uniqueKey="card-collection" className="nitro-card-collection" theme="primary-slim">
        <NitroCardHeaderView headerText="Minha colecao" onCloseClick={ () => setVisible(false) } />
        <NitroCardContentView overflow="hidden">
            <header className="collection-heading">
                <div className="collection-heading-mark" aria-hidden="true"><span /><span /><span /></div>
                <div><span className="collection-eyebrow">ARQUIVO DO JOGADOR</span><h2>Cada pacote, uma descoberta.</h2><p>Abra, encontre e complete sua colecao.</p></div>
                <div className="collection-totals" aria-live="polite"><strong>{ packCount }<small>PACOTES</small></strong><strong>{ cardCount }<small>CARTAS</small></strong></div>
            </header>
            <div className="collection-tools">
                <div className="collection-tabs" role="tablist" aria-label="Tipo de colecao" onKeyDown={ event =>
                {
                    if(!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || busy) return;
                    event.preventDefault();
                    const next = event.key === 'Home' ? 'packs' : event.key === 'End' ? 'cards' : tab === 'packs' ? 'cards' : 'packs';
                    changeTab(next);
                    document.getElementById(`collection-tab-${ next }`)?.focus();
                } }>
                    <button id="collection-tab-packs" role="tab" aria-controls="collection-panel" aria-selected={ tab === 'packs' } tabIndex={ tab === 'packs' ? 0 : -1 } disabled={ busy } onClick={ () => changeTab('packs') }>Pacotes <span>{ packCount }</span></button>
                    <button id="collection-tab-cards" role="tab" aria-controls="collection-panel" aria-selected={ tab === 'cards' } tabIndex={ tab === 'cards' ? 0 : -1 } disabled={ busy } onClick={ () => changeTab('cards') }>Cartas <span>{ cardCount }</span></button>
                </div>
                <label className="collection-search"><span aria-hidden="true" className="collection-search-icon" /><input type="search" aria-label={ tab === 'packs' ? 'Buscar pacote pelo nome' : 'Buscar carta pelo nome' } placeholder={ tab === 'packs' ? 'Buscar pacote pelo nome...' : 'Buscar carta pelo nome...' } value={ query } onChange={ event => setQuery(event.target.value) } /></label>
                <button className="collection-refresh" disabled={ busy || loading } onClick={ refresh } title="Atualizar colecao" aria-label="Atualizar colecao">Atualizar</button>
            </div>
            { error && <div role="alert" className="collection-error">{ error } <button onClick={ refresh } disabled={ loading }>Tentar novamente</button></div> }
            <div id="collection-panel" role="tabpanel" aria-labelledby={ `collection-tab-${ tab }` } className="collection-columns">
                <section className="collection-library" aria-busy={ loading }>
                    <div className="collection-section-heading"><strong>{ tab === 'packs' ? 'SEUS PACOTES' : 'SUAS CARTAS' }</strong><span>{ tab === 'packs' ? `${ packs.length } modelos` : `${ cards.length } descobertas` }</span></div>
                    { loading && <p className="collection-notice" role="status">Carregando sua colecao...</p> }
                    <div className="collection-grid">
                        { tab === 'packs' && packs.map(pack => <button key={ pack.id } className={ `collection-tile pack-tile ${ selectedPackId === pack.id ? 'is-selected' : '' } ${ pack.quantity < 1 ? 'is-empty' : '' }` } disabled={ busy } aria-pressed={ selectedPackId === pack.id } aria-label={ `${ pack.name }, ${ pack.quantity } pacotes` } onClick={ () => setSelectedPackId(pack.id) }>
                            <div className="collection-tile-art"><CardPackThumbnailView designKey={ pack.design_key } />{ pack.quantity > 1 && <span className="collection-quantity" aria-label={ `${ pack.quantity } unidades` }>x{ pack.quantity }</span> }</div>
                            <strong>{ pack.name }</strong><small>{ pack.quantity > 0 ? '1 carta por pacote' : 'ESGOTADO' }</small>
                        </button>) }
                        { tab === 'cards' && cards.map(card => <button key={ card.id } className={ `collection-tile card-tile ${ selectedCard?.id === card.id ? 'is-selected' : '' }` } aria-pressed={ selectedCard?.id === card.id } onClick={ () => setSelectedCardId(card.id) }>
                            <div className={ `collection-card-mini reward-theme-${ card.design_key }` }><span className="collection-card-rarity">{ card.rarity }</span><LayoutAvatarImageView figure={ card.figure } direction={ 2 } classNames={ ['collection-card-avatar'] } /><span className="collection-card-power">{ card.power } PODER</span>{ card.quantity > 1 && <span className="collection-quantity">x{ card.quantity }</span> }</div>
                            <strong>{ card.name }</strong><small>{ card.series }</small>
                        </button>) }
                    </div>
                    { !loading && (tab === 'packs' ? packs.length === 0 : cards.length === 0) && <div className="collection-empty"><span className="collection-empty-symbol" aria-hidden="true">?</span><h3>{ query ? 'Nenhum resultado' : tab === 'cards' ? 'Sua primeira carta espera por voce.' : 'Nenhum pacote na colecao.' }</h3><p>{ query ? 'Tente outro nome na busca.' : 'As descobertas dos pacotes ficam guardadas aqui.' }</p>{ !query && tab === 'cards' && <button onClick={ () => changeTab('packs') }>Escolher um pacote</button> }</div> }
                    <footer className="collection-library-footer">{ busy ? 'Aguarde a revelacao para escolher outro pacote.' : 'Selecione uma miniatura para ver de perto.' }</footer>
                </section>
                <section className="collection-preview" aria-label={ tab === 'packs' ? 'Abrir pacote selecionado' : 'Carta selecionada' }>
                    { tab === 'packs' && selectedPack && <>
                        <CardPackOpeningView key={ selectedPack.id } embedded pack={ selectedPack } onOpen={ () => openPack(selectedPack) } onBusyChange={ setBusy } />
                        <div className="collection-preview-caption"><span>{ selectedPack.quantity } disponiveis</span><p>{ selectedPack.description }</p></div>
                    </> }
                    { tab === 'cards' && selectedCard && <div className="collection-card-detail">
                        <span className="collection-eyebrow">DESCOBERTA REGISTRADA</span>
                        <div className={ `card-pack-reward reward-theme-${ selectedCard.design_key }` }>
                            <div className="card-pack-reward-rarity">{ selectedCard.rarity }</div>
                            <div className="card-pack-reward-art"><span className="card-pack-reward-halo" /><LayoutAvatarImageView figure={ selectedCard.figure } direction={ 2 } classNames={ ['card-pack-reward-avatar'] } /></div>
                            <div className="card-pack-reward-name">{ selectedCard.name }</div>
                            <div className="card-pack-reward-stats"><span><b>{ selectedCard.power }</b> PODER</span><span>{ selectedCard.series }</span></div>
                        </div>
                        <h3>{ selectedCard.name }</h3><p>{ selectedCard.description }</p><span className="collection-owned">{ selectedCard.quantity } na sua colecao</span>
                    </div> }
                    { (tab === 'packs' ? !selectedPack : !selectedCard) && <div className="collection-preview-placeholder"><div className="collection-placeholder-card" aria-hidden="true">CH</div><strong>O proximo capitulo e seu.</strong><p>{ tab === 'packs' ? 'Escolha um pacote para comecar.' : 'Abra um pacote para revelar sua primeira carta.' }</p></div> }
                </section>
            </div>
        </NitroCardContentView>
    </NitroCardView>;
};
