export const formatMoney = (value: number) =>
  value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export const formatOptionalMoney = (value: number | null) =>
  value === null ? '--' : formatMoney(value)

export const formatOptionalCount = (value: number | null) =>
  value === null ? '--' : value.toLocaleString('zh-CN')

export const formatSignedMoney = (value: number | null) =>
  value === null ? '--' : `${value > 0 ? '+' : ''}${formatMoney(value)}`

export const formatSignedCount = (value: number | null) =>
  value === null
    ? '--'
    : `${value > 0 ? '+' : ''}${value.toLocaleString('zh-CN')}`

export const formatRatio = (value: number | null) =>
  value === null ? '--' : `${value.toFixed(2)}%`

export const deltaTagType = (value: number | null) => {
  if (value === null) {
    return 'info'
  }

  if (value > 0) {
    return 'success'
  }

  if (value < 0) {
    return 'danger'
  }

  return 'info'
}
