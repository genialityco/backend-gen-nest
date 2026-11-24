// Plantilla editable del correo que avisa a un asistente que su certificado
// está listo. El correo se arma con bloques (estructura) que el admin edita
// desde la interfaz; el HTML final se genera aquí para que la vista previa y el
// envío real sean idénticos.

export type EmailAlign = 'left' | 'center' | 'right';

export type EmailBlock =
  | {
      id: string;
      type: 'heading';
      text: string;
      align?: EmailAlign;
      color?: string;
      size?: number;
    }
  | {
      id: string;
      type: 'text';
      text: string;
      align?: EmailAlign;
      color?: string;
      size?: number;
    }
  | {
      id: string;
      type: 'image';
      url: string;
      width?: number;
      align?: EmailAlign;
      alt?: string;
    }
  | {
      id: string;
      type: 'button';
      text: string;
      align?: EmailAlign;
      color?: string;
      textColor?: string;
    }
  | { id: string; type: 'divider'; color?: string }
  | { id: string; type: 'spacer'; height?: number }
  | { id: string; type: 'html'; html: string };

export interface CertificateEmailSettings {
  // Si está apagado no se envía nada (ni automático ni masivo)
  enabled: boolean;
  // Enviar automáticamente al crear el certificado (inscribir al asistente)
  autoSend: boolean;
  subject: string;
  preheader: string;
  fromName: string;
  replyTo: string;
  backgroundColor: string;
  contentBackgroundColor: string;
  fontFamily: string;
  blocks: EmailBlock[];
  // Origen de la landing de descarga (ej. https://gen-certificados.netlify.app)
  linkBaseUrl: string;
}

export const EMAIL_VARIABLES = [
  { key: 'fullName', label: 'Nombre completo' },
  { key: 'firstName', label: 'Primer nombre' },
  { key: 'eventName', label: 'Nombre del evento' },
  { key: 'email', label: 'Correo' },
  { key: 'link', label: 'Enlace de descarga' },
];

const BLOCK_TYPES = [
  'heading',
  'text',
  'image',
  'button',
  'divider',
  'spacer',
  'html',
];
const ALIGNS: EmailAlign[] = ['left', 'center', 'right'];
const MAX_BLOCKS = 40;

export const DEFAULT_LINK_BASE_URL =
  process.env.CERTIFICATES_APP_URL || 'https://gen-certificados.netlify.app';

export const defaultEmailSettings = (): CertificateEmailSettings => ({
  enabled: false,
  autoSend: true,
  subject: 'Tu certificado de {{eventName}} está listo',
  preheader: 'Descárgalo desde el enlace de este correo',
  fromName: '',
  replyTo: '',
  backgroundColor: '#f7fafd',
  contentBackgroundColor: '#ffffff',
  fontFamily: 'Arial, Helvetica, sans-serif',
  linkBaseUrl: DEFAULT_LINK_BASE_URL,
  blocks: [
    {
      id: 'title',
      type: 'heading',
      text: '¡Hola, {{firstName}}!',
      align: 'center',
      color: '#1f2d3d',
      size: 26,
    },
    {
      id: 'body',
      type: 'text',
      text: 'Tu certificado de participación en {{eventName}} ya está disponible.\nHaz clic en el botón para verlo y descargarlo.',
      align: 'center',
      color: '#3d4b5c',
      size: 16,
    },
    {
      id: 'cta',
      type: 'button',
      text: 'Descargar certificado',
      align: 'center',
      color: '#4d93d0',
      textColor: '#ffffff',
    },
    { id: 'gap', type: 'spacer', height: 16 },
    { id: 'line', type: 'divider', color: '#e3ecf5' },
    {
      id: 'footer',
      type: 'text',
      text: 'Si el botón no funciona copia este enlace en tu navegador:\n{{link}}',
      align: 'center',
      color: '#6b7c8f',
      size: 12,
    },
  ],
});

// ---------------------------------------------------------------------------
// Saneamiento de lo que llega desde la interfaz
// ---------------------------------------------------------------------------

const str = (value: unknown, max = 5000) => String(value ?? '').slice(0, max);
const color = (value: unknown, fallback: string) =>
  /^#[0-9a-fA-F]{3,8}$/.test(String(value ?? '')) ? String(value) : fallback;
const num = (value: unknown, min: number, max: number, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
};
const align = (value: unknown): EmailAlign =>
  ALIGNS.includes(value as EmailAlign) ? (value as EmailAlign) : 'center';
const httpUrl = (value: unknown) => {
  const url = str(value, 2000).trim();
  return /^https?:\/\//i.test(url) ? url : '';
};

