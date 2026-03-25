const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const COMPANY_ID_REGEX = /^[A-Za-z0-9-]{3,40}$/

export function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export function assertEmail(value: unknown): string {
  const email = asTrimmedString(value).toLowerCase()
  if (!EMAIL_REGEX.test(email)) {
    throw new Error("Invalid email address")
  }
  return email
}

export function assertPositiveNumber(value: unknown, fieldName: string): number {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new Error(`Invalid ${fieldName}`)
  }
  return numberValue
}

export function assertIntegerId(value: unknown, fieldName: string): number {
  const numberValue = Number(value)
  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error(`Invalid ${fieldName}`)
  }
  return numberValue
}

export function assertCompanyId(value: unknown): string {
  const companyId = asTrimmedString(value)
  if (!COMPANY_ID_REGEX.test(companyId)) {
    throw new Error("Invalid company ID")
  }
  return companyId
}
