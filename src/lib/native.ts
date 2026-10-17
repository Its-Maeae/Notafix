/**
 * Native Android Bridge
 * Kommuniziert mit dem nativen NotafixPlugin in der Android App.
 * Im Browser (nicht in der App) werden alle Methoden ignoriert.
 */

declare global {
  interface Window {
    Capacitor?: {
      Plugins?: {
        Notafix?: {
          reload: () => Promise<void>
          getSecuritySettings: () => Promise<{ lockEnabled: boolean; lockType: 'biometric' | 'password' }>
          setSecuritySettings: (opts: { lockEnabled: boolean; lockType: 'biometric' | 'password' }) => Promise<void>
          isBiometricAvailable: () => Promise<{ available: boolean }>
          authenticate: (opts: { lockType: string; title: string; subtitle?: string }) => Promise<{ success: boolean }>
        }
      }
    }
  }
}

function getPlugin() {
  return window?.Capacitor?.Plugins?.Notafix
}

export function isNativeApp(): boolean {
  return !!getPlugin()
}

export async function nativeReload(): Promise<void> {
  await getPlugin()?.reload()
}

export async function getSecuritySettings(): Promise<{ lockEnabled: boolean; lockType: 'biometric' | 'password' }> {
  const plugin = getPlugin()
  if (!plugin) return { lockEnabled: false, lockType: 'biometric' }
  return plugin.getSecuritySettings()
}

export async function setSecuritySettings(opts: { lockEnabled: boolean; lockType: 'biometric' | 'password' }): Promise<void> {
  await getPlugin()?.setSecuritySettings(opts)
}

export async function isBiometricAvailable(): Promise<boolean> {
  const plugin = getPlugin()
  if (!plugin) return false
  const result = await plugin.isBiometricAvailable()
  return result.available
}

export async function authenticate(lockType: 'biometric' | 'password'): Promise<boolean> {
  const plugin = getPlugin()
  if (!plugin) return true // Im Browser immer entsperren
  try {
    const result = await plugin.authenticate({
      lockType,
      title: 'Notafix entsperren',
      subtitle: lockType === 'biometric' ? 'Fingerabdruck verwenden' : 'PIN oder Passwort eingeben',
    })
    return result.success
  } catch {
    return false
  }
}
