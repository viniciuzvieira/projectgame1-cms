import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { FC, MouseEvent, ReactNode, useCallback, useMemo } from 'react';
import { Column, ColumnProps, Flex } from '..';

interface NitroCardHeaderViewProps extends ColumnProps {
    headerText: string;
    noCloseButton?: boolean;
    onCloseClick: (event: MouseEvent) => void;
    headerAccessory?: ReactNode;
}

export const NitroCardHeaderView: FC<NitroCardHeaderViewProps> = props => {
    const { headerText = null, noCloseButton = false, onCloseClick = null, headerAccessory = null, justifyContent = 'center', alignItems = 'center', classNames = [], children = null, ...rest } = props;

    const getClassNames = useMemo(() => {
        const newClassNames: string[] = ['drag-handler', 'container-fluid', 'nitro-card-header'];

        if (classNames.length) newClassNames.push(...classNames);

        return newClassNames;
    }, [classNames]);

    const onMouseDown = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        event.nativeEvent.stopImmediatePropagation();
    }, []);

    return (
        <Column center position="relative" classNames={getClassNames} {...rest}>
            <Flex fullWidth center>
                <span className="nitro-card-header-text">{headerText}</span>
                {headerAccessory && <span className="nitro-card-header-accessory">{headerAccessory}</span>}
                {!noCloseButton &&
                    <button type="button" aria-label={ `Fechar ${ headerText || 'janela' }` } className="position-absolute end-2 nitro-card-header-close cursor-pointer" onMouseDownCapture={onMouseDown} onClick={onCloseClick}>
                        <FontAwesomeIcon icon="times" />
                    </button>}
            </Flex>
        </Column>
    );
}
