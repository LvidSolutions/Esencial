import {useMemo, useState} from 'react'
import {Stack, Text} from '@sanity/ui'
import {useClient, type DocumentActionComponent} from 'sanity'

const apiVersion = '2025-02-19'

type ProjectDocument = {
  _id?: string
  _type?: string
  title?: string
  language?: string
  translationKey?: string
}

type ReferenceBlocker = {
  _id: string
  _type: string
  title?: string
}

function canonicalId(id: string) {
  return id.replace(/^drafts\./, '')
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="m6 7 1 13h10l1-13" />
      <path d="M10 11v5M14 11v5" />
    </svg>
  )
}

export const ProjectDeleteAction: DocumentActionComponent = (props) => {
  const baseClient = useClient({apiVersion})
  const client = useMemo(() => baseClient.withConfig({perspective: 'raw', useCdn: false}), [baseClient])
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (props.type !== 'project') return null

  const document = (props.draft || props.published || {}) as ProjectDocument
  const title = document.title?.trim() || 'det här projektet'

  const removeProject = async () => {
    setBusy(true)
    setError('')
    try {
      const currentId = canonicalId(props.id)
      const translationKey = document.translationKey?.trim()
      const pairDocuments = translationKey
        ? await client.fetch<ProjectDocument[]>(
            `*[_type == "project" && translationKey == $translationKey]{_id, _type, title, language, translationKey}`,
            {translationKey},
          )
        : [{_id: currentId, _type: 'project', title, language: document.language}]

      const canonicalIds = [...new Set(pairDocuments.map((item) => canonicalId(item._id || '')).filter(Boolean))]
      if (!canonicalIds.length) throw new Error('Projektets dokument-ID kunde inte fastställas.')

      const blockers = await client.fetch<ReferenceBlocker[]>(
        `*[references($ids) && !(string::split(_id, ".")[0] == "drafts" && string::split(_id, ".")[1] in $ids) && !(_id in $ids)]{_id, _type, title}`,
        {ids: canonicalIds},
      )
      const externalBlockers = blockers.filter((item) => !canonicalIds.includes(canonicalId(item._id)))
      if (externalBlockers.length) {
        const labels = externalBlockers
          .slice(0, 5)
          .map((item) => item.title || `${item._type} (${canonicalId(item._id)})`)
          .join(', ')
        throw new Error(
          `Projektet används fortfarande av ${labels}${externalBlockers.length > 5 ? ' med flera' : ''}. Ta bort de referenserna i Filter och ordning eller startsidan först.`,
        )
      }

      const idsToDelete = [...new Set(canonicalIds.flatMap((id) => [id, `drafts.${id}`]))]
      let transaction = client.transaction()
      for (const id of idsToDelete) transaction = transaction.delete(id)
      await transaction.commit()
      setConfirming(false)
      props.onComplete()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Projektet kunde inte raderas.')
    } finally {
      setBusy(false)
    }
  }

  return {
    label: 'Radera projekt',
    icon: TrashIcon,
    tone: 'critical',
    disabled: busy,
    onHandle: () => {
      setError('')
      setConfirming(true)
    },
    dialog: confirming
      ? {
          type: 'confirm',
          tone: 'critical',
          message: (
            <Stack space={3}>
              <Text weight="semibold">Radera {title}?</Text>
              <Text size={1}>
                Hela svenska/engelska projektparet raderas när en språkkoppling finns. Bilder i Sanitys assetbibliotek raderas inte. Åtgärden genomförs först efter denna bekräftelse och stoppas om andra dokument fortfarande refererar till projektet.
              </Text>
              {error ? <Text size={1} style={{color: 'var(--card-critical-fg-color)'}}>{error}</Text> : null}
            </Stack>
          ),
          onCancel: () => {
            if (!busy) {
              setConfirming(false)
              setError('')
            }
          },
          onConfirm: () => void removeProject(),
        }
      : false,
  }
}
