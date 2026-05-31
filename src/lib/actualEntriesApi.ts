import type { ActualPositionEntry } from './tracking'

export interface ActualEntriesPayload {
  updatedAt: string | null
  entries: Record<string, ActualPositionEntry>
}

const ACTUAL_ENTRIES_ENDPOINT = '/api/actual-entries'

const parseResponse = async (
  response: Response,
): Promise<ActualEntriesPayload> => {
  const payload = (await response.json()) as
    | ActualEntriesPayload
    | { message?: string }

  if (!response.ok) {
    throw new Error(
      'message' in payload && payload.message
        ? payload.message
        : '实盘记录写回失败',
    )
  }

  if (!('entries' in payload) || typeof payload.entries !== 'object') {
    throw new Error('实盘记录响应格式不正确')
  }

  return payload
}

export const fetchActualEntries = async () => {
  const response = await fetch(ACTUAL_ENTRIES_ENDPOINT)
  return parseResponse(response)
}

export const saveActualEntryToFile = async (entry: ActualPositionEntry) => {
  const response = await fetch(ACTUAL_ENTRIES_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(entry),
  })

  return parseResponse(response)
}

export const deleteActualEntryFromFile = async (date: string) => {
  const response = await fetch(
    `${ACTUAL_ENTRIES_ENDPOINT}?date=${encodeURIComponent(date)}`,
    {
      method: 'DELETE',
    },
  )

  return parseResponse(response)
}
