import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { FC, useEffect, useState } from 'react';
import { AddEventLinkTracker, RemoveLinkEventTracker } from '../../api';
import { NitroCardContentView, NitroCardHeaderView, NitroCardView } from '../../common';
import { GameIcon } from './GameIcon';
import { useGameLocale } from './GameLocale';
import { loadGameProfile, useGameProfile } from './GameProfile';

export const ANDROID_SKILLS = [
    { code: 'android.core', name: 'Núcleo sintético', x: 90, y: 245, parents: [], branch: 'core' },
    { code: 'android.neural', name: 'Rede neural', x: 330, y: 85, parents: ['android.core'], branch: 'data' },
    { code: 'android.armor', name: 'Blindagem', x: 330, y: 245, parents: ['android.core'], branch: 'iron' },
    { code: 'android.servos', name: 'Servomotores', x: 330, y: 405, parents: ['android.core'], branch: 'gas' },
    { code: 'android.pulse', name: 'Pulso de dados', x: 570, y: 45, parents: ['android.neural'], branch: 'data' },
    { code: 'android.firewall', name: 'Firewall', x: 570, y: 125, parents: ['android.neural'], branch: 'data' },
    { code: 'android.repair', name: 'Reparo autônomo', x: 570, y: 205, parents: ['android.armor'], branch: 'iron' },
    { code: 'android.shield', name: 'Escudo magnético', x: 570, y: 285, parents: ['android.armor'], branch: 'iron' },
    { code: 'android.reflex', name: 'Reflexos', x: 570, y: 365, parents: ['android.servos'], branch: 'gas' },
    { code: 'android.overdrive', name: 'Sobrecarga', x: 570, y: 445, parents: ['android.servos'], branch: 'gas' },
    { code: 'android.awareness', name: 'Consciência expandida', x: 850, y: 85, parents: ['android.pulse', 'android.firewall'], branch: 'data' },
    { code: 'android.bastion', name: 'Bastião', x: 850, y: 245, parents: ['android.repair', 'android.shield'], branch: 'iron' },
    { code: 'android.propulsion', name: 'Propulsão', x: 850, y: 405, parents: ['android.reflex', 'android.overdrive'], branch: 'gas' }
];
export const GameSkillsView: FC = () =>
{
    const [ visible, setVisible ] = useState(false);
    const [ selected, setSelected ] = useState(ANDROID_SKILLS[0]);
    const profile = useGameProfile();
    const { t } = useGameLocale();
    useEffect(() =>
    {
        const tracker: ILinkEventTracker = { eventUrlPrefix: 'game-skills/', linkReceived: url =>
        {
            const action = url.split('/')[1];
            if(action === 'toggle') setVisible(value => !value);
            else setVisible(action === 'show');
        } };
        AddEventLinkTracker(tracker);
        return () => RemoveLinkEventTracker(tracker);
    }, []);
    useEffect(() => { if(visible) loadGameProfile(); }, [ visible ]);
    if(!visible) return null;
    const rank = (code: string) => profile.skills.find(skill => skill.skill_code === code)?.rank || 0;
    const learned = ANDROID_SKILLS.filter(skill => rank(skill.code) > 0).length;
    return <NitroCardView uniqueKey="game-skills" className="game-skills-window" theme="primary-slim">
        <NitroCardHeaderView headerText={ t('Evolução de skills') } onCloseClick={ () => setVisible(false) } />
        <NitroCardContentView gap={ 0 }>
            <header className="skill-tree-heading"><GameIcon name="skills" /><div><span className="game-section-code">ANDROID / NEURAL SYSTEM</span><h2>{ t('Árvore Android') }</h2></div><strong>{ learned } / { ANDROID_SKILLS.length }</strong></header>
            <div className="skill-tree-scroll"><div className="skill-tree-map">
                <svg viewBox="0 0 960 530" aria-hidden="true">{ ANDROID_SKILLS.flatMap(skill => skill.parents.map(parentCode =>
                {
                    const parent = ANDROID_SKILLS.find(node => node.code === parentCode);
                    return <path key={ `${ skill.code }-${ parentCode }` } className={ rank(skill.code) ? 'is-learned' : '' } d={ `M${ parent.x + 24 } ${ parent.y } H${ (parent.x + skill.x) / 2 } V${ skill.y } H${ skill.x - 24 }` } />;
                })) }</svg>
                { ANDROID_SKILLS.map(skill => <button key={ skill.code } type="button" className={ `skill-node branch-${ skill.branch }${ rank(skill.code) ? ' is-learned' : '' }${ selected.code === skill.code ? ' is-selected' : '' }` } style={ { left: skill.x, top: skill.y } } onClick={ () => setSelected(skill) } aria-pressed={ selected.code === skill.code }><GameIcon name={ skill.branch === 'core' ? 'skills' : skill.branch } /><span>{ t(skill.name) }</span><small>{ rank(skill.code) > 0 ? t('Ativo') : '0 / 1' }</small></button>) }
            </div></div>
            <footer className="skill-tree-detail"><div><strong>{ t(selected.name) }</strong><span>{ t('Evolução registrada') }: { rank(selected.code) } / 1</span><small>{ t('Módulos conectados') }: { selected.parents.map(code => t(ANDROID_SKILLS.find(node => node.code === code).name)).join(' + ') || 'ANDROID' }</small></div><p>{ t('Prévia da árvore Android. A obtenção de pontos será integrada às atividades do jogo.') }</p></footer>
        </NitroCardContentView>
    </NitroCardView>;
};
