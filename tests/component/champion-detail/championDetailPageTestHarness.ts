import { render } from '@testing-library/react'
import { createElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import { I18nProvider } from '../../../src/app/i18n'
import { loadBinaryData, loadChampionDetail, loadCollection } from '../../../src/data/client'
import { ChampionDetailPage } from '../../../src/pages/ChampionDetailPage'
import {
  animationFixture,
  createDomRect,
  defaultSectionTopMap,
  illustrationFixture,
  specializationGraphicFixture,
} from './championDetailPageTestData'

export const mockedLoadChampionDetail = vi.mocked(loadChampionDetail)
export const mockedLoadBinaryData = vi.mocked(loadBinaryData)
export const mockedLoadCollection = vi.mocked(loadCollection)
export const sectionTopMap: Record<string, number> = { ...defaultSectionTopMap }

const originalScrollIntoView = Element.prototype.scrollIntoView
const originalGetContext = HTMLCanvasElement.prototype.getContext

export function prepareChampionDetailDomEnvironment() {
  window.history.replaceState(window.history.state, '', '/')
  Object.assign(sectionTopMap, defaultSectionTopMap)

  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  })

  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    writable: true,
    value: vi.fn(() => ({
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
    })),
  })

  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function mockBoundingClientRect(this: Element) {
    if (this instanceof HTMLElement) {
      return createDomRect(sectionTopMap[this.id] ?? 4000)
    }

    return createDomRect(4000)
  })
}

export function restoreChampionDetailDomEnvironment() {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    writable: true,
    value: originalScrollIntoView,
  })

  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    writable: true,
    value: originalGetContext,
  })
}

export function mockChampionDetailCollections() {
  mockedLoadCollection.mockImplementation(async (name) => {
    if (name === 'champion-animations') {
      return animationFixture
    }

    if (name === 'champion-illustrations') {
      return illustrationFixture
    }

    if (name === 'champion-specialization-graphics') {
      return specializationGraphicFixture
    }

    throw new Error(`unexpected collection: ${name}`)
  })
}

function renderAtRoute(initialEntry: string, includeBackRoute: boolean) {
  return render(
    createElement(
      I18nProvider,
      null,
      createElement(
        MemoryRouter,
        { initialEntries: [initialEntry] },
        createElement(
          Routes,
          null,
          includeBackRoute ? createElement(Route, { path: '/champions', element: createElement('div', null, '筛选页占位') }) : null,
          createElement(Route, { path: '/champions/:championId', element: createElement(ChampionDetailPage) }),
        ),
      ),
    ),
  )
}

export function renderChampionDetailPage() {
  return renderChampionDetailPageAt('/champions/7')
}

export function renderChampionDetailPageAt(initialEntry: string) {
  return renderAtRoute(initialEntry, false)
}

export function renderChampionDetailPageWithSearch() {
  return renderChampionDetailPageAt('/champions/7?q=alpha&seat=1&role=support')
}

export function renderChampionDetailPageWithBackRoute(initialEntry: string) {
  return renderAtRoute(initialEntry, true)
}
