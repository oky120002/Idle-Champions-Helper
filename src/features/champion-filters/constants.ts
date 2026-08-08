/**
 * 英雄筛选维度共享 URL param keys。
 *
 * 消费方（champions / illustrations / formation）共用 COMMON_FILTER_PARAM_KEYS（query-state.ts），
 * param 名跨页面一致——跳转时筛选条件在 URL 中无缝传递。
 */

export const SEARCH_PARAM_QUERY = 'q'
export const SEARCH_PARAM_SEAT = 'seat'
export const SEARCH_PARAM_ROLE = 'role'
export const SEARCH_PARAM_AFFILIATION = 'affiliation'
export const SEARCH_PARAM_RACE = 'race'
export const SEARCH_PARAM_GENDER = 'gender'
export const SEARCH_PARAM_ALIGNMENT = 'alignment'
export const SEARCH_PARAM_PROFESSION = 'profession'
export const SEARCH_PARAM_ACQUISITION = 'acquisition'
export const SEARCH_PARAM_MECHANIC = 'mechanic'
export const SEARCH_PARAM_PATRON = 'patron'
