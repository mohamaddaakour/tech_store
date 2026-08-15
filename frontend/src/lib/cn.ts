/**
 * Joins class names, dropping anything falsy.
 *
 * The problem it solves: building a className from conditions gets ugly fast.
 *
 * ```tsx
 * // Without cn -- note the stray "false" and double spaces this can produce:
 * className={`btn ${isActive && "btn-active"} ${className}`}
 *
 * // With cn:
 * className={cn("btn", isActive && "btn-active", className)}
 * ```
 *
 * `false`, `undefined` and `null` are skipped, so `condition && "class"` is a
 * safe way to add a class conditionally. Accepting `undefined` also means a
 * component can pass its optional `className` prop straight through.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
