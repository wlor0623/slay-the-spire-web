// 游戏入口：初始化全局状态并渲染主菜单。
(function () {
  const STS = window.STS;
  STS.game = {
    run: null,
    screen: 'menu',
    combat: null,
    sel: null,
    potionSel: null,
    reward: null,
    shop: null,
    chest: null,
    event: null
  };
  window.addEventListener('DOMContentLoaded', () => STS.ui.render());
})();