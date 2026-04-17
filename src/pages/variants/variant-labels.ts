import type { AppLocale } from '../../app/i18n'
import type { VariantAreaHighlight, VariantAttackMix } from '../../domain/types'
import type { AttackProfileFilterId, SpecialEnemyFilterId } from './types'

const ENEMY_TYPE_LABELS: Record<string, { 'zh-CN': string; 'en-US': string }> = {
  aberration: { 'zh-CN': '异怪', 'en-US': 'Aberration' },
  astral_elf: { 'zh-CN': '星界精灵', 'en-US': 'Astral Elf' },
  bandit: { 'zh-CN': '强盗', 'en-US': 'Bandit' },
  beast: { 'zh-CN': '野兽', 'en-US': 'Beast' },
  construct: { 'zh-CN': '构装体', 'en-US': 'Construct' },
  demon: { 'zh-CN': '恶魔', 'en-US': 'Demon' },
  devil: { 'zh-CN': '魔鬼', 'en-US': 'Devil' },
  dinosaur: { 'zh-CN': '恐龙', 'en-US': 'Dinosaur' },
  dragon: { 'zh-CN': '龙类', 'en-US': 'Dragon' },
  drow: { 'zh-CN': '卓尔', 'en-US': 'Drow' },
  dwarf: { 'zh-CN': '矮人', 'en-US': 'Dwarf' },
  elemental: { 'zh-CN': '元素', 'en-US': 'Elemental' },
  elf: { 'zh-CN': '精灵', 'en-US': 'Elf' },
  fey: { 'zh-CN': '妖精', 'en-US': 'Fey' },
  fiend: { 'zh-CN': '邪魔', 'en-US': 'Fiend' },
  giant: { 'zh-CN': '巨人', 'en-US': 'Giant' },
  gnoll: { 'zh-CN': '豺狼人', 'en-US': 'Gnoll' },
  goblin: { 'zh-CN': '地精', 'en-US': 'Goblin' },
  goblinoid: { 'zh-CN': '类地精', 'en-US': 'Goblinoid' },
  humanoid: { 'zh-CN': '人形', 'en-US': 'Humanoid' },
  human: { 'zh-CN': '人类', 'en-US': 'Human' },
  kobold: { 'zh-CN': '狗头人', 'en-US': 'Kobold' },
  monstrosity: { 'zh-CN': '怪异生物', 'en-US': 'Monstrosity' },
  ooze: { 'zh-CN': '软泥', 'en-US': 'Ooze' },
  orc: { 'zh-CN': '兽人', 'en-US': 'Orc' },
  planescape: { 'zh-CN': '异界', 'en-US': 'Planescape' },
  plant: { 'zh-CN': '植物', 'en-US': 'Plant' },
  undead: { 'zh-CN': '亡灵', 'en-US': 'Undead' },
  vampire: { 'zh-CN': '吸血鬼', 'en-US': 'Vampire' },
  xanathar: { 'zh-CN': '眼魔帮', 'en-US': 'Xanathar' },
  yuan_ti: { 'zh-CN': '蛇人', 'en-US': 'Yuan-ti' },
  zhentarim: { 'zh-CN': '散塔林', 'en-US': 'Zhentarim' },
}

const ATTACK_PROFILE_LABELS: Record<Exclude<AttackProfileFilterId, '__all__'>, { 'zh-CN': string; 'en-US': string }> = {
  meleeHeavy: { 'zh-CN': '近战主导', 'en-US': 'Melee-heavy' },
  rangedThreat: { 'zh-CN': '远程威胁', 'en-US': 'Ranged pressure' },
  mixed: { 'zh-CN': '近远混编', 'en-US': 'Mixed spread' },
}

const SPECIAL_ENEMY_RANGE_LABELS: Record<Exclude<SpecialEnemyFilterId, '__all__'>, { 'zh-CN': string; 'en-US': string }> = {
  light: { 'zh-CN': '0-9 个', 'en-US': '0-9' },
  standard: { 'zh-CN': '10-12 个', 'en-US': '10-12' },
  dense: { 'zh-CN': '13+ 个', 'en-US': '13+' },
}

