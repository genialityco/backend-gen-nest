/**
 * Utilidad para validar y limpiar direcciones de correo electrónico
 */

export class EmailValidator {
  // Patrones de error común para corrección automática
  private static readonly COMMON_TYPOS: Record<string, string> = {
    'gmai.com': 'gmail.com',
    'gmial.com': 'gmail.com',
    'yaho.com': 'yahoo.com',
    'yaho.es': 'yahoo.es',
    'hotmial.com': 'hotmail.com',
    'outlok.com': 'outlook.com',
    'gmx.es': 'gmx.es',
  };

  /**
   * Valida si un email tiene formato correcto
   * Retorna { isValid: boolean, error?: string }
   */
  static validateEmail(email: string): { isValid: boolean; error?: string } {
    if (!email) {
      return { isValid: false, error: 'El email está vacío' };
    }

    // Limpiar espacios
    email = email.trim();

    // Verificar espacios dentro del email
    if (email.includes(' ')) {
      return { isValid: false, error: 'El email contiene espacios' };
    }

    // Verificar doble @@
    if (email.includes('@@')) {
      return { isValid: false, error: 'El email contiene @@' };
    }

    // Verificar @ única
    const atCount = (email.match(/@/g) || []).length;
    if (atCount !== 1) {
      return { isValid: false, error: `El email debe tener exactamente un @, tiene ${atCount}` };
    }

    const [localPart, domain] = email.split('@');

    // Validar parte local (antes del @)
    if (!localPart || localPart.length === 0) {
      return { isValid: false, error: 'La parte local del email está vacía' };
    }

    if (localPart.length > 64) {
      return { isValid: false, error: 'La parte local del email es muy larga (máx 64 caracteres)' };
    }

    // Validar dominio
    if (!domain || domain.length === 0) {
      return { isValid: false, error: 'El dominio del email está vacío' };
    }

    // Verificar que el dominio tenga al menos un punto y una extensión
    if (!domain.includes('.')) {
      return { isValid: false, error: 'El dominio no tiene extensión TLD (ej: .com, .co)' };
    }

    const parts = domain.split('.');
    if (parts.some(part => part.length === 0)) {
      return { isValid: false, error: 'El dominio tiene puntos consecutivos o termina con punto' };
    }

    // Verificar que la extensión TLD tenga al menos 2 caracteres
    const tld = parts[parts.length - 1];
    if (tld.length < 2) {
      return { isValid: false, error: 'La extensión TLD es muy corta' };
    }

    // Expresión regular más estricta para validar caracteres permitidos
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'El formato del email no es válido' };
    }

    return { isValid: true };
  }

  /**
   * Limpia y valida un email
   * Intenta corregir errores comunes y devuelve el email limpio
   */
  static cleanAndValidateEmail(email: string): {
    success: boolean;
    email?: string;
    error?: string;
  } {
    if (!email) {
      return { success: false, error: 'El email está vacío o con valor "no informa"' };
    }

    // Caso especial: "no informa"
    if (email.toLowerCase().trim() === 'no informa') {
      return { success: false, error: 'El email no fue informado' };
    }

    // Limpiar espacios en blanco
    let cleanedEmail = email.trim();

    // Remover espacios alrededor del @
    cleanedEmail = cleanedEmail.replace(/\s*@\s*/, '@');

    // Remover espacios adicionales
    cleanedEmail = cleanedEmail.replace(/\s+/g, '');

    // Convertir a minúsculas
    cleanedEmail = cleanedEmail.toLowerCase();

    // Intentar corregir doble @@
    if (cleanedEmail.includes('@@')) {
      cleanedEmail = cleanedEmail.replace(/@@+/g, '@');
    }

    // Intentar corregir errores de tipeo en dominios comunes
    for (const [typo, correct] of Object.entries(EmailValidator.COMMON_TYPOS)) {
      if (cleanedEmail.endsWith('@' + typo)) {
        cleanedEmail = cleanedEmail.replace('@' + typo, '@' + correct);
      }
    }

    // Validar el email limpio
    const validation = EmailValidator.validateEmail(cleanedEmail);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    return { success: true, email: cleanedEmail };
  }

  /**
   * Procesa un array de emails y devuelve:
   * - emails válidos
   * - emails rechazados con razón
   */
  static validateMultipleEmails(emails: any[]): {
    valid: Array<{ email: string; original: string }>;
    invalid: Array<{ email: string; error: string }>;
  } {
    const valid: Array<{ email: string; original: string }> = [];
    const invalid: Array<{ email: string; error: string }> = [];

    for (const email of emails) {
      const result = EmailValidator.cleanAndValidateEmail(email);
      if (result.success && result.email) {
        valid.push({ email: result.email, original: email });
      } else {
        invalid.push({ email, error: result.error || 'Error desconocido' });
      }
    }

    return { valid, invalid };
  }
}
