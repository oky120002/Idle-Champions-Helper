import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { I18nProvider } from '../../../src/app/i18n'
import { loadCollection, loadCollectionAtVersion, loadVersion } from '../../../src/data/client'
import { APP_DATABASE_NAME } from '../../../src/data/localDatabase'
import { FormationPage } from '../../../src/pages/FormationPage'
import type { Champion, DataCollection, DataVersion, FormationLayout } from '../../../src/domain/types'

export const mockedLoadCollection = vi.mocked(loadCollection)
export const mockedLoadCollectionAtVersion = vi.mocked(loadCollectionAtVersion)
export const mockedLoadVersion = vi.mocked(loadVersion)

export async function resetFormationPageDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(APP_DATABASE_NAME)

    request.onerror = () => {
      reject(request.error ?? new Error('删除测试数据库失败。'))
    }

    request.onblocked = () => {
      reject(new Error('删除测试数据库被阻塞。'))
    }

    request.onsuccess = () => {
      resolve()
    }
  })
}

type FormationPageCollectionOverrides = {
  version: DataVersion
  formations: DataCollection<FormationLayout>
  champions: DataCollection<Champion>
}

export function mockFormationPageCollections({ version, formations, champions }: FormationPageCollectionOverrides) {
  mockedLoadVersion.mockResolvedValue(version)
  mockedLoadCollection.mockImplementation(async (name) => {
    if (name === 'formations') {
      return formations
    }

    if (name === 'champions') {
      return champions
    }

    throw new Error(`unexpected collection: ${name}`)
  })
  mockedLoadCollectionAtVersion.mockImplementation(async (requestedVersion, name) => {
    if (requestedVersion === version.current && name === 'formations') {
      return formations
    }

    if (requestedVersion === version.current && name === 'champions') {
      return champions
    }

    throw new Error(`unexpected collection at version: ${requestedVersion}/${name}`)
  })
}

export function renderFormationPage() {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <FormationPage />
      </MemoryRouter>
    </I18nProvider>,
  )
}
