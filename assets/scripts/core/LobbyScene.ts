/**
 * LobbyScene.ts
 * 大厅场景控制器
 * 显示三线成长、开始战斗按钮
 */

import { _decorator, Component, Label, director, Button, Node } from 'cc';
import { GameData } from '../data/GameData';
import { SCENE_BATTLE } from './SceneManager';

const { ccclass, property } = _decorator;

@ccclass('LobbyScene')
export class LobbyScene extends Component {
    
    @property(Label)
    scrapLabel: Label | null = null;
    
    @property(Label)
    firepowerLabel: Label | null = null;
    
    @property(Label)
    defenseLabel: Label | null = null;
    
    @property(Label)
    supplyLabel: Label | null = null;
    
    @property(Node)
    startBattleBtn: Node | null = null;
    
    start() {
        console.log('[LobbyScene] 大厅场景开始');
        
        this.updateUI();
        
        // 绑定按钮事件
        if (this.startBattleBtn) {
            this.startBattleBtn.on(Node.EventType.TOUCH_END, this.onStartBattle, this);
        }
    }
    
    private updateUI() {
        const progress = GameData.progress;
        
        if (this.scrapLabel) {
            this.scrapLabel.string = `残骸: ${GameData.scrap}`;
        }
        
        if (this.firepowerLabel) {
            const bonus = GameData.getFirepowerBonus();
            this.firepowerLabel.string = `火力 Lv.${progress.firepower} (+${bonus}%)`;
        }
        
        if (this.defenseLabel) {
            const bonus = GameData.getDefenseBonus();
            this.defenseLabel.string = `城防 Lv.${progress.defense} (+${bonus}HP)`;
        }
        
        if (this.supplyLabel) {
            const bonus = GameData.getSupplyBonus();
            this.supplyLabel.string = `补给 Lv.${progress.supply} (+${bonus}DP)`;
        }
    }
    
    /**
     * 开始战斗
     */
    private onStartBattle() {
        console.log('[LobbyScene] 开始战斗');
        director.loadScene(SCENE_BATTLE);
    }
    
    /**
     * 升级火力线（Day6 实现完整逻辑）
     */
    upgradeFirepower() {
        console.log('[LobbyScene] 升级火力（待实现）');
        this.updateUI();
    }
    
    /**
     * 升级城防线
     */
    upgradeDefense() {
        console.log('[LobbyScene] 升级城防（待实现）');
        this.updateUI();
    }
    
    /**
     * 升级补给线
     */
    upgradeSupply() {
        console.log('[LobbyScene] 升级补给（待实现）');
        this.updateUI();
    }
}
