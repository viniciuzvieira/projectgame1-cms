import { CSSProperties } from 'react';

export interface CardPackDesign
{
    key: string;
    kicker: string;
    title: [string, string];
    style: CSSProperties;
}

export const CARD_PACK_DESIGNS: Record<string, CardPackDesign> = {
    founders: {
        key: 'founders', kicker: 'EDIÇÃO FUNDADORES', title: ['CYBER', 'HEROIC'], style: {}
    },
    arctic: {
        key: 'arctic', kicker: 'EXPEDIÇÃO POLAR', title: ['CIRCUITO', 'ÁRTICO'],
        style: {
            '--card-pack-color-yellow': '#c8f5ed',
            '--card-pack-color-orange': '#43cbb2',
            '--card-pack-color-red': '#187eae',
            '--card-pack-color-deep-red': '#184c70',
            '--card-pack-inner-frame-color': '#abf1d7',
            '--card-pack-inner-shadow-color': 'rgba(7, 54, 78, .42)',
            '--card-pack-ink': '#123d56',
            '--card-pack-paper': '#e1fff2',
            '--card-pack-bottom': '#103a59',
            '--card-pack-emblem': '#81e6cf'
        } as CSSProperties
    },
    arcade: {
        key: 'arcade', kicker: 'PORTABLE SYSTEM / 03', title: ['ARCADE', 'SINTÉTICO'],
        style: {
            '--card-pack-color-yellow': '#ffda85', '--card-pack-color-orange': '#f4a26b',
            '--card-pack-color-red': '#de587e', '--card-pack-color-deep-red': '#743c61',
            '--card-pack-inner-frame-color': '#ffd9a4', '--card-pack-inner-shadow-color': 'rgba(65, 27, 49, .42)',
            '--card-pack-ink': '#382b48', '--card-pack-paper': '#fff1cf',
            '--card-pack-bottom': '#382b48', '--card-pack-emblem': '#a2dec0'
        } as CSSProperties
    }
};

export const getCardPackDesign = (key: string): CardPackDesign => CARD_PACK_DESIGNS[key] || CARD_PACK_DESIGNS.founders;
