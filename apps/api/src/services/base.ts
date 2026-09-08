/** Service result type — discriminated union for service layer returns */
export type ServiceResult<T> =
  { ok: true; data: T } | { ok: false; error: string; status?: number };

/** Create a successful result */
export function ok<T>(data: T): ServiceResult<T> {
  return { ok: true, data };
}

/** Create an error result. Optional second arg is HTTP status code. */
export function err(error: string, status?: number): ServiceResult<never> {
  return { ok: false, error, status };
}
