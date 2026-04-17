import type { AppLocale } from '../../app/i18n'
import { ATTRIBUTE_GROUP_LABELS } from './attribute-group-labels'
import { MECHANIC_CATEGORY_LABELS } from './mechanic-category-labels'
import { ACQUISITION_TAG_LABELS } from './tag-labels/acquisition-tag-labels'
import { ALIGNMENT_TAG_LABELS } from './tag-labels/alignment-tag-labels'
import { AFFILIATION_TAG_LABELS } from './tag-labels/affiliation-tag-labels'
import { GENDER_TAG_LABELS } from './tag-labels/gender-tag-labels'
import { MECHANIC_TAG_LABELS } from './tag-labels/mechanic-tag-labels'
import { PROFESSION_TAG_LABELS } from './tag-labels/profession-tag-labels'
import { RACE_TAG_LABELS } from './tag-labels/race-tag-labels'

export const TAG_LABELS: Record<string, Record<AppLocale, string>> = {
  ...RACE_TAG_LABELS,
  ...GENDER_TAG_LABELS,
  ...ALIGNMENT_TAG_LABELS,
  ...PROFESSION_TAG_LABELS,
  ...AFFILIATION_TAG_LABELS,
  ...ACQUISITION_TAG_LABELS,
  ...MECHANIC_TAG_LABELS,
}

export { ATTRIBUTE_GROUP_LABELS, MECHANIC_CATEGORY_LABELS }
