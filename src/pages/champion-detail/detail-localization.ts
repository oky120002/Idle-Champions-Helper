import type { AppLocale } from '../../app/i18n'

export function containsCjkCharacters(value: string): boolean {
  return /[\u3400-\u9fff]/u.test(value)
}

export function humanizeIdentifier(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim()
}

export function toTitleCase(value: string): string {
  if (!value) {
    return value
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function localizeSourceType(value: string, locale: AppLocale): string {
  const normalized = value.trim().toLowerCase()
  const zhMap: Record<string, string> = {
    adventure: '冒险奖励',
    campaign: '战役奖励',
    chest: '宝箱',
    default: '默认解锁',
    dlc: 'DLC',
    emergence: 'Emergence',
    event: '活动',
    flash_sale: '闪促',
    free: '免费',
    gem_shop: '宝石商店',
    gems: '宝石商店',
    giveaway: '赠送',
    not_yet_available: '尚未开放',
    other: '其他',
    patron: '赞助商店',
    premium: '付费',
    promo: '促销',
    season: '赛季',
    trials: '试炼',
    wild_offer: 'Wild Offer',
  }
  const enMap: Record<string, string> = {
    gem_shop: 'Gem shop',
    not_yet_available: 'Not yet available',
    flash_sale: 'Flash sale',
    patron: 'Patron shop',
    promo: 'Promotion',
    trials: 'Trials',
    wild_offer: 'Wild Offer',
  }

  if (locale === 'zh-CN') {
    return zhMap[normalized] ?? normalized
  }

  return enMap[normalized] ?? toTitleCase(humanizeIdentifier(normalized))
}

export function localizeAbilityScore(value: string, locale: AppLocale): string {
  const normalized = value.trim().toLowerCase()
  const zhMap: Record<string, string> = {
    str: '力量',
    dex: '敏捷',
    con: '体质',
    int: '智力',
    wis: '感知',
    cha: '魅力',
  }
  const enMap: Record<string, string> = {
    str: 'Strength',
    dex: 'Dexterity',
    con: 'Constitution',
    int: 'Intelligence',
    wis: 'Wisdom',
    cha: 'Charisma',
  }

  if (locale === 'zh-CN') {
    return zhMap[normalized] ?? normalized.toUpperCase()
  }

  return enMap[normalized] ?? normalized.toUpperCase()
}

export function localizeUpgradeType(value: string | null, locale: AppLocale): string {
  if (!value) {
    return locale === 'zh-CN' ? '数值成长' : 'Numeric growth'
  }

  const normalized = value.trim().toLowerCase()
  const zhMap: Record<string, string> = {
    unlock_ability: '解锁能力',
    unlock_ultimate: '解锁终极技',
    upgrade_ability: '能力强化',
  }
  const enMap: Record<string, string> = {
    unlock_ability: 'Unlock ability',
    unlock_ultimate: 'Unlock ultimate',
    upgrade_ability: 'Ability boost',
  }

  if (locale === 'zh-CN') {
    return zhMap[normalized] ?? humanizeIdentifier(normalized)
  }

  return enMap[normalized] ?? toTitleCase(humanizeIdentifier(normalized))
}

export function localizeEffectKind(value: string, locale: AppLocale): string {
  const normalized = value.trim().toLowerCase()
  const zhMap: Record<string, string> = {
    add_attack_targets: '追加目标',
    buff_attack_damage: '普攻强化',
    buff_base_crit_chance_add: '暴击率',
    buff_base_crit_damage: '暴击伤害',
    buff_ultimate: '终极技强化',
    buff_upgrade: '能力强化',
    buff_upgrade_add_flat_amount: '能力强化',
    buff_upgrades: '批量能力强化',
    change_base_attack: '替换普攻',
    change_upgrade_data: '修改升级效果',
    change_upgrade_targets: '修改升级目标',
    effect_def: '效果定义',
    global_dps_multiplier_mult: '全队增伤',
    gold_multiplier_mult: '金币加成',
    health_add: '生命值',
    health_mult: '生命值',
    hero_dps_multiplier_mult: '自身增伤',
    increase_ability_score: '属性强化',
    reduce_attack_cooldown: '冷却缩减',
    set_ultimate_attack: '终极技',
  }

  if (locale === 'zh-CN') {
    return zhMap[normalized] ?? humanizeIdentifier(normalized)
  }

  return toTitleCase(humanizeIdentifier(normalized))
}

export function localizeStructuredKey(key: string, locale: AppLocale): string {
  const normalized = key.trim()
  const zhMap: Record<string, string> = {
    adventure_ids: '冒险 ID',
    adventures: '冒险',
    amount_func: '数值计算方式',
    amount_updated_listeners: '更新监听器',
    attack_sound: '攻击音效 ID',
    available_at_time: '开放时间',
    available_in_store: '商店上架时间',
    base_attack_taunts: '普攻附带嘲讽',
    base_graphic_id: 'Base Graphic ID',
    chest_type_id: '宝箱类型 ID',
    collections_source: '来源',
    companion_graphic_id: '同伴 Graphic ID',
    companion_visible: '显示同伴',
    console_portrait: '主机头像 ID',
    cost: '价格',
    death_sound: '死亡音效 ID',
    enflamed_graphic_id: '燃烧态 Graphic ID',
    effect_string: '效果',
    eye_height: '眼位高度',
    event_logo_graphic_id: '活动 Logo Graphic ID',
    gold_chest_type_id: '金宝箱类型',
    graphic_id: 'Graphic ID',
    graphic_large: 'Large Graphic ID',
    graphic_xl: 'XL Graphic ID',
    head_graphic_id: '头部 Graphic ID',
    impale_graphic_id: 'Impale Graphic ID',
    in_flash_sale: '闪促',
    in_flash_sales: '闪促可得',
    is_available: '当前可用',
    is_premium: '付费内容',
    item_id: '物品 ID',
    large_graphic_id: 'Large Graphic ID',
    legendary_effect_id: '传奇效果 ID',
    new_targets: '新目标范围',
    notification_adjustment: '通知偏移',
    notification_adjustment_override: '通知偏移覆盖',
    num_back_cols: '向后列数',
    odds: '概率',
    off_when_benched: '离场失效',
    offset: '偏移',
    pain_sounds: '受击音效',
    particle_graphic_ids: '粒子 Graphic ID',
    patron_id: '赞助人 ID',
    patron_shop_item_id: '赞助商店物品 ID',
    portrait_center_offset: '头像中心偏移',
    portrait_graphic_id: 'Portrait Graphic ID',
    premium_item_id: '高级物品 ID',
    projectile_graphic_id: 'Projectile Graphic ID',
    promotion_id: '促销 ID',
    scale: '缩放',
    seat_id: 'Seat ID',
    show_bonus: '显示加成',
    show_incoming: '显示入场效果',
    show_only_if_owned: '仅拥有时显示',
    soft_currency: '软货币',
    specialization_graphic_id: '专精 Graphic ID',
    source: '来源',
    stack_func: '叠层计算方式',
    targets: '作用目标',
    trials_effect_id: '试炼效果 ID',
    type: '类型',
    ultimate_color: '终极技颜色',
    weekly_buff: '周增益',
    weekly_chest_type_id: '周宝箱类型',
    xl_graphic_id: 'XL Graphic ID',
  }

  if (locale === 'zh-CN') {
    return zhMap[normalized] ?? toTitleCase(humanizeIdentifier(normalized))
  }

  return toTitleCase(humanizeIdentifier(normalized))
}
