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
        key: 'founders', kicker: 'EDICAO FUNDADORES', title: ['CYBER', 'HEROIC'], style: {}
    },
    arctic: {
        key: 'arctic', kicker: 'EXPEDICAO POLAR', title: ['CIRCUITO', 'ARTICO'],
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
    }
};

export const getCardPackDesign = (key: string): CardPackDesign => CARD_PACK_DESIGNS[key] || CARD_PACK_DESIGNS.founders;
