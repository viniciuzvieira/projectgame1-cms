import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { ResourceCapacityBar } from './ResourceCapacityBar';

test('resizing changes the number of whole cells, never their size or spacing', () => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    let width = 147.875;
    let resize;
    const disconnect = jest.fn();
    const originalObserver = global.ResizeObserver;
    global.ResizeObserver = jest.fn(callback => { resize = callback; return { observe: jest.fn(), disconnect }; });
    const bounds = jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width }));
    const holder = document.createElement('div');
    document.body.appendChild(holder);
    const root = createRoot(holder);
    try {
        act(() => root.render(createElement(ResourceCapacityBar, { label: 'Data', quantity: 100, capacity: 100 })));
        expect(holder.querySelector('.resource-capacity-art').style.width).toBe('147px');
        expect(holder.querySelectorAll('.resource-capacity-fill > .is-filled')).toHaveLength(13);
        width = 105.67;
        act(() => resize());
        expect(holder.querySelector('.resource-capacity-art').style.width).toBe('105px');
        expect(holder.querySelectorAll('.resource-capacity-fill > .is-filled')).toHaveLength(9);
        for(const cell of holder.querySelectorAll('.resource-capacity-fill > span')) {
            expect(cell.style.width).toBe('7px');
            expect(cell.style.height).toBe('12px');
        }
        expect(holder.querySelector('.resource-capacity-fill').style.gap).toBe('3px');
    } finally {
        act(() => root.unmount());
        bounds.mockRestore();
        global.ResizeObserver = originalObserver;
        holder.remove();
        delete global.IS_REACT_ACT_ENVIRONMENT;
    }
    expect(disconnect).toHaveBeenCalledTimes(1);
});
