import * as path from "path";
import * as fs from "fs";

export default function bindTranslations() {
    // load adminpanel translations

    const moduleTranslationPath = path.resolve(__dirname, `../translations`)
    if (fs.existsSync(moduleTranslationPath)) {
        loadTranslations(path.resolve(moduleTranslationPath));
    }
}

function loadTranslations(translationsPath: string): void {
    try {
        let translationsDirectoryPath = path.resolve(translationsPath);
        let translations = fs.readdirSync(translationsDirectoryPath).filter(function (file) {
                return path.extname(file).toLowerCase() === ".json";
            });

        let localesList = sails.config.i18n.locales;
        for (let locale of localesList) {
            if (translations.includes(`${locale}.json`)) {
                try {
                    let jsonData = require(`${translationsDirectoryPath}/${locale}.json`);
                    sails.hooks.i18n.appendLocale(locale, jsonData);
                } catch (error) {
                    sails.log.error(`Load translations > Error when reading ${locale}.json: ${error}`);
                }
            } else {
                sails.log.debug(`Load translations > Cannot find ${locale} locale in translations directory`)
            }
        }
    } catch (e) {
        sails.log.error("Load translations > Error when loading translations", e)
    }
}