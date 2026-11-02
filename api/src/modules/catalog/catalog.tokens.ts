/** Nest DI tokens for the catalog ports, so tests can override any adapter. */
export const CATALOG_DEPS = Symbol('CATALOG_DEPS');
export const CATALOG_REPOSITORY = Symbol('CATALOG_REPOSITORY');
export const CATALOG_ID_GENERATOR = Symbol('CATALOG_ID_GENERATOR');
