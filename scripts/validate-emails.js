#!/usr/bin/env node

/**
 * Script de validación de emails para carga de usuarios
 * 
 * Uso:
 *   node validate-emails.js <archivo-csv>
 *   node validate-emails.js emails.csv
 */

const fs = require('fs');
const path = require('path');

// Copiar la lógica del validador de emails
class EmailValidator {
  static COMMON_TYPOS = {
    'gmai.com': 'gmail.com',
    'gmial.com': 'gmail.com',
    'yaho.com': 'yahoo.com',
    'yaho.es': 'yahoo.es',
    'hotmial.com': 'hotmail.com',
    'outlok.com': 'outlook.com',
    'gmx.es': 'gmx.es',
  };

  static validateEmail(email) {
    if (!email) {
      return { isValid: false, error: 'El email está vacío' };
    }

    email = email.trim();

    if (email.includes(' ')) {
      return { isValid: false, error: 'El email contiene espacios' };
    }

    if (email.includes('@@')) {
      return { isValid: false, error: 'El email contiene @@' };
    }

    const atCount = (email.match(/@/g) || []).length;
    if (atCount !== 1) {
      return { isValid: false, error: `El email debe tener exactamente un @, tiene ${atCount}` };
    }

    const [localPart, domain] = email.split('@');

    if (!localPart || localPart.length === 0) {
      return { isValid: false, error: 'La parte local del email está vacía' };
    }

    if (localPart.length > 64) {
      return { isValid: false, error: 'La parte local del email es muy larga (máx 64 caracteres)' };
    }

    if (!domain || domain.length === 0) {
      return { isValid: false, error: 'El dominio del email está vacío' };
    }

    if (!domain.includes('.')) {
      return { isValid: false, error: 'El dominio no tiene extensión TLD (ej: .com, .co)' };
    }

    const parts = domain.split('.');
    if (parts.some(part => part.length === 0)) {
      return { isValid: false, error: 'El dominio tiene puntos consecutivos o termina con punto' };
    }

    const tld = parts[parts.length - 1];
    if (tld.length < 2) {
      return { isValid: false, error: 'La extensión TLD es muy corta' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'El formato del email no es válido' };
    }

    return { isValid: true };
  }

  static cleanAndValidateEmail(email) {
    if (!email) {
      return { success: false, error: 'El email está vacío o con valor "no informa"' };
    }

    if (email.toLowerCase().trim() === 'no informa') {
      return { success: false, error: 'El email no fue informado' };
    }

    let cleanedEmail = email.trim();
    cleanedEmail = cleanedEmail.replace(/\s*@\s*/, '@');
    cleanedEmail = cleanedEmail.replace(/\s+/g, '');
    cleanedEmail = cleanedEmail.toLowerCase();

    if (cleanedEmail.includes('@@')) {
      cleanedEmail = cleanedEmail.replace(/@@+/g, '@');
    }

    for (const [typo, correct] of Object.entries(EmailValidator.COMMON_TYPOS)) {
      if (cleanedEmail.endsWith('@' + typo)) {
        cleanedEmail = cleanedEmail.replace('@' + typo, '@' + correct);
      }
    }

    const validation = EmailValidator.validateEmail(cleanedEmail);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    return { success: true, email: cleanedEmail };
  }

  static validateMultipleEmails(emails) {
    const valid = [];
    const invalid = [];

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

// Función principal
function validateEmailsFromCSV(filePath) {
  try {
    // Leer archivo
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Archivo no encontrado: ${filePath}`);
      process.exit(1);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    // Extraer emails (asumir que están en columna 2, separados por `-`)
    const emails = lines
      .map((line, index) => {
        // Formato: "Fila X - email@domain.com"
        const parts = line.split('-');
        if (parts.length >= 2) {
          return parts[1].trim();
        }
        return null;
      })
      .filter(email => email !== null && email !== '');

    console.log('\n📊 VALIDACIÓN DE EMAILS');
    console.log('='.repeat(60));
    console.log(`Total de emails en el archivo: ${emails.length}\n`);

    // Validar
    const { valid, invalid } = EmailValidator.validateMultipleEmails(emails);

    // Mostrar resultados
    console.log(`✅ Emails válidos: ${valid.length}`);
    console.log(`❌ Emails inválidos: ${invalid.length}\n`);

    if (invalid.length > 0) {
      console.log('📋 EMAILS INVÁLIDOS:');
      console.log('-'.repeat(60));
      invalid.forEach((item, index) => {
        console.log(`${index + 1}. "${item.email}"`);
        console.log(`   Razón: ${item.error}\n`);
      });

      // Guardar reporte de emails inválidos
      const reportPath = filePath.replace(/\.[^.]+$/, '') + '-invalid-emails.txt';
      const report = invalid
        .map(item => `${item.email}\t${item.error}`)
        .join('\n');

      fs.writeFileSync(reportPath, report);
      console.log(`\n📄 Reporte guardado en: ${reportPath}`);
    }

    if (valid.length > 0) {
      console.log('✅ EMAILS VÁLIDOS QUE SERÁN ACEPTADOS:');
      console.log('-'.repeat(60));
      valid.slice(0, 10).forEach((item, index) => {
        if (item.original !== item.email) {
          console.log(`${index + 1}. "${item.original}" → "${item.email}"`);
        } else {
          console.log(`${index + 1}. "${item.email}"`);
        }
      });
      if (valid.length > 10) {
        console.log(`\n... y ${valid.length - 10} más\n`);
      }

      // Guardar emails válidos corregidos
      const correctedPath = filePath.replace(/\.[^.]+$/, '') + '-corrected.json';
      fs.writeFileSync(correctedPath, JSON.stringify({ emails: valid.map(v => v.email) }, null, 2));
      console.log(`📄 Emails corregidos guardados en: ${correctedPath}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📊 RESUMEN:`);
    console.log(`   Total: ${emails.length}`);
    console.log(`   Válidos: ${valid.length} (${((valid.length / emails.length) * 100).toFixed(1)}%)`);
    console.log(`   Inválidos: ${invalid.length} (${((invalid.length / emails.length) * 100).toFixed(1)}%)`);
    console.log('='.repeat(60) + '\n');

    // Crear archivo para carga automática
    if (valid.length > 0) {
      console.log('🚀 Próximos pasos:');
      console.log(`1. Revisa el archivo: ${correctedPath}`);
      console.log('2. Usa estos emails para tu carga de attendees');
      if (invalid.length > 0) {
        console.log('3. Corrige los emails inválidos manualmente');
      }
    }

  } catch (error) {
    console.error('❌ Error al procesar el archivo:', error.message);
    process.exit(1);
  }
}

// Validar argumentos
const filePath = process.argv[2];
if (!filePath) {
  console.log('Uso: node validate-emails.js <archivo-csv>');
  console.log('Ejemplo: node validate-emails.js emails.csv');
  process.exit(1);
}

validateEmailsFromCSV(filePath);
