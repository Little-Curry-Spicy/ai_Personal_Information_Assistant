import { useState } from 'react'

type IngestFileResponse = {
  chunksIndexed?: number
  deletedChunks?: number
  qualityReport?: { summary?: { passed?: number; total?: number } }
  message?: string
}

type IngestGithubResponse = {
  chunksIndexed?: number
  qualityReport?: { summary?: { passed?: number; total?: number } }
  message?: string
}

export type UseKnowledgeIngestOptions = {
  /** 与聊天接口一致，附加 Authorization 等（如 Clerk JWT） */
  getAuthHeaders?: () => Promise<Record<string, string>>
  initialGithubUser?: string
}

async function mergeHeaders(
  base: HeadersInit | undefined,
  getAuthHeaders?: () => Promise<Record<string, string>>,
): Promise<Headers> {
  const h = new Headers(base)
  const extra = await getAuthHeaders?.()
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v) h.set(k, v)
    }
  }
  return h
}

/**
 * 管理知识库更新：简历上传覆盖 + GitHub 同步。
 */
export function useKnowledgeIngest(apiBase: string, options: UseKnowledgeIngestOptions = {}) {
  const { getAuthHeaders, initialGithubUser = 'Little-Curry-Spicy' } = options
  const [uploadBusy, setUploadBusy] = useState(false)
  const [githubBusy, setGithubBusy] = useState(false)
  const [githubUser, setGithubUser] = useState(initialGithubUser)
  const [ingestMessage, setIngestMessage] = useState<string | null>(null)
  const [selectedResumeName, setSelectedResumeName] = useState<string | null>(null)

  async function uploadResume(file?: File | null, replaceExisting = true) {
    if (!file) return
    setUploadBusy(true)
    setIngestMessage(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const headers = await mergeHeaders(undefined, getAuthHeaders)
      const resp = await fetch(`${apiBase}/knowledge/ingest/file?replace=${replaceExisting ? '1' : '0'}`, {
        method: 'POST',
        headers,
        body: formData,
      })
      const json = (await resp.json()) as IngestFileResponse
      if (!resp.ok) {
        throw new Error(json?.message ?? '上传失败')
      }
      const passed = json.qualityReport?.summary?.passed ?? 0
      const total = json.qualityReport?.summary?.total ?? 0
      setIngestMessage(
        `简历已入库：新增 ${json.chunksIndexed ?? 0} 段，覆盖删除 ${json.deletedChunks ?? 0} 段，质检 ${passed}/${total} 通过。`,
      )
    } catch (e) {
      setIngestMessage(`简历上传失败：${(e as Error).message}`)
    } finally {
      setUploadBusy(false)
    }
  }

  async function syncGithub() {
    const username = githubUser.trim()
    if (!username) return
    setGithubBusy(true)
    setIngestMessage(null)
    try {
      const headers = await mergeHeaders({ 'Content-Type': 'application/json' }, getAuthHeaders)
      const resp = await fetch(`${apiBase}/knowledge/ingest/github`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ username, maxRepos: 15 }),
      })
      const json = (await resp.json()) as IngestGithubResponse
      if (!resp.ok) {
        throw new Error(json?.message ?? '同步失败')
      }
      const passed = json.qualityReport?.summary?.passed ?? 0
      const total = json.qualityReport?.summary?.total ?? 0
      setIngestMessage(`GitHub 已同步：新增 ${json.chunksIndexed ?? 0} 段，质检 ${passed}/${total} 通过。`)
    } catch (e) {
      setIngestMessage(`GitHub 同步失败：${(e as Error).message}`)
    } finally {
      setGithubBusy(false)
    }
  }

  return {
    uploadBusy,
    githubBusy,
    githubUser,
    setGithubUser,
    ingestMessage,
    selectedResumeName,
    setSelectedResumeName,
    uploadResume,
    syncGithub,
  }
}
