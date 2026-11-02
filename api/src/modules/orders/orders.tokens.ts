/** Nest DI tokens for the orders ports, so tests can override any adapter. */
export const ORDERS_DEPS = Symbol('ORDERS_DEPS');
export const ORDERS_REPOSITORY = Symbol('ORDERS_REPOSITORY');
export const ORDERS_CLOCK = Symbol('ORDERS_CLOCK');
