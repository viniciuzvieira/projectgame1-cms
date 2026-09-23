import { ISetType } from '@nitrots/nitro-renderer';
import { GetAvatarRenderManager } from './GetAvatarRenderManager';

export function GetAvatarSetType(setType: string): ISetType
{
    const avatarRenderManager = GetAvatarRenderManager();

    if(!avatarRenderManager || !avatarRenderManager.structureData) return null;

    return avatarRenderManager.structureData.getSetType(setType);
}