export function sanitizeEmailSettings(input: any): CertificateEmailSettings {
  const base = defaultEmailSettings();
  const raw = input && typeof input === 'object' ? input : {};

  const blocks: EmailBlock[] = (
    Array.isArray(raw.blocks) ? raw.blocks : base.blocks
  )
    .filter((b: any) => b && BLOCK_TYPES.includes(b.type))
    .slice(0, MAX_BLOCKS)
    .map((b: any, i: number): EmailBlock => {
      const id = str(b.id, 64) || `block-${i}`;
      switch (b.type) {
        case 'heading':
          return {
            id,
            type: 'heading',
            text: str(b.text, 500),
            align: align(b.align),
            color: color(b.color, '#1f2d3d'),
            size: num(b.size, 14, 48, 26),
          };
        case 'text':
          return {
            id,
            type: 'text',
            text: str(b.text),
            align: align(b.align),
            color: color(b.color, '#3d4b5c'),
            size: num(b.size, 10, 32, 16),
          };
        case 'image':
          return {
            id,
            type: 'image',
            url: httpUrl(b.url),
            width: num(b.width, 20, 600, 200),
            align: align(b.align),
            alt: str(b.alt, 200),
          };
        case 'button':
          return {
            id,
            type: 'button',
            text: str(b.text, 120) || 'Descargar certificado',
            align: align(b.align),
            color: color(b.color, '#4d93d0'),
            textColor: color(b.textColor, '#ffffff'),
          };
        case 'divider':
          return { id, type: 'divider', color: color(b.color, '#e3ecf5') };
        case 'spacer':
          return { id, type: 'spacer', height: num(b.height, 4, 120, 16) };
        default:
          return { id, type: 'html', html: str(b.html, 20000) };
      }
    });

  return {
    enabled: Boolean(raw.enabled ?? base.enabled),
    autoSend: Boolean(raw.autoSend ?? base.autoSend),
    subject: str(raw.subject ?? base.subject, 300).trim() || base.subject,
    preheader: str(raw.preheader ?? base.preheader, 300),
    fromName: str(raw.fromName ?? '', 120)
      .replace(/[<>"\r\n]/g, '')
      .trim(),
    replyTo: /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(str(raw.replyTo).trim())
      ? str(raw.replyTo).trim()
      : '',
    backgroundColor: color(raw.backgroundColor, base.backgroundColor),
    contentBackgroundColor: color(
      raw.contentBackgroundColor,
      base.contentBackgroundColor,
    ),
    fontFamily:
      str(raw.fontFamily ?? base.fontFamily, 200).replace(/[<>;{}"]/g, '') ||
      base.fontFamily,
    linkBaseUrl:
      httpUrl(raw.linkBaseUrl).replace(/\/+$/, '') || base.linkBaseUrl,
    blocks,
  };
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Reemplaza {{variable}}; las desconocidas quedan vacías
const fill = (
  template: string,
  vars: Record<string, string>,
  escape: boolean,
) =>
  template.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_, key) => {
    const value = String(vars[key] ?? '');
    return escape ? escapeHtml(value) : value;
  });

// Texto plano del admin -> HTML: escapa, reemplaza variables, saltos de línea
// y convierte el enlace de descarga en un <a>
const textToHtml = (
  text: string,
  vars: Record<string, string>,
  linkColor: string,
) => {
  const escaped = escapeHtml(text).replace(
    /\{\{\s*link\s*\}\}/g,
    '\u0000LINK\u0000',
  );
  const withVars = fill(escaped, vars, true).replace(/\n/g, '<br>');
  const link = escapeHtml(vars.link ?? '');
  return withVars.replace(
    /\u0000LINK\u0000/g,
    `<a href="${link}" style="color:${linkColor};word-break:break-all;">${link}</a>`,
  );
};

export function renderEmail(
  settings: CertificateEmailSettings,
  vars: Record<string, string>,
): { subject: string; html: string; text: string } {
  const font = settings.fontFamily;
  const accent =
    (
      settings.blocks.find((b) => b.type === 'button') as
        | { color?: string }
        | undefined
    )?.color ?? '#4d93d0';
  const link = escapeHtml(vars.link ?? '');

  const rows = settings.blocks
    .map((block) => {
      switch (block.type) {
        case 'heading':
          return `<tr><td style="padding:8px 32px;text-align:${block.align};"><h1 style="margin:0;font-family:${font};font-size:${block.size}px;line-height:1.3;color:${block.color};font-weight:700;">${textToHtml(block.text, vars, accent)}</h1></td></tr>`;
        case 'text':
          return `<tr><td style="padding:8px 32px;text-align:${block.align};font-family:${font};font-size:${block.size}px;line-height:1.6;color:${block.color};">${textToHtml(block.text, vars, accent)}</td></tr>`;
        case 'image':
          if (!block.url) return '';
          return `<tr><td style="padding:8px 32px;text-align:${block.align};"><img src="${escapeHtml(block.url)}" alt="${escapeHtml(fill(block.alt ?? '', vars, false))}" width="${block.width}" style="display:inline-block;max-width:100%;width:${block.width}px;height:auto;border:0;"></td></tr>`;
        case 'button':
          return `<tr><td style="padding:16px 32px;text-align:${block.align};"><a href="${link}" target="_blank" style="display:inline-block;padding:14px 28px;border-radius:8px;background:${block.color};color:${block.textColor};font-family:${font};font-size:16px;font-weight:700;text-decoration:none;">${escapeHtml(fill(block.text, vars, false))}</a></td></tr>`;
        case 'divider':
          return `<tr><td style="padding:12px 32px;"><div style="border-top:1px solid ${block.color};font-size:0;line-height:0;">&nbsp;</div></td></tr>`;
        case 'spacer':
          return `<tr><td style="height:${block.height}px;font-size:0;line-height:0;">&nbsp;</td></tr>`;
        case 'html':
          return `<tr><td style="padding:8px 32px;font-family:${font};">${fill(block.html, vars, true)}</td></tr>`;
        default:
          return '';
      }
    })
    .join('\n');

  const subject = fill(settings.subject, vars, false).replace(/[\r\n]+/g, ' ');
  const preheader = escapeHtml(fill(settings.preheader, vars, false));

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${settings.backgroundColor};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${settings.backgroundColor};">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${settings.contentBackgroundColor};border-radius:12px;">
<tr><td style="height:24px;font-size:0;line-height:0;">&nbsp;</td></tr>
${rows}
<tr><td style="height:24px;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  // Versión de texto plano para clientes sin HTML (y menos spam)
  const text = settings.blocks
    .map((block) => {
      if (block.type === 'heading' || block.type === 'text')
        return fill(block.text, vars, false);
      if (block.type === 'button')
        return `${fill(block.text, vars, false)}: ${vars.link ?? ''}`;
      return '';
    })
    .filter(Boolean)
    .join('\n\n');

  return { subject, html, text };
}
