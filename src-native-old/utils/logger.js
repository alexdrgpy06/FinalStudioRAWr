import { writeTextFile, exists, mkdir, BaseDirectory } from '@tauri-apps/plugin-fs';
import { appLogDir } from '@tauri-apps/api/path';

const LOG_FILE = 'cliobulk.log';

export const logger = {
  async log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}\n`;
    
    // Always log to console
    if (level === 'ERROR') {
      console.error(formattedMessage);
    } else if (level === 'WARN') {
      console.warn(formattedMessage);
    } else {
      console.log(formattedMessage);
    }

    // If running in Tauri, also write to file
    if (window.__TAURI__) {
      try {
        // In Tauri v2, append is an option in writeTextFile
        await writeTextFile(LOG_FILE, formattedMessage, { 
            baseDir: BaseDirectory.AppLog,
            append: true 
        });
      } catch (err) {
        // Fallback for directory creation if needed
        try {
            await writeTextFile(LOG_FILE, formattedMessage, { 
                baseDir: BaseDirectory.AppLog,
                createNew: true
            });
        } catch (innerErr) {
            console.error('Failed to write to log file:', err);
        }
      }
    }
  },

  info(message) {
    return this.log(message, 'INFO');
  },

  warn(message) {
    return this.log(message, 'WARN');
  },

  error(message) {
    return this.log(message, 'ERROR');
  }
};
