/* tslint:disable */
/* eslint-disable */
export function validate_config(config_json: string): string;
export function start_game(): CoreGame;
export function apply_config_from_admin(config_json: string): string;
export function main(): void;
export function get_config(): string;
export class CoreGame {
  free(): void;
  [Symbol.dispose](): void;
  switch_tab(tab: string): void;
  toggle_coal(): void;
  buy_resource(resource: string): void;
  reload_config(): void;
  sell_resource(resource: string): void;
  mine_resources(): void;
  upgrade_mining(): void;
  debug_time_info(): string;
  upgrade_defense(): void;
  activate_defense(): void;
  add_manual_click(): void;
  debug_power_info(): string;
  debug_rebel_info(): string;
  is_auto_clicking(): boolean;
  stop_auto_clicking(): void;
  start_auto_clicking(): void;
  get_computational_power(): number;
  constructor();
  init(): void;
  clear_log(): void;
  game_loop(): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_coregame_free: (a: number, b: number) => void;
  readonly apply_config_from_admin: (a: number, b: number) => [number, number];
  readonly coregame_activate_defense: (a: number) => void;
  readonly coregame_add_manual_click: (a: number) => void;
  readonly coregame_buy_resource: (a: number, b: number, c: number) => void;
  readonly coregame_clear_log: (a: number) => void;
  readonly coregame_debug_power_info: (a: number) => [number, number];
  readonly coregame_debug_rebel_info: (a: number) => [number, number];
  readonly coregame_debug_time_info: (a: number) => [number, number];
  readonly coregame_game_loop: (a: number) => void;
  readonly coregame_get_computational_power: (a: number) => number;
  readonly coregame_init: (a: number) => void;
  readonly coregame_is_auto_clicking: (a: number) => number;
  readonly coregame_mine_resources: (a: number) => void;
  readonly coregame_new: () => number;
  readonly coregame_reload_config: (a: number) => void;
  readonly coregame_sell_resource: (a: number, b: number, c: number) => void;
  readonly coregame_start_auto_clicking: (a: number) => void;
  readonly coregame_stop_auto_clicking: (a: number) => void;
  readonly coregame_switch_tab: (a: number, b: number, c: number) => void;
  readonly coregame_toggle_coal: (a: number) => void;
  readonly coregame_upgrade_defense: (a: number) => void;
  readonly coregame_upgrade_mining: (a: number) => void;
  readonly get_config: () => [number, number];
  readonly main: () => void;
  readonly start_game: () => number;
  readonly validate_config: (a: number, b: number) => [number, number];
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
