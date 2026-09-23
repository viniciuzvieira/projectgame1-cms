import { t } from '../game-shell/GameLocale';
import { FC } from 'react';
import { LayoutAvatarImageView } from '../../common';
import { CollectionCard } from './CardCollectionApi';
import { DeviceCardControls } from './DeviceCardControls';

export const CollectionCardArtView: FC<{ card: CollectionCard }> = ({ card }) => (
    <div className={ `collection-card-mini reward-theme-${ card.design_key }` }>
        <span className="collection-card-rarity">{ t(card.rarity) }</span>
        <LayoutAvatarImageView figure={ card.figure } direction={ 2 } classNames={ ['collection-card-avatar'] } />
        <span className="collection-card-power">{ card.power } { t('PODER') }</span>
        { card.quantity > 1 && <span className="collection-quantity">x{ card.quantity }</span> }
        { card.design_key === 'arcade' && <DeviceCardControls /> }
    </div>
);
