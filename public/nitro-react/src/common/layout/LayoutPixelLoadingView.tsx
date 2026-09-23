import { FC } from 'react';
import { Base, BaseProps } from '../Base';

export type LayoutPixelLoadingSize = 'small' | 'medium' | 'large';

export interface LayoutPixelLoadingViewProps extends BaseProps<HTMLDivElement>
{
    size?: LayoutPixelLoadingSize;
    label?: string;
}

export const LayoutPixelLoadingView: FC<LayoutPixelLoadingViewProps> = props =>
{
    const { size = 'medium', label = 'Loading', classNames = [], ...rest } = props;

    return (
        <Base
            classNames={ [ 'pixel-loading', `pixel-loading-${ size }`, ...classNames ] }
            role="status"
            aria-label={ label }
            { ...rest }>
            { Array.from({ length: 8 }, (_, index) => (
                <span key={ index } className="pixel-loading-cell" aria-hidden="true" />
            )) }
        </Base>
    );
};
