/**
 * 星系的几何参数。
 *
 * 画布和"轨道标签"两处都要用，必须来自同一个函数——否则窗口一改动，
 * 标签就会飘到星核外面去，看起来像贴错位置的贴纸。
 */
export interface CosmosLayout {
  /** 宽屏走"文字在左、星系在右"的分栏布局 */
  wide: boolean
  /** 星系核心 */
  cx: number
  cy: number
  /** 星系盘半径 */
  maxR: number
}

export function cosmosLayout(w: number, h: number): CosmosLayout {
  const wide = w >= 720
  return {
    wide,
    cx: wide ? w * 0.665 : w * 0.5,
    cy: wide ? h * 0.5 : h * 0.4,
    maxR: wide ? Math.min(w * 0.305, h * 0.455) : Math.min(w * 0.56, h * 0.275),
  }
}
