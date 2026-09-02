import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {Button, Card, Flex, Stack, Text} from '@sanity/ui'
import {useClient} from 'sanity'
import type {WorkspaceSectionDefinition} from '../../components/workspace-shell/WorkspaceShell'
import {canonicalDocumentId} from './navigationContract.mjs'
import {gridReferences, patchDraft, projectReferences} from './drafts'
import {FilterCategoryEditor} from './FilterCategoryEditor'
import {GridNavigationEditor} from './GridNavigationEditor'
import {ProjectHeadingEditor} from './ProjectHeadingEditor'
import {
  projectPairs,
  type FeatureStatus,
  type FilterCategory,
  type NavigationSettings,
  type ProjectSummary,
  type SaveState,
} from './types'
import './projectsFilters.css'

const apiVersion = '2025-02-19'
const projectsQuery = `*[_type == "project"] | order(translationKey asc, language asc) {
  _id, _originalId, title, "slug": slug.current, language, translationKey, status
}`
const categoriesQuery = `*[_type == "filterCategory"] | order(order asc, key asc) {
  _id, _originalId, key, labelSv, labelEn, order, visible, "projectRefs": projects[]._ref,
  "projectOrder": projectOrder[]._ref
}`
const settingsQuery = `*[_type == "navigationSettings" && _id in ["navigationSettings", "drafts.navigationSettings"]] | order(_updatedAt desc)[0] {
  _id, _originalId, enabled, headingSv, headingEn, allLabelSv, allLabelEn,
  "gridEntries": gridProjects[]{_key, "projectRef": project._ref, includeInGrid}
}`

type Props = {
  onStatusChange?: (status: FeatureStatus) => void
}

