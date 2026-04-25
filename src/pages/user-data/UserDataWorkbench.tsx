import { SegmentedButtonGroup } from '../../components/SegmentedButtonGroup'
import { SurfaceCard } from '../../components/SurfaceCard'
import { UserImportFields } from './UserImportFields'
import { UserImportResultPanel } from './UserImportResultPanel'
import type { UserDataPageModel } from './types'

type UserDataWorkbenchProps = {
  model: UserDataPageModel
}

export function UserDataWorkbench({ model }: UserDataWorkbenchProps) {
  const { t, method, importMethods, selectedMethod, handleParse, handleFillSample, handleClear, handleSelectMethod } = model

  return (
    <SurfaceCard
      eyebrow={t({ zh: '导入工作台', en: 'Import workbench' })}
      title={t({ zh: '先在本地浏览器里验证导入方式', en: 'Validate import modes inside the local browser first' })}
      description={selectedMethod.description}
      footer={
        <div className="button-row">
          <button type="button" className="action-button" onClick={handleParse}>
            {t({ zh: '读取并校验', en: 'Parse and validate' })}
          </button>
          <button type="button" className="action-button action-button--secondary" onClick={handleFillSample}>
            {t({ zh: '填入脱敏示例', en: 'Fill sample input' })}
          </button>
          <button type="button" className="action-button action-button--ghost" onClick={handleClear}>
            {t({ zh: '清空当前输入', en: 'Clear current input' })}
          </button>
        </div>
      }
    >
      <SegmentedButtonGroup
        value={method}
        items={importMethods.map((item) => ({
          value: item.id,
          label: item.label,
        }))}
        ariaLabel={t({ zh: '个人数据导入方式', en: 'User data import mode' })}
        onChange={handleSelectMethod}
        mode="tablist"
      />

      <UserImportFields model={model} />
      <UserImportResultPanel model={model} />
    </SurfaceCard>
  )
}
