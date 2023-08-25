import i18next from 'i18next';

import LanguageDetector from 'i18next-browser-languagedetector';

import locI18next from 'loc-i18next';

import en from './assets/locales/en/translation.json';
import ru from './assets/locales/ru/translation.json';
import uk from './assets/locales/uk/translation.json';

const selectLanguage = document.querySelector('.select-languages')

i18next
    .use(LanguageDetector).on('languageChanged', lang => {
        document.documentElement.lang = lang;
    })
    .init({
        lng: 'en',
        fallbackLng: ['en', 'ru', 'uk'],
        detection: {
            order: ['localStorage', 'htmlTag'],
            lookupLocalStorage: 'lang',
            lookupQuerystring: 'lang',
        },
        resources: {
            en: {
                translation: en,
            },
            ru: {
                translation: ru,
            },
            uk: {
                translation: uk,
            },
        },
    })
    .then(function() {
        updateContent();
    });


function updateContent() {
    const localize = locI18next.init(i18next, {
        useOptionsAttr: true,
    });
    localize('html');
}

function changeLng(evt) {
    const selectedLang = evt ? evt.target.value : 'en';
    i18next.changeLanguage(selectedLang).then(t => {
        updateContent();
    });
}

selectLanguage.addEventListener('click', changeLng);