export function ProjectsFiltersSection({onStatusChange}: Props) {
  const baseClient = useClient({apiVersion})
  const client = useMemo(
    () => baseClient.withConfig({perspective: 'drafts', useCdn: false}),
    [baseClient],
  )
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [categories, setCategories] = useState<FilterCategory[]>([])
  const [settings, setSettings] = useState<NavigationSettings>()
  const [selectedPairKey, setSelectedPairKey] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('loading')
  const [error, setError] = useState('')
  const statusCallback = useRef(onStatusChange)

  useEffect(() => {
    statusCallback.current = onStatusChange
  }, [onStatusChange])

  const load = useCallback(async () => {
    setSaveState('loading')
    setError('')
    try {
      const [nextProjects, nextCategories, nextSettings] = await Promise.all([
        client.fetch<ProjectSummary[]>(projectsQuery),
        client.fetch<FilterCategory[]>(categoriesQuery),
        client.fetch<NavigationSettings | null>(settingsQuery),
      ])
      const normalizedCategories = nextCategories.map((category) => ({
        ...category,
        projectRefs: category.projectRefs || [],
        projectOrder: category.projectOrder || category.projectRefs || [],
      }))
      setProjects(nextProjects)
      setCategories(normalizedCategories)
      setSettings(
        nextSettings ? {...nextSettings, gridEntries: nextSettings.gridEntries || []} : undefined,
      )
      const pairs = projectPairs(nextProjects)
      setSelectedPairKey((current) =>
        pairs.some((pair) => pair.key === current) ? current : pairs[0]?.key || '',
      )
      setSelectedCategoryId((current) =>
        normalizedCategories.some((category) => category._id === current)
          ? current
          : normalizedCategories[0]?._id || '',
      )
      setSaveState('saved')
    } catch {
      setSaveState('error')
      setError(
        'Kunde inte läsa projekt och filter. Ingen publicerad version ändrades. Ladda om eller öppna den avancerade dokumentvyn.',
      )
    }
  }, [client])

  useEffect(() => {
    void load()
  }, [load])

  const statusLabel =
    saveState === 'loading'
      ? 'Laddar filter…'
      : saveState === 'saving'
        ? 'Sparar…'
        : saveState === 'saved'
          ? 'Sparat'
          : 'Kunde inte spara'
  useEffect(() => {
    statusCallback.current?.({state: saveState, label: statusLabel})
  }, [saveState, statusLabel])

  const pairs = useMemo(() => projectPairs(projects), [projects])
  const runSave = async (operation: () => Promise<void>) => {
    setSaveState('saving')
    setError('')
    try {
      await operation()
      setSaveState('saved')
    } catch {
      setSaveState('error')
      setError(
        'Sparningen misslyckades. Ingen publicerad version ändrades. Kontrollera anslutningen och försök igen.',
      )
    }
  }

  const saveProjectTitle = (project: ProjectSummary, title: string) =>
    runSave(async () => {
      await patchDraft(client, project._id, 'project', {title})
      const targetId = canonicalDocumentId(project._id)
      setProjects((current) =>
        current.map((candidate) =>
          canonicalDocumentId(candidate._id) === targetId ? {...candidate, title} : candidate,
        ),
      )
    })

  const saveCategory = (
    category: FilterCategory,
    patch: {
      labelSv: string
      labelEn: string
      order: number
      visible: boolean
      projectRefs: string[]
      projectOrder: string[]
    },
  ) =>
    runSave(async () => {
      await patchDraft(client, category._id, 'filterCategory', {
        labelSv: patch.labelSv,
        labelEn: patch.labelEn,
        order: patch.order,
        visible: patch.visible,
        projects: projectReferences(patch.projectRefs),
        projectOrder: projectReferences(patch.projectOrder),
      })
      const targetId = canonicalDocumentId(category._id)
      setCategories((current) =>
        current
          .map((candidate) =>
            canonicalDocumentId(candidate._id) === targetId ? {...candidate, ...patch} : candidate,
          )
          .sort((left, right) => (left.order ?? 0) - (right.order ?? 0)),
      )
    })

  const saveSettings = (patch: {
    enabled: boolean
    headingSv: string
    headingEn: string
    allLabelSv: string
    allLabelEn: string
    gridEntries: Array<{projectRef?: string; includeInGrid?: boolean}>
  }) =>
    runSave(async () => {
      await patchDraft(client, 'navigationSettings', 'navigationSettings', {
        enabled: patch.enabled,
        headingSv: patch.headingSv,
        headingEn: patch.headingEn,
        allLabelSv: patch.allLabelSv,
        allLabelEn: patch.allLabelEn,
        gridProjects: gridReferences(patch.gridEntries),
      })
      setSettings({_id: 'drafts.navigationSettings', ...patch})
    })

  return (
    <Stack space={4} className="esencial-projects-feature">
      <Flex justify="flex-end">
        <Button
          mode="ghost"
          text="Ladda om"
          disabled={saveState === 'saving'}
          onClick={() => void load()}
        />
      </Flex>

      {error && (
        <Card padding={3} radius={2} border tone="critical" role="alert">
          <Text size={1}>{error}</Text>
        </Card>
      )}

      {saveState !== 'loading' && (
        <>
          <ProjectHeadingEditor
            pairs={pairs}
            selectedKey={selectedPairKey}
            saving={saveState === 'saving'}
            onSelect={setSelectedPairKey}
            onSaveTitle={saveProjectTitle}
            onCreate={(language) => {
              window.location.hash = `#/intent/create/template=project-${language}`
            }}
            onOpen={(project) => {
              window.location.hash = `#/intent/edit/id=${encodeURIComponent(canonicalDocumentId(project._id))};type=project`
            }}
          />
          <FilterCategoryEditor
            categories={categories}
            pairs={pairs}
            selectedId={selectedCategoryId}
            saving={saveState === 'saving'}
            onSelect={setSelectedCategoryId}
            onCreate={() => {
              window.location.hash = '#/intent/create/type=filterCategory'
            }}
            onOpen={(category) => {
              window.location.hash = `#/intent/edit/id=${encodeURIComponent(canonicalDocumentId(category._id))};type=filterCategory`
            }}
            onSave={saveCategory}
          />
          <GridNavigationEditor
            settings={settings}
            pairs={pairs}
            saving={saveState === 'saving'}
            onSave={saveSettings}
            onOpen={() => {
              window.location.hash = '#/intent/edit/id=navigationSettings;type=navigationSettings'
            }}
          />
        </>
      )}
    </Stack>
  )
}

export function createProjectsFiltersSection(
  onStatusChange?: (status: FeatureStatus) => void,
): WorkspaceSectionDefinition {
  return {
    id: 'projects-filters',
    children: <ProjectsFiltersSection onStatusChange={onStatusChange} />,
  }
}
