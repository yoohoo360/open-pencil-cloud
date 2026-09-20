/** Preferences and credential stores cannot commit as one transaction. */
export type SettingsSaveResult = 'saved' | 'failed' | 'partial'
