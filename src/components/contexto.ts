import { createContext } from 'react';

/**
 * Abre Ajustes desde el engranaje del header de cualquier pantalla.
 * Lo provee el AppShell; si es null (onboarding, reservas, admin), no hay engranaje.
 */
export const AbrirAjustesContext = createContext<(() => void) | null>(null);
