import { FC, useId } from 'react';
import { getCardPackDesign } from './CardPackDesign';
import { renderPackageArtwork } from './CardPackOpeningView';

export const CardPackThumbnailView: FC<{ designKey: string }> = ({ designKey }) =>
{
    const id = `pack-thumb-${ useId().replace(/:/g, '') }`;
    const design = getCardPackDesign(designKey);

    return <svg className="card-pack-thumbnail" style={ design.style } viewBox="0 0 205 285" aria-hidden="true">
        { renderPackageArtwork(id, 0, 'right-to-left', design) }
        <path className="card-pack-sealed-perforation" d="M 11 43 H 194" />
    </svg>;
};
