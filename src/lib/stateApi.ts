import type { AppState } from './accountState'

const STATE_ENDPOINT = '/api/state'

const parseErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as { message?: unknown }
    if (typeof payload.message === 'string' && payload.message.length > 0) {
      return payload.message
    }
  } catch {
    // fall through
  }
  return '状态写回失败'
}

export const fetchAppState = async (): Promise<AppState> => {
  const response = await fetch(STATE_ENDPOINT)
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }
  return (await response.json()) as AppState
}

export const saveAppState = async (state: AppState): Promise<AppState> => {
  const response = await fetch(STATE_ENDPOINT, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(state),
  })
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }
  return (await response.json()) as AppState
}
