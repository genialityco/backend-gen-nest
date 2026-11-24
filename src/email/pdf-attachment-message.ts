import { randomUUID } from 'crypto';

const encodeBody = (body: string | Buffer) =>
  (Buffer.isBuffer(body) ? body : Buffer.from(body))
    .toString('base64')
    .replace(/.{76}(?=.)/g, '$&\r\n');

const encodeHeader = (value: string) => {
  // Divide por caracteres completos para respetar el límite de cada encoded-word.
  const words: string[] = [];
  let chunk = '';
  for (const char of value) {
    if (Buffer.byteLength(chunk + char) > 42) {
      words.push(chunk);
      chunk = '';
    }
    chunk += char;
  }
  if (chunk) words.push(chunk);
  return words
    .map((word) => `=?UTF-8?B?${Buffer.from(word).toString('base64')}?=`)
    .join('\r\n ');
};

export function pdfAttachmentMessage({
  from,
  fromName,
  to,
  replyTo,
  subject,
  html,
  text,
  pdf,
}: {
  from: string;
  fromName: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  pdf: Buffer;
}): Buffer {
  const mixed = randomUUID();
  const alternative = randomUUID();
  return Buffer.from(
    [
      `From: ${encodeHeader(fromName)} <${from}>`,
      `To: ${to}`,
      ...(replyTo ? [`Reply-To: ${replyTo}`] : []),
      `Subject: ${encodeHeader(subject)}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${mixed}"`,
      '',
      `--${mixed}`,
      `Content-Type: multipart/alternative; boundary="${alternative}"`,
      '',
      `--${alternative}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      encodeBody(text),
      `--${alternative}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      encodeBody(html),
      `--${alternative}--`,
      `--${mixed}`,
      'Content-Type: application/pdf; name="Certificado.pdf"',
      'Content-Disposition: attachment; filename="Certificado.pdf"',
      'Content-Transfer-Encoding: base64',
      '',
      encodeBody(pdf),
      `--${mixed}--`,
      '',
    ].join('\r\n'),
  );
}
