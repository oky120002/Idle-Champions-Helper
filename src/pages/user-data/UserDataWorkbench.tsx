import { ClipboardCheck, Eraser, FlaskConical } from 'lucide-react'
import { ActionButtons } from '../../components/ActionButtons'
import { SegmentedButtonGroup } from '../../components/SegmentedButtonGroup'
import { SurfaceCard } from '../../components/SurfaceCard'
import { UserImportFields } from './UserImportFields'
import { UserImportResultPanel } from './UserImportResultPanel'
import type { UserDataPageModel } from './types'

type UserDataWorkbenchProps = {
  readonly model: UserDataPageModel
}

export function UserDataWorkbench({ model }: UserDataWorkbenchProps) {
  const { t, method, importMethods, selectedMethod, handleParse, handleFillSample, handleClear, handleSelectMethod } = model

  return (
    <SurfaceCard
      eyebrow={t("导入工作台")}
      title={t("先在本地浏览器里验证导入方式")}
      description={selectedMethod.description}
      footer={
        <ActionButtons
          items={[
            {
              id: 'parse',
              label: t("读取并校验"),
              icon: <ClipboardCheck aria-hidden="true" strokeWidth={1.9} />,
              onClick: handleParse,
            },
            {
              id: 'fill-sample',
              label: t("填入脱敏示例"),
              icon: <FlaskConical aria-hidden="true" strokeWidth={1.9} />,
              tone: 'secondary',
              onClick: handleFillSample,
            },
            {
              id: 'clear',
              label: t("清空当前输入"),
              icon: <Eraser aria-hidden="true" strokeWidth={1.9} />,
              tone: 'ghost',
              onClick: handleClear,
            },
          ]}
        />
      }
    >
      <SegmentedButtonGroup
        value={method}
        items={importMethods.map((item) => ({
          value: item.id,
          label: item.label,
        }))}
        ariaLabel={t("个人数据导入方式")}
        onChange={handleSelectMethod}
        mode="tablist"
      />

      <UserImportFields model={model} />
      <UserImportResultPanel model={model} />
    </SurfaceCard>
  )
}