const MECHANIC_LABELS: Record<string, { 'zh-CN': string; 'en-US': string }> = {
  additional_bosses: { 'zh-CN': '额外 Boss', 'en-US': 'Extra bosses' },
  additional_bosses_by_area: { 'zh-CN': '分区追加 Boss', 'en-US': 'Area boss spikes' },
  blocked_heroes_by_area: { 'zh-CN': '分区封锁英雄', 'en-US': 'Area hero lockouts' },
  force_use_heroes: { 'zh-CN': '强制上阵', 'en-US': 'Forced heroes' },
  global_effects: { 'zh-CN': '全局效果', 'en-US': 'Global effects' },
  guaranteed_monster: { 'zh-CN': '固定特别怪', 'en-US': 'Guaranteed monster' },
  guaranteed_monsters: { 'zh-CN': '固定怪群', 'en-US': 'Guaranteed pack' },
  only_allow_crusaders: { 'zh-CN': '英雄限制', 'en-US': 'Hero restriction' },
  only_allow_crusaders_by_area: { 'zh-CN': '分区英雄限制', 'en-US': 'Area hero restriction' },
  random_monster: { 'zh-CN': '随机特别怪', 'en-US': 'Random monster' },
  random_monster_waves: { 'zh-CN': '随机怪波', 'en-US': 'Random waves' },
  replace_monsters: { 'zh-CN': '替换敌人', 'en-US': 'Replace monsters' },
  replace_monsters_by_area: { 'zh-CN': '分区替换敌人', 'en-US': 'Area monster swaps' },
  slot_escort: { 'zh-CN': '护送占位', 'en-US': 'Escort blockers' },
  slot_escort_by_area: { 'zh-CN': '递进护送占位', 'en-US': 'Scaling escorts' },
  static_monsters_by_area: { 'zh-CN': '分区固定敌人', 'en-US': 'Static enemies' },
  weather: { 'zh-CN': '天气效果', 'en-US': 'Weather' },
}

function titleCase(value: string): string {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(' ')
}

export function getEnemyTypeLabel(tag: string, locale: AppLocale): string {
  return ENEMY_TYPE_LABELS[tag]?.[locale] ?? titleCase(tag)
}

export function getAttackProfileLabel(id: AttackProfileFilterId, locale: AppLocale): string {
  if (id === '__all__') {
    return locale === 'zh-CN' ? '全部' : 'All'
  }

  return ATTACK_PROFILE_LABELS[id][locale]
}

export function getSpecialEnemyRangeLabel(id: SpecialEnemyFilterId, locale: AppLocale): string {
  if (id === '__all__') {
    return locale === 'zh-CN' ? '全部' : 'All'
  }

  return SPECIAL_ENEMY_RANGE_LABELS[id][locale]
}

export function getMechanicLabel(kind: string, locale: AppLocale): string {
  return MECHANIC_LABELS[kind]?.[locale] ?? titleCase(kind)
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function getAttackMixSummary(mix: VariantAttackMix, locale: AppLocale): string {
  const total = mix.melee + mix.ranged + mix.magic + mix.other

  if (total <= 0) {
    return locale === 'zh-CN' ? '暂无敌方攻击构成' : 'No enemy attack profile yet'
  }

  const meleeShare = mix.melee / total
  const rangedShare = mix.ranged / total
  const otherShare = (mix.magic + mix.other) / total

  return locale === 'zh-CN'
    ? `近战 ${formatPercent(meleeShare)} · 远程 ${formatPercent(rangedShare)} · 其他 ${formatPercent(otherShare)}`
    : `Melee ${formatPercent(meleeShare)} · Ranged ${formatPercent(rangedShare)} · Other ${formatPercent(otherShare)}`
}

function formatAreaRange(start: number, end: number | null, locale: AppLocale): string {
  if (end === null || end === start) {
    return locale === 'zh-CN' ? `${start} 区起` : `Area ${start}+`
  }

  return locale === 'zh-CN' ? `${start}-${end} 区` : `Area ${start}-${end}`
}

export function getAreaHighlightLabel(highlight: VariantAreaHighlight, locale: AppLocale): string {
  const prefix = formatAreaRange(highlight.start, highlight.end, locale)
  const body = (() => {
    switch (highlight.kind) {
      case 'slot_escort_by_area':
      case 'slot_escort':
        return locale === 'zh-CN' ? '追加护送占位' : 'escort blockers'
      case 'additional_bosses_by_area':
      case 'additional_bosses':
        return locale === 'zh-CN' ? '额外 Boss' : 'extra bosses'
      case 'blocked_heroes_by_area':
        return locale === 'zh-CN' ? '封锁英雄' : 'hero lockouts'
      case 'only_allow_crusaders_by_area':
      case 'only_allow_crusaders':
        return locale === 'zh-CN' ? '轮换限制' : 'rotation rule'
      case 'replace_monsters_by_area':
      case 'replace_monsters':
        return locale === 'zh-CN' ? '替换敌人池' : 'enemy swaps'
      case 'static_monsters_by_area':
        return locale === 'zh-CN' ? '固定敌人' : 'static enemies'
      case 'darken_by_area':
        return locale === 'zh-CN' ? '场景压暗' : 'darkened stage'
      case 'slot_effects_by_area':
        return locale === 'zh-CN' ? '槽位效果' : 'slot effects'
      default:
        return getMechanicLabel(highlight.kind, locale)
    }
  })()

  const loopHint =
    highlight.loopAt && highlight.loopAt > 0
      ? locale === 'zh-CN'
        ? ` · 每 ${highlight.loopAt} 区循环`
        : ` · repeats every ${highlight.loopAt}`
      : ''

  return `${prefix} · ${body}${loopHint}`
}
