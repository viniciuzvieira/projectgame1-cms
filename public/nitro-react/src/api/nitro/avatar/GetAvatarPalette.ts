import { IPalette } from '@nitrots/nitro-renderer';
import { GetAvatarRenderManager } from './GetAvatarRenderManager';

export function GetAvatarPalette(paletteId: number): IPalette
{
    const avatarRenderManager = GetAvatarRenderManager();

    if(!avatarRenderManager || !avatarRenderManager.structureData) return null;

    return avatarRenderManager.structureData.getPalette(paletteId);
}
