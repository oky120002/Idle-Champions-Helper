import { UserDataIntroCard } from './user-data/UserDataIntroCard'
import { UserDataNextStageCard } from './user-data/UserDataNextStageCard'
import { UserDataWorkbench } from './user-data/UserDataWorkbench'
import { useUserDataPageModel } from './user-data/useUserDataPageModel'

export function UserDataPage() {
  const model = useUserDataPageModel()

  return (
    <div className="page-stack">
      <UserDataIntroCard model={model} />
      <UserDataWorkbench model={model} />
      <UserDataNextStageCard model={model} />
    </div>
  )
}
