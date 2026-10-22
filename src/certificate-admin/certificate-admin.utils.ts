// Utilidades de normalización compartidas por el módulo de certificados

// Datos base que viven en member.properties
export const MEMBER_BASE_KEYS = ['fullName', 'idNumber', 'email', 'phone'];

// Atributos del attendee que históricamente se guardan en la raíz del documento
// (las estadísticas y la app los leen de ahí)
export const ATTENDEE_ROOT_KEYS = ['typeAttendee', 'certificationHours'];

// Documentos de relleno que no sirven como contraseña
export const PLACEHOLDER_ID_NUMBERS = ['ACHOAPP', 'APPACHO', 'N/A', '#N/A'];

export const normalizeEmail = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toLowerCase();

// "1.102.378.057" y "1102378057" son el mismo documento
export const normalizeIdNumber = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .replace(/[.\s,-]/g, '');

export const isValidPasswordIdNumber = (idNumber: string): boolean =>
  idNumber.length >= 6 &&
  !PLACEHOLDER_ID_NUMBERS.includes(idNumber.toUpperCase());

export const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ACCENT_GROUPS: Record<string, string> = {
  a: 'aáàäâã',
  e: 'eéèëê',
  i: 'iíìïî',
  o: 'oóòöôõ',
  u: 'uúùüû',
  n: 'nñ',
  c: 'cç',
};

export const stripAccents = (value: string): string =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '');

// Regex que ignora tildes: "jose" encuentra "José"
export const accentInsensitivePattern = (token: string): string =>
  stripAccents(token.toLowerCase())
    .split('')
    .map((char) =>
      ACCENT_GROUPS[char] ? `[${ACCENT_GROUPS[char]}]` : escapeRegex(char),
    )
    .join('');

export const maskEmail = (email: string): string => {
  const [user, domain] = String(email || '').split('@');
  if (!domain) return '';
  const visible = user.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(user.length - 2, 1))}@${domain}`;
};

export const maskIdNumber = (idNumber: string): string => {
  const value = String(idNumber || '');
  if (value.length <= 4) return value;
  return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
};

export const isEmpty = (value: unknown): boolean =>
  value === undefined || value === null || String(value).trim() === '';